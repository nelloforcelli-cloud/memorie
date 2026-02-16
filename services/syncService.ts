
import { Task, ShoppingItem, QuickItem, Contact } from "../types";

// Utilizziamo un servizio KV pubblico per la demo. In produzione si userebbe un backend dedicato.
const BASE_URL = "https://kvdb.io/AnF7H9xW6p2E8k9L4m1Q/"; // Bucket ID univoco per l'app

interface SyncPayload {
  tasks: Task[];
  shoppingList: ShoppingItem[];
  quickItems: QuickItem[];
  contacts: Contact[];
  lastUpdated: number;
}

export const pushToCloud = async (key: string, data: SyncPayload): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_URL}${key}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (error) {
    console.error("Errore Push Cloud:", error);
    return false;
  }
};

export const pullFromCloud = async (key: string): Promise<SyncPayload | null> => {
  try {
    const response = await fetch(`${BASE_URL}${key}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Errore Pull Cloud:", error);
    return null;
  }
};

export const generateSyncKey = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
