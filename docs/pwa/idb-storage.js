// ==========================================
// IndexedDB Storage Layer
// Drop-in async replacement for localStorage for large data
// ==========================================
const idbStore = (function() {
  const DB_NAME = 'dh-emr-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'keyval';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('[idb-storage] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
    });
    return dbPromise;
  }

  function withStore(mode, callback) {
    return openDB().then((db) => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const result = callback(store);
        tx.oncomplete = () => resolve(result._value);
        tx.onerror = () => reject(tx.error);
        // For get operations, resolve with the request result
        if (result._request) {
          result._request.onsuccess = () => {
            result._value = result._request.result;
          };
        }
      });
    });
  }

  return {
    getItem: function(key) {
      return openDB().then((db) => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result !== undefined ? request.result : null);
          request.onerror = () => reject(request.error);
        });
      }).catch((err) => {
        console.warn('[idb-storage] getItem failed, falling back to localStorage:', err);
        try {
          return localStorage.getItem(key);
        } catch(e) { return null; }
      });
    },

    setItem: function(key, value) {
      return openDB().then((db) => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }).catch((err) => {
        console.warn('[idb-storage] setItem failed, falling back to localStorage:', err);
        try {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        } catch(e) { /* quota exceeded */ }
      });
    },

    removeItem: function(key) {
      return openDB().then((db) => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }).catch((err) => {
        console.warn('[idb-storage] removeItem failed:', err);
      });
    },

    getAllKeys: function() {
      return openDB().then((db) => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          // Use getAllKeys if available, otherwise iterate
          if (store.getAllKeys) {
            const request = store.getAllKeys();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          } else {
            const keys = [];
            const request = store.openCursor();
            request.onsuccess = (event) => {
              const cursor = event.target.result;
              if (cursor) {
                keys.push(cursor.key);
                cursor.continue();
              } else {
                resolve(keys);
              }
            };
            request.onerror = () => reject(request.error);
          }
        });
      }).catch((err) => {
        console.warn('[idb-storage] getAllKeys failed:', err);
        return [];
      });
    },

    // Migrate data from localStorage to IndexedDB (one-time)
    migrateFromLocalStorage: function(prefix) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      if (keys.length === 0) return Promise.resolve(0);

      return openDB().then((db) => {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          let migrated = 0;
          keys.forEach((key) => {
            try {
              const val = localStorage.getItem(key);
              const parsed = JSON.parse(val);
              store.put(parsed, key);
              migrated++;
            } catch(e) {
              // Skip unparseable items
            }
          });
          tx.oncomplete = () => {
            console.log(`[idb-storage] Migrated ${migrated} items from localStorage`);
            resolve(migrated);
          };
          tx.onerror = () => reject(tx.error);
        });
      });
    }
  };
})();
