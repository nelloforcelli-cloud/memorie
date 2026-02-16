
export type Category = 'personale' | 'familiare';
export type Priority = 'alta' | 'media' | 'bassa';

export interface Task {
  id: string;
  title: string;
  deadline: string; // ISO string
  category: Category;
  priority: Priority;
  completed: boolean;
  createdAt: string;
}

export interface TaskExtractionResult {
  title: string;
  deadline: string | null;
  category: Category;
  priority: Priority;
}

export interface ShoppingItem {
  id: string;
  name: string;
  icon?: string;
  image?: string;
}

export interface QuickItem {
  id: string;
  name: string;
  icon?: string;
  image?: string;
  color?: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
}
