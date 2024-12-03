import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ReceiptData } from '../types/receipt';

export const useReceiptCalculation = (clientId: string) => {
  const [data, setData] = useState<ReceiptData>({
    operationalExpense: 1300000,
    sipWalls: 0,
    ceilingInsulation: 0,
    generalExpense: 0,
    contractPrice: 0,
    totalExpense: 0,
    netProfit: 0
  });

  // Подписка на транзакции проекта
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    
    const fetchProjectCategory = async () => {
      try {
        // Сначала получаем имя клиента
        const clientDoc = await getDoc(doc(db, 'clients', clientId));
        if (!clientDoc.exists()) return;
        
        const clientData = clientDoc.data();
        const projectName = `${clientData.lastName} ${clientData.firstName}`;
        
        // Находим категорию проекта
        const categoryQuery = query(
          collection(db, 'categories'),
          where('title', '==', projectName),
          where('row', '==', 3)
        );
        
        const categorySnapshot = await getDocs(categoryQuery);
        if (!categorySnapshot.empty) {
          const categoryId = categorySnapshot.docs[0].id;
          
          // Подписываемся на транзакции категории
          const transactionsQuery = query(
            collection(db, 'transactions'),
            where('categoryId', '==', categoryId)
          );
          
          unsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
            const totalAmount = snapshot.docs.reduce((sum, doc) => {
              const transaction = doc.data();
              // Учитываем все транзакции, независимо от знака
              return sum + Math.abs(transaction.amount);
            }, 0);
            
            setData(prev => {
              const totalExpense = prev.operationalExpense + prev.sipWalls + 
                prev.ceilingInsulation + totalAmount;
              
              return {
                ...prev,
                generalExpense: totalAmount,
                totalExpense,
                netProfit: prev.contractPrice - totalExpense
              };
            });
          });
        }
      } catch (error) {
        console.error('Error fetching project category:', error);
      }
    };
    
    fetchProjectCategory();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [clientId]);

  // Подписка на сметы
  useEffect(() => {
    const sipWallsUnsubscribe = onSnapshot(
      doc(db, 'sipWallsEstimates', clientId),
      (doc) => {
        if (doc.exists()) {
          const sipData = doc.data();
          const sip28Total = sipData.items.find((item: any) => 
            item.name === 'СИП панели 163 мм высота 2,8м нарощенные пр-ва HotWell.kz'
          )?.total || 0;
          const sip25Total = sipData.items.find((item: any) => 
            item.name === 'СИП панели 163 мм высота 2,5м пр-ва HotWell.kz'
          )?.total || 0;
          
          setData(prev => ({
            ...prev,
            sipWalls: sip28Total + sip25Total
          }));
        }
      }
    );

    const roofUnsubscribe = onSnapshot(
      doc(db, 'roofEstimates', clientId),
      (doc) => {
        if (doc.exists()) {
          const roofData = doc.data();
          const polystyreneTotal = roofData.items.find((item: any) =>
            item.name === 'Пенополистирол Толщ 150мм (Для Утепления пот. 2-го эт)'
          )?.total || 0;
          
          setData(prev => ({
            ...prev,
            ceilingInsulation: polystyreneTotal
          }));
        }
      }
    );

    const estimateUnsubscribe = onSnapshot(
      doc(db, 'estimates', clientId),
      (doc) => {
        if (doc.exists()) {
          const estimateData = doc.data();
          const contractPrice = estimateData.roofValues?.contractPrice?.value || 0;
          
          setData(prev => {
            const totalExpense = prev.operationalExpense + prev.sipWalls + 
              prev.ceilingInsulation + prev.generalExpense;
            
            return {
              ...prev,
              contractPrice,
              totalExpense,
              netProfit: contractPrice - totalExpense
            };
          });
        }
      }
    );

    return () => {
      sipWallsUnsubscribe();
      roofUnsubscribe();
      estimateUnsubscribe();
    };
  }, [clientId]);

  return data;
};