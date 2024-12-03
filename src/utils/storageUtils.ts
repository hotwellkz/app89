import { ref, getDownloadURL, deleteObject, StorageError, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { showErrorNotification, showSuccessNotification } from './notifications';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    // Проверяем размер файла (макс. 50MB)
    if (file.size > 50 * 1024 * 1024) {
      showErrorNotification('Файл слишком большой (максимум 50MB)');
      throw new Error('File too large');
    }

    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type,
    };

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      let uploadTimeout: NodeJS.Timeout | null = null;

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload progress:', Math.round(progress));
          
          // Сбрасываем таймер при каждом прогрессе
          if (uploadTimeout) {
            clearTimeout(uploadTimeout);
          }
          
          // Устанавливаем новый таймер
          uploadTimeout = setTimeout(() => {
            uploadTask.cancel();
            reject(new Error('Upload timeout'));
          }, 30000); // 30 секунд таймаут
        },
        (error) => {
          console.error('Upload error:', error);
          showErrorNotification('Ошибка при загрузке файла');
          reject(error);
        },
        async () => {
          try {
            if (uploadTimeout) {
              clearTimeout(uploadTimeout);
            }
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            showSuccessNotification('Файл успешно загружен');
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            showErrorNotification('Ошибка при получении ссылки на файл');
            reject(error);
          }
        }
      );
      
      // Очистка таймера при отмене загрузки
      return () => {
        if (uploadTimeout) {
          clearTimeout(uploadTimeout);
        }
        uploadTask.cancel();
      };
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

export const uploadImage = async (file: File, path: string): Promise<string> => {
  // Проверяем тип файла
  if (!file.type.startsWith('image/')) {
    showErrorNotification('Можно загружать только изображения');
    throw new Error('Invalid file type');
  }
  
  return uploadFile(file, path);
};

export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    showSuccessNotification('Файл успешно удален');
  } catch (error) {
    console.error('Error deleting file:', error);
    showErrorNotification('Ошибка при удалении файла');
    throw error;
  }
};

export const getFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};