// IndexedDB helper for persisting FileSystemFileHandle
const DB_NAME = 'TodoMindDB';
const DB_VERSION = 1;
const STORE_NAME = 'fileHandles';

interface DBEntry {
  id: string;
  handle: FileSystemFileHandle;
  fileName: string;
  lastAccessed: number;
}

// Open or create the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Save file handle to IndexedDB
export const saveFileHandle = async (handle: FileSystemFileHandle): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const entry: DBEntry = {
      id: 'currentFile',
      handle,
      fileName: handle.name,
      lastAccessed: Date.now(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    console.log('File handle saved to IndexedDB:', handle.name);
  } catch (err) {
    console.error('Failed to save file handle to IndexedDB:', err);
    throw err;
  }
};

// Load file handle from IndexedDB
export const loadFileHandle = async (): Promise<FileSystemFileHandle | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const entry = await new Promise<DBEntry | undefined>((resolve, reject) => {
      const request = store.get('currentFile');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!entry) {
      console.log('No file handle found in IndexedDB');
      return null;
    }

    // Verify the handle is still valid by requesting permission
    const handle = entry.handle;

    // Try to verify write access by checking permission
    try {
      // @ts-ignore - File System Access API
      const permission = await handle.queryPermission({ mode: 'readwrite' });

      if (permission === 'granted') {
        console.log('File handle loaded from IndexedDB with existing permission:', entry.fileName);
        return handle;
      }

      // If not granted, request permission
      // @ts-ignore - File System Access API
      const newPermission = await handle.requestPermission({ mode: 'readwrite' });
      if (newPermission === 'granted') {
        console.log('File handle loaded from IndexedDB with new permission:', entry.fileName);
        return handle;
      }

      console.log('File handle permission denied');
      return null;
    } catch (err) {
      // If permission API fails, try to use the handle anyway
      // Some browsers might not support queryPermission/requestPermission
      console.log('Permission API not available, returning handle anyway:', entry.fileName);
      return handle;
    }
  } catch (err) {
    console.error('Failed to load file handle from IndexedDB:', err);
    return null;
  }
};

// Clear file handle from IndexedDB
export const clearFileHandle = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete('currentFile');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    console.log('File handle cleared from IndexedDB');
  } catch (err) {
    console.error('Failed to clear file handle from IndexedDB:', err);
  }
};

// Get file name from IndexedDB (without loading the full handle)
export const getFileName = async (): Promise<string | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const entry = await new Promise<DBEntry | undefined>((resolve, reject) => {
      const request = store.get('currentFile');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    return entry ? entry.fileName : null;
  } catch (err) {
    console.error('Failed to get file name from IndexedDB:', err);
    return null;
  }
};
