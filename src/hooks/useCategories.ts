import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Building2, Car, Globe, Hammer, Home, Package, User, Wallet } from 'lucide-react';
import { CategoryCardType } from '../types';
import React from 'react';

const iconMap: { [key: string]: React.ElementType } = {
  Car,
  User,
  Building2,
  Wallet,
  Home,
  Hammer,
  Globe,
  Package
};

export const useCategories = () => {
  const [categories, setCategories] = useState<CategoryCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(collection(db, 'categories'));
      let initialLoad = true;

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const processChanges = (changes: any[]) => {
            const updates = new Map();
            
            changes.forEach(change => {
              const data = change.doc.data();
              const IconComponent = iconMap[data.icon] || Home;
              
              if (change.type === 'removed') {
                updates.set(change.doc.id, null);
              } else {
                updates.set(change.doc.id, {
                  id: change.doc.id,
                  title: data.title,
                  amount: data.amount,
                  icon: React.createElement(IconComponent, { 
                    size: 24,
                    className: "text-white"
                  }),
                  iconName: data.icon,
                  color: data.color || 'bg-emerald-500',
                  row: parseInt(data.row) || 1,
                  isVisible: data.isVisible !== undefined ? data.isVisible : true
                });
              }
            });
            
            return updates;
          };

          setCategories(prev => {
            const updates = processChanges(snapshot.docChanges());
            const newCategories = [...prev];

            updates.forEach((value, key) => {
              const index = newCategories.findIndex(cat => cat.id === key);
              if (value === null && index !== -1) {
                newCategories.splice(index, 1);
              } else if (value) {
                if (index === -1) {
                  newCategories.push(value);
                } else {
                  newCategories[index] = value;
                }
              }
            });

            return newCategories.sort((a, b) => (a.row || 0) - (b.row || 0));
          });
          
          setLoading(false);
        },
        (error) => {
          console.error('Categories subscription error:', error);
          setError('Ошибка получения данных');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error in useCategories:', error);
      setError('Ошибка при инициализации подписки');
      setLoading(false);
      return () => {};
    }
  }, []);

  return { categories, loading, error };
};