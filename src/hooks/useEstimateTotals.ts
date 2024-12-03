import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useEstimateTotals = (clientId: string) => {
  const [totals, setTotals] = useState({
    additionalWorks: 0,
    consumables: 0,
    partitions: 0,
    roof: 0,
    floor: 0,
    sipWalls: 0,
    foundation: 0
  });
  const [salaryTotal, setSalaryTotal] = useState(0);

  useEffect(() => {
    // Подписка на все сметы
    const subscriptions = [
      { name: 'additionalWorks', collection: 'additionalWorksEstimates' },
      { name: 'consumables', collection: 'consumablesEstimates' },
      { name: 'partitions', collection: 'partitionEstimates' },
      { name: 'roof', collection: 'roofEstimates' },
      { name: 'floor', collection: 'floorEstimates' },
      { name: 'sipWalls', collection: 'sipWallsEstimates' },
      { name: 'foundation', collection: 'foundationEstimates' }
    ];

    const unsubscribes = subscriptions.map(({ name, collection: collectionName }) => {
      return onSnapshot(
        doc(db, collectionName, clientId),
        (doc) => {
          if (doc.exists()) {
            setTotals(prev => ({
              ...prev,
              [name]: doc.data().totalCost || 0
            }));
          }
        }
      );
    });

    // Получаем связанную категорию проекта
    const fetchProjectCategory = async () => {
      try {
        const clientDoc = await getDocs(query(
          collection(db, 'clients'),
          where('id', '==', clientId)
        ));

        if (!clientDoc.empty) {
          const clientData = clientDoc.docs[0].data();
          const projectName = `${clientData.lastName} ${clientData.firstName}`;

          // Находим категорию проекта
          const categorySnapshot = await getDocs(query(
            collection(db, 'categories'),
            where('title', '==', projectName),
            where('row', '==', 3)
          ));

          if (!categorySnapshot.empty) {
            const categoryId = categorySnapshot.docs[0].id;

            // Подписываемся на транзакции этой категории
            const transactionsUnsubscribe = onSnapshot(
              query(
                collection(db, 'transactions'),
                where('categoryId', '==', categoryId)
              ),
              (snapshot) => {
                const salarySum = snapshot.docs.reduce((sum, doc) => {
                  const data = doc.data();
                  return data.isSalary ? sum + Math.abs(data.amount) : sum;
                }, 0);
                setSalaryTotal(salarySum);
              }
            );

            unsubscribes.push(transactionsUnsubscribe);
          }
        }
      } catch (error) {
        console.error('Error fetching project category:', error);
      }
    };

    fetchProjectCategory();

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [clientId]);

  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);

  return { totals, grandTotal, salaryTotal };
};