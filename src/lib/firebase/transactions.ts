import { collection, doc, runTransaction, serverTimestamp, query, where, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { db } from './config';
import { CategoryCardType } from '../../types';
import { formatAmount, parseAmount } from './categories';

export const transferFunds = async (
  sourceCategory: CategoryCardType,
  targetCategory: CategoryCardType,
  amount: number,
  description: string,
  photos: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: Date;
    path: string;
  }> = [],
  isSalary?: boolean
): Promise<void> => {
  if (!amount || amount <= 0) {
    throw new Error('Сумма перевода должна быть больше нуля');
  }

  if (!description.trim()) {
    throw new Error('Необходимо указать комментарий к переводу');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const sourceRef = doc(db, 'categories', sourceCategory.id);
      const targetRef = doc(db, 'categories', targetCategory.id);
      
      const sourceDoc = await transaction.get(sourceRef);
      const targetDoc = await transaction.get(targetRef);

      if (!sourceDoc.exists()) {
        throw new Error('Категория отправителя не найдена');
      }

      if (!targetDoc.exists()) {
        throw new Error('Категория получателя не найдена');
      }

      const sourceBalance = parseAmount(sourceDoc.data().amount);
      const targetBalance = parseAmount(targetDoc.data().amount);

      // Создаем ID для транзакции заранее
      const withdrawalId = doc(collection(db, 'transactions')).id;
      const depositId = doc(collection(db, 'transactions')).id;

      const timestamp = serverTimestamp();
      
      const transactionData: any = {
        categoryId: sourceCategory.id,
        fromUser: sourceCategory.title,
        toUser: targetCategory.title,
        amount: -amount,
        description,
        type: 'expense',
        date: timestamp,
        relatedTransactionId: withdrawalId,
        photos: photos
      };
      
      // Добавляем поле isSalary только если оно определено
      if (isSalary !== undefined) {
        transactionData.isSalary = isSalary;
      }
      
      transaction.set(doc(db, 'transactions', withdrawalId), transactionData);

      const depositData = {
        categoryId: targetCategory.id,
        fromUser: sourceCategory.title,
        toUser: targetCategory.title,
        amount: amount,
        description,
        type: 'income',
        date: timestamp,
        relatedTransactionId: withdrawalId,
        photos: photos
      };
      
      // Добавляем поле isSalary только если оно определено
      if (isSalary !== undefined) {
        depositData.isSalary = isSalary;
      }
      
      transaction.set(doc(db, 'transactions', depositId), depositData);

      transaction.update(sourceRef, {
        amount: formatAmount(sourceBalance - amount),
        updatedAt: timestamp
      });

      transaction.update(targetRef, {
        amount: formatAmount(targetBalance + amount),
        updatedAt: timestamp
      });
    });
  } catch (error) {
    console.error('Error transferring funds:', error);
    throw error;
  }
};

export const deleteTransaction = async (transactionId: string): Promise<void> => {
  if (!transactionId) {
    throw new Error('Transaction ID is required');
  }

  try {
    const batch = writeBatch(db);
    const transactionRef = doc(db, 'transactions', transactionId);
    const transactionSnap = await getDoc(transactionRef);

    if (!transactionSnap.exists()) {
      throw new Error('Transaction not found');
    }

    const transactionData = transactionSnap.data();
    const relatedTransactionId = transactionData.relatedTransactionId;

    batch.delete(transactionRef);

    // Find and handle the related transaction
    let relatedTransactionData;
    if (relatedTransactionId) {
      const relatedTransactionsQuery = query(
        collection(db, 'transactions'),
        where('relatedTransactionId', '==', relatedTransactionId)
      );

      const relatedTransactionsSnapshot = await getDocs(relatedTransactionsQuery);
      relatedTransactionsSnapshot.docs.forEach(doc => {
        if (doc.id !== transactionId) {
          relatedTransactionData = doc.data();
          batch.delete(doc.ref);
        }
      });
    }

    // Update source category balance
    const sourceCategoryRef = doc(db, 'categories', transactionData.categoryId);
    const sourceCategorySnap = await getDoc(sourceCategoryRef);

    if (sourceCategorySnap.exists()) {
      const currentAmount = parseAmount(sourceCategorySnap.data().amount);
      const newAmount = transactionData.type === 'expense'
        ? currentAmount + Math.abs(transactionData.amount)
        : currentAmount - transactionData.amount;

      batch.update(sourceCategoryRef, {
        amount: formatAmount(newAmount),
        updatedAt: serverTimestamp()
      });
    }

    // Update target category balance if related transaction exists
    if (relatedTransactionData && relatedTransactionData.categoryId) {
      const targetCategoryRef = doc(db, 'categories', relatedTransactionData.categoryId);
      const targetCategorySnap = await getDoc(targetCategoryRef);

      if (targetCategorySnap.exists()) {
        const currentAmount = parseAmount(targetCategorySnap.data().amount);
        const newAmount = relatedTransactionData.type === 'expense'
          ? currentAmount + Math.abs(relatedTransactionData.amount)
          : currentAmount - relatedTransactionData.amount;

        batch.update(targetCategoryRef, {
          amount: formatAmount(newAmount),
          updatedAt: serverTimestamp()
        });
      }
    }

    await batch.commit();
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw new Error('Failed to delete transaction');
  }
};