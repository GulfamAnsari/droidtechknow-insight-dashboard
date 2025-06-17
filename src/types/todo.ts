export interface TodoList {
  id: string;
  name: string;
  color?: string;
  isDefault?: boolean;
}

export type Priority = 'low' | 'medium' | 'high';

export interface TodoItem {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  important: boolean;
  dueDate?: Date | null;
  reminderDate?: Date | null;
  listId: string;
  createdAt: Date;
  updatedAt: Date;
  steps?: TodoStep[];
  recurrence?: TodoRecurrence;
  files?: TodoFile[];
  tags?: string[];
  priority?: Priority;
  description?: string;
}

export interface TodoStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export type TodoRecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface TodoRecurrence {
  type: TodoRecurrenceType;
  interval: number;
  endDate?: Date | null;
  daysOfWeek?: number[]; // 0-6, for Sunday-Saturday
}

export interface TodoFilter {
  completed?: boolean;
  important?: boolean;
  dueDate?: 'today' | 'tomorrow' | 'upcoming' | 'all';
  searchTerm?: string;
}
