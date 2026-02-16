
import { QuickItem, ShoppingItem } from "../types";

const DB_NAME = "ForcelliDB_v2";
const QUICK_STORE = "quickItems";
const SHOPPING_STORE = "shoppingList";
const DB_VERSION = 2;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUICK_STORE)) {
        db.createObjectStore(QUICK_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SHOPPING_STORE)) {
        db.createObjectStore(SHOPPING_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveQuickItemsToDB = async (items: QuickItem[]) => {
  // Rimuoviamo il controllo length === 0 per permettere lo svuotamento se necessario
  const db = await initDB();
  const tx = db.transaction(QUICK_STORE, "readwrite");
  const store = tx.objectStore(QUICK_STORE);
  
  // Pulizia preventiva per evitare dati orfani o conflitti di versioning
  store.clear();
  for (const item of items) {
    store.put(item);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => {
      console.error("Errore salvataggio QuickItems:", tx.error);
      reject(tx.error);
    };
  });
};

export const getQuickItemsFromDB = async (): Promise<QuickItem[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUICK_STORE, "readonly");
    const store = tx.objectStore(QUICK_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveShoppingListToDB = async (items: ShoppingItem[]) => {
  const db = await initDB();
  const tx = db.transaction(SHOPPING_STORE, "readwrite");
  const store = tx.objectStore(SHOPPING_STORE);
  
  store.clear();
  for (const item of items) {
    store.put(item);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
};

export const getShoppingListFromDB = async (): Promise<ShoppingItem[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SHOPPING_STORE, "readonly");
    const store = tx.objectStore(SHOPPING_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
