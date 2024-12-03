import React from 'react';
import { ArrowLeft, Edit2, FileText, Save, FolderOpen } from 'lucide-react';
import { Client } from '../../types/client';
import { addContract } from '../../lib/firebase';
import { numberToWords } from '../../utils/numberToWords';

interface ClientHeaderProps {
  client: Client;
  onBack: () => void;
  onSave: () => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  loading?: boolean;
  handleSave: () => Promise<void>;
  onFilesClick: () => void;
}

export const ClientHeader: React.FC<ClientHeaderProps> = ({
  client,
  onBack,
  isEditing,
  setIsEditing,
  loading = false,
  handleSave,
  onFilesClick
}) => {
  const handleCreateContract = async () => {
    try {
      const contractData = {
        clientId: client.id,
        clientNumber: client.clientNumber,
        clientName: client.firstName,
        clientLastName: client.lastName,
        contractNumber: client.clientNumber,
        contractType: 'Договор подряда на строительство дома',
        createdAt: new Date(),
        totalAmount: client.totalAmount,
        content: JSON.stringify({
          ...client,
          totalAmountWords: numberToWords(client.totalAmount),
          depositWords: numberToWords(client.deposit),
          firstPaymentWords: numberToWords(client.firstPayment),
          secondPaymentWords: numberToWords(client.secondPayment),
          thirdPaymentWords: numberToWords(client.thirdPayment),
          fourthPaymentWords: numberToWords(client.fourthPayment)
        }),
        firstName: client.firstName,
        lastName: client.lastName,
        middleName: client.middleName,
        iin: client.iin,
        constructionAddress: client.constructionAddress,
        livingAddress: client.livingAddress,
        phone: client.phone,
        email: client.email,
        constructionDays: client.constructionDays,
        deposit: client.deposit,
        firstPayment: client.firstPayment,
        secondPayment: client.secondPayment,
        thirdPayment: client.thirdPayment,
        fourthPayment: client.fourthPayment
      };

      await addContract(contractData);
      alert('Договор успешно создан');
    } catch (error) {
      console.error('Error creating contract:', error);
      alert('Ошибка при создании договора');
    }
  };

  return (
    <div className="bg-white border-b">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-4">
          <div className="flex items-center">
            <button onClick={onBack} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">
              {client.lastName} {client.firstName}
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            {!isEditing ? (
              <>
                <button
                  onClick={onFilesClick}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  <FolderOpen className="w-5 h-5 mr-1" />
                  Файлы
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center justify-center px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors text-sm"
                >
                  <Edit2 className="w-5 h-5 mr-1" />
                  Редактировать
                </button>
                <button
                  onClick={handleCreateContract}
                  className="inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  <FileText className="w-5 h-5 mr-1" />
                  Создать договор
                </button>
              </>
            ) : (
              <button
                onClick={handleSave}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors text-sm w-full sm:w-auto"
              >
                <Save className="w-5 h-5 mr-1" />
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};