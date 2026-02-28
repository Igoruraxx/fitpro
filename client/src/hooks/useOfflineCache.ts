import { useEffect, useState, useCallback } from 'react';

const DB_NAME = 'fitpro-offline';
const DB_VERSION = 1;

interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt?: number;
}

let db: IDBDatabase | null = null;

const initDB = async (): Promise<IDBDatabase> => {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains('cache')) {
        database.createObjectStore('cache', { keyPath: 'key' });
      }
    };
  });
};

export const useOfflineCache = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const set = useCallback(async <T>(key: string, data: T, expiresInMs?: number) => {
    try {
      const database = await initDB();
      const transaction = database.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      const entry: CacheEntry<T> = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: expiresInMs ? Date.now() + expiresInMs : undefined,
      };

      store.put(entry);

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }, []);

  const get = useCallback(async <T>(key: string): Promise<T | null> => {
    try {
      const database = await initDB();
      const transaction = database.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');

      return new Promise((resolve) => {
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined;

          if (!entry) {
            resolve(null);
            return;
          }

          // Check if expired
          if (entry.expiresAt && entry.expiresAt < Date.now()) {
            // Delete expired entry
            const deleteTransaction = database.transaction(['cache'], 'readwrite');
            deleteTransaction.objectStore('cache').delete(key);
            resolve(null);
            return;
          }

          resolve(entry.data);
        };

        request.onerror = () => resolve(null);
      });
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }, []);

  const remove = useCallback(async (key: string) => {
    try {
      const database = await initDB();
      const transaction = database.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      store.delete(key);

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to remove cached data:', error);
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      const database = await initDB();
      const transaction = database.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');

      store.clear();

      return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, []);

  return {
    isOnline,
    set,
    get,
    remove,
    clear,
  };
};
