import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { doc, updateDoc, writeBatch, getDocs, query, where, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ClientContextMenu } from '../components/ClientContextMenu';
import { Client, NewClient, initialClientState } from '../types/client';
import { ClientList } from '../components/clients/ClientList';
import { ClientModal } from '../components/clients/ClientModal';
import { ClientPage } from './ClientPage';
import { DeleteClientModal } from '../components/modals/DeleteClientModal';
import { subscribeToClients } from '../services/clientService';
import { showErrorNotification } from '../utils/notifications';
import { PageContainer } from '../components/layout/PageContainer';
import { ClientSearchBar } from '../components/clients/ClientSearchBar';
import { TransactionHistory } from '../components/transactions/TransactionHistory';
import { CategoryCardType } from '../types';
import { deleteClientWithHistory, deleteClientIconOnly } from '../utils/clientDeletion';

export const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<NewClient>(initialClientState);
  const [showClientPage, setShowClientPage] = useState(false);
  const [status, setStatus] = useState<'building' | 'deposit' | 'built' | 'all'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryCardType | null>(null);
  const [showProjectHistory, setShowProjectHistory] = useState(false);
  const [selectedProjectCategory, setSelectedProjectCategory] = useState<CategoryCardType | null>(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

  useEffect(() => {
    const unsubscribe = subscribeToClients(
      (allClients) => {
        setClients(allClients);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching clients:', error);
        setLoading(false);
      },
      {
        year: selectedYear,
        status: status === 'all' ? undefined : status
      }
    );

    return () => unsubscribe();
  }, [selectedYear, status]);

  const handleContextMenu = (e: React.MouseEvent, client: Client) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setSelectedClient(client);
    setShowContextMenu(true);
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientPage(true);
  };

  const handleViewHistory = async (client: Client) => {
    try {
      const categoriesQuery = query(
        collection(db, 'categories'), 
        where('title', '==', client.lastName + ' ' + client.firstName),
        where('row', '==', 1)
      );
      
      const snapshot = await getDocs(categoriesQuery);
      if (snapshot.empty) {
        showErrorNotification('История операций недоступна');
        return;
      }
      
        const categoryDoc = snapshot.docs[0];
        const categoryData = categoryDoc.data();
        setSelectedCategory({
          id: categoryDoc.id,
          title: categoryData.title || '',
          amount: categoryData.amount || '0 ₸',
          iconName: categoryData.icon || 'User',
          color: categoryData.color || 'bg-gray-500',
          row: 1
        });
        setShowHistory(true);
    } catch (error) {
      showErrorNotification('Не удалось загрузить историю транзакций');
    }
  };

  const handleViewProjectHistory = async (client: Client) => {
    try {
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('title', '==', client.lastName + ' ' + client.firstName),
        where('row', '==', 3)
      );
      
      const snapshot = await getDocs(categoriesQuery);
      if (!snapshot.empty) {
        const categoryDoc = snapshot.docs[0];
        const categoryData = categoryDoc.data();
        setSelectedProjectCategory({
          id: categoryDoc.id,
          title: categoryData.title || '',
          amount: categoryData.amount || '0 ₸',
          iconName: categoryData.icon || 'Building2',
          color: categoryData.color || 'bg-blue-500',
          row: 3
        });
        setShowProjectHistory(true);
      } else {
        showErrorNotification('История операций проекта недоступна');
      }
    } catch (error) {
      showErrorNotification('Не удалось загрузить историю операций проекта');
    }
  };

  const handleEdit = () => {
    if (selectedClient) {
      setEditingClient({
        ...selectedClient
      });
      setShowEditModal(true);
      setShowContextMenu(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setShowDeleteModal(true);
    setShowContextMenu(false);
  };

  const handleDeleteWithHistory = async () => {
    if (!selectedClient) return;
    
    try {
      await deleteClientWithHistory(selectedClient);
      setShowDeleteModal(false);
      setSelectedClient(null);
      showErrorNotification('Клиент успешно удален');
    } catch (error) {
      console.error('Error deleting client with history:', error);
      showErrorNotification('Ошибка при удалении клиента');
    }
  };

  const handleDeleteIconOnly = async () => {
    if (!selectedClient) return;
    
    try {
      await deleteClientIconOnly(selectedClient);
      setShowDeleteModal(false);
      setSelectedClient(null);
      showErrorNotification('Клиент успешно удален');
    } catch (error) {
      console.error('Error deleting client:', error);
      showErrorNotification('Ошибка при удалении клиента');
    }
  };

  const handleToggleVisibility = async (client: Client) => {
    try {
      if (!client.id) {
        showErrorNotification('ID клиента не найден');
        return;
      }

      // Сохраняем текущее значение видимости
      const newVisibility = !client.isIconsVisible;
      
      // Показываем уведомление о текущем состоянии
      showErrorNotification(
        newVisibility 
          ? 'Иконки клиента теперь видны'
          : 'Иконки клиента скрыты'
      );

      // Обновляем локальное состояние оптимистично
      setClients(prevClients => 
        prevClients.map(c => 
          c.id === client.id ? { ...c, isIconsVisible: newVisibility } : c
        )
      );

      const clientRef = doc(db, 'clients', client.id);

      const batch = writeBatch(db);
      
      // Добавляем обновление клиента в batch
      batch.update(clientRef, {
        isIconsVisible: newVisibility,
        updatedAt: serverTimestamp()
      });

      const [projectsQuery, clientsQuery] = [
        query(
          collection(db, 'categories'),
          where('title', '==', `${client.lastName} ${client.firstName}`),
          where('row', '==', 3)
        ),
        query(
          collection(db, 'categories'),
          where('title', '==', `${client.lastName} ${client.firstName}`),
          where('row', '==', 1)
        )
      ];
      
      const [projectsSnapshot, clientsSnapshot] = await Promise.all([
        getDocs(projectsQuery),
        getDocs(clientsQuery)
      ]);

      const categoryDocs = [...projectsSnapshot.docs, ...clientsSnapshot.docs];
      
      if (categoryDocs.length === 0) {
        console.warn('Категории клиента не найдены');
      }
      
      categoryDocs.forEach(doc => {
        batch.update(doc.ref, { 
          isVisible: newVisibility, // Обновляем видимость категории
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();

    } catch (error) {
      console.error('Error toggling visibility:', error);
      showErrorNotification('Ошибка при изменении видимости иконок');
      
      // В случае ошибки откатываем состояние и показываем уведомление
      setClients(prevClients => {
        showErrorNotification('Не удалось изменить видимость иконок, состояние восстановлено');
        return prevClients.map(c => {
          if (c.id === client.id) {
            return { ...c, isIconsVisible: client.isIconsVisible };
          }
          return c;
        });
      });
    }
  };

  const handleClientSaved = () => {
    setShowAddModal(false);
    setShowEditModal(false);
  };

  const filteredClients = clients.filter(client => {
    const searchString = searchQuery.toLowerCase();
    return (
      client.lastName.toLowerCase().includes(searchString) ||
      client.firstName.toLowerCase().includes(searchString) ||
      client.clientNumber.toLowerCase().includes(searchString) ||
      client.constructionAddress.toLowerCase().includes(searchString) ||
      (client.objectName && client.objectName.toLowerCase().includes(searchString))
    );
  });

  if (showClientPage && selectedClient) {
    return (
      <ClientPage
        client={selectedClient}
        onBack={() => setShowClientPage(false)}
        onSave={handleClientSaved}
      />
    );
  }

  return (
    <PageContainer>
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 py-4">
            <div className="flex items-center">
              <button onClick={() => window.history.back()} className="mr-4">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <h1 className="text-2xl font-semibold text-gray-900">Клиенты</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-10 w-[48%] sm:w-auto"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'building' | 'deposit' | 'built' | 'all')}
                className="rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm h-10 w-[48%] sm:w-auto"
              >
                <option value="all">Все</option>
                <option value="building">Строим</option>
                <option value="deposit">Задаток</option>
                <option value="built">Построено</option>
              </select>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors w-full sm:w-auto justify-center h-10"
              >
                <Plus className="w-5 h-5 mr-1" />
                Добавить клиента
              </button>
            </div>
          </div>
          
          <div className="py-2 sm:py-4 overflow-x-hidden">
            <ClientSearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <ClientList
            clients={filteredClients}
            onContextMenu={handleContextMenu}
            onClientClick={handleClientClick}
            onToggleVisibility={handleToggleVisibility}
            onViewHistory={handleViewHistory}
            onViewProjectHistory={handleViewProjectHistory}
            status={status}
          />
        )}
      </div>

      {showContextMenu && selectedClient && (
        <ClientContextMenu
          position={contextMenuPosition}
          onClose={() => setShowContextMenu(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStatusChange={async (newStatus) => {
            if (!selectedClient) return;

            try {
              const clientRef = doc(db, 'clients', selectedClient.id);
              await updateDoc(clientRef, { status: newStatus });
              setShowContextMenu(false);
            } catch (error) {
              console.error('Error updating client status:', error);
              showErrorNotification('Ошибка при изменении статуса клиента');
            }
          }}
          clientName={`${selectedClient.lastName} ${selectedClient.firstName}`}
          currentStatus={selectedClient.status}
        />
      )}

      {(showAddModal || showEditModal) && (
        <ClientModal
          isOpen={showAddModal || showEditModal}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
          }}
          client={showEditModal ? editingClient : initialClientState}
          isEditMode={showEditModal}
          yearOptions={yearOptions}
          onSave={handleClientSaved}
        />
      )}

      {showDeleteModal && selectedClient && (
        <DeleteClientModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onDeleteWithHistory={handleDeleteWithHistory}
          onDeleteIconOnly={handleDeleteIconOnly}
          clientName={`${selectedClient.lastName} ${selectedClient.firstName}`}
        />
      )}

      {showHistory && selectedCategory && (
        <TransactionHistory
          category={selectedCategory}
          isOpen={showHistory}
          onClose={() => {
            setShowHistory(false);
            setSelectedCategory(null);
          }}
        />
      )}
      
      {showProjectHistory && selectedProjectCategory && (
        <TransactionHistory
          category={selectedProjectCategory}
          isOpen={showProjectHistory}
          onClose={() => {
            setShowProjectHistory(false);
            setSelectedProjectCategory(null);
          }}
        />
      )}
    </PageContainer>
  );
};