import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PetugasDB extends DBSchema {
  syncQueue: {
    key: string;
    value: {
      id: string;
      endpoint: string;
      payload: any;
      method: string;
      timestamp: number;
    };
  };
  cachedSchemas: {
    key: string;
    value: {
      id: string;
      schema: any;
      updatedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<PetugasDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<PetugasDB>('petugas-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cachedSchemas')) {
          db.createObjectStore('cachedSchemas', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const enqueueSyncTask = async (endpoint: string, method: string, payload: any) => {
  const db = await initDB();
  const id = crypto.randomUUID();
  await db.put('syncQueue', {
    id,
    endpoint,
    method,
    payload,
    timestamp: Date.now(),
  });
  
  // Try to sync immediately if online
  if (navigator.onLine) {
    await processSyncQueue();
  }
};

export const processSyncQueue = async () => {
  const db = await initDB();
  const tasks = await db.getAll('syncQueue');
  
  if (tasks.length === 0) return;

  for (const task of tasks) {
    try {
      const response = await fetch(task.endpoint, {
        method: task.method,
        headers: {
          'Content-Type': 'application/json',
          // Authorization token would be injected here
        },
        body: JSON.stringify(task.payload),
      });

      if (response.ok) {
        await db.delete('syncQueue', task.id);
      }
    } catch (error) {
      console.warn('Sync failed for task', task.id, error);
      // Will retry on next sync
    }
  }
};

// Listen for online events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('App is online. Processing sync queue...');
    processSyncQueue();
  });
}
