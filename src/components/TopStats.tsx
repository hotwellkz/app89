import React, { useState } from 'react';
import { collection, getDocs, writeBatch, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ScrollText, Receipt } from 'lucide-react';
import { db } from '../lib/firebase';
import { ContextMenu } from './ContextMenu'; 
import { showErrorNotification } from '../utils/notifications';

interface TopStatsProps {
  stats: Array<{ label: string; value: string; }>;
  onPageChange: (page: 'feed' | 'daily-report') => void;
}

const formatValue = (value: string): string => {
  // Удаляем все пробелы, точки и знаки валюты
  const cleanValue = value.replace(/[\s\.,₸]/g, '');
  const numValue = parseFloat(cleanValue);
  
  if (isNaN(numValue)) return '0 ₸';
  
  let formattedValue;
  if (numValue >= 1000000) {
    // Для миллионов используем формат 121.1M
    formattedValue = (Math.floor(numValue / 100000) / 10).toFixed(1) + 'M';
  } else if (numValue >= 1000) {
    // Для тысяч используем формат 232k
    formattedValue = Math.floor(numValue / 1000) + 'k';
  } else {
    formattedValue = numValue.toString();
  }
  
  return formattedValue + ' ₸';
};

export const TopStats: React.FC<TopStatsProps> = ({ stats, onPageChange }) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const CORRECT_PASSWORD = '1888';

  const handleContextMenu = (e: React.MouseEvent, label: string) => {
    if (label === 'Баланс') {
      e.preventDefault();
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      setSelectedStat(label);
      setShowContextMenu(true);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === CORRECT_PASSWORD) {
      setShowPasswordPrompt(false);
      setPassword('');
      await resetBalances();
    } else {
      showErrorNotification('Неверный пароль');
      setPassword('');
    }
  };

  const handleResetBalance = () => {
    setShowContextMenu(false);
    setShowPasswordPrompt(true);
  };

  const resetBalances = async () => {
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      
      // Обнуляем балансы всех категорий
      const categoriesSnapshot = await getDocs(collection(db, 'categories'));
      categoriesSnapshot.docs.forEach((docRef) => {
        batch.update(doc(db, 'categories', docRef.id), {
          amount: '0 ₸'
        });
      });

      // Удаляем все транзакции
      const transactionsSnapshot = await getDocs(collection(db, 'transactions'));
      const deletePromises = transactionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Обнуляем общий доход
      const statsRef = doc(db, 'stats', 'dashboard');
      await setDoc(statsRef, {
        totalIncome: 0,
        updatedAt: new Date()
      }, { merge: true });

      await batch.commit();
      setShowContextMenu(false);
      
      showErrorNotification('История транзакций успешно очищена');
    } catch (error) {
      console.error('Error resetting data:', error);
      showErrorNotification('Ошибка при обнулении данных');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return <div className="flex justify-center items-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div></div>;
  }

  return (
    <>
      <div className="flex items-center justify-between py-2 px-4 relative lg:px-8 min-h-[64px]">
        <div className="lg:hidden w-10" /> {/* Spacer for burger menu */}
        <div className="flex items-center justify-center space-x-4 sm:space-x-8 flex-1 lg:justify-start">
          {stats.slice(0, 2).map((stat, index) => (
            <div 
              key={index} 
              className="cursor-default"
              onContextMenu={(e) => handleContextMenu(e, stat.label)} 
            >
              <div className="text-[11px] sm:text-sm text-gray-500 font-normal text-center">{stat.label}</div>
              <div className="text-xs sm:text-base font-medium text-gray-900 whitespace-nowrap text-center">
                {formatValue(stat.value)}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => onPageChange('feed')}
            className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
            title="Лента"
          >
            <ScrollText className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => onPageChange('daily-report')}
            className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
            title="Отчет по дням"
          >
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {showContextMenu && (
        <ContextMenu
          position={contextMenuPosition}
          onClose={() => setShowContextMenu(false)}
          onEdit={handleResetBalance}
          onDelete={() => {}}
          title={selectedStat || ''}
          editLabel="Очистить историю транзакций"
          hideDelete={true}
        />
      )}

      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Введите пароль</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 mb-4"
                placeholder="Введите пароль"
                autoFocus
              />
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordPrompt(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >Отмена</button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >Подтвердить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};