export async function withStore<T>(dbName: string, storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDB(dbName, storeName)
  try {
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    const result = await fn(store)
    await tx.complete?.()
    return result
  } finally {
    db.close()
  }
}

export function openDB(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function idbGet<T = unknown>(key: string, dbName = 'budget-cache', storeName = 'kv'): Promise<T | undefined> {
  return withStore(dbName, storeName, 'readonly', (store) => new Promise((resolve, reject) => {
    const r = store.get(key)
    r.onsuccess = () => resolve(r.result as T | undefined)
    r.onerror = () => reject(r.error)
  }))
}

export async function idbSet<T = unknown>(key: string, value: T, dbName = 'budget-cache', storeName = 'kv'): Promise<void> {
  return withStore(dbName, storeName, 'readwrite', (store) => new Promise((resolve, reject) => {
    const r = store.put(value as any, key)
    r.onsuccess = () => resolve()
    r.onerror = () => reject(r.error)
  }))
}

