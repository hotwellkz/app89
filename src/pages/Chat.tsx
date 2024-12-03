import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { clearChatHistory } from '../utils/chatUtils';
import { showErrorNotification, showSuccessNotification } from '../utils/notifications';

export const Chat: React.FC = () => {
  const [clearing, setClearing] = useState(false);

  const handleClearHistory = async () => {
    if (!window.confirm('Вы уверены, что хотите очистить историю чата?')) {
      return;
    }

    setClearing(true);
    try {
      await clearChatHistory();
      showSuccessNotification('История чата успешно очищена');
    } catch (error) {
      showErrorNotification('Ошибка при очистке истории чата');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-semibold text-gray-900">Чат</h1>
            <button
              onClick={handleClearHistory}
              disabled={clearing}
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-gray-400"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              {clearing ? 'Очистка...' : 'Очистить историю'}
            </button>
          </div>
        </div>
      </div>

      {/* Rest of chat implementation */}
    </div>
  );
};