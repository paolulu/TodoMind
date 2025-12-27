export enum TaskStatus {
  IDEA = 'idea',
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  TRACKING = 'tracking',
  DONE = 'done',
}

export interface NodeHistoryItem {
  timestamp: number;
  field: string;
  oldValue?: string;
  newValue?: string;
}

export interface MindNode {
  id: string;
  text: string;
  status: TaskStatus;
  isImportant: boolean;
  isUrgent: boolean;
  dueDate?: string; // ISO Date string YYYY-MM-DD
  note?: string;
  children: MindNode[];
  isExpanded: boolean;
  createdAt: number;
  updatedAt?: number;
  history?: NodeHistoryItem[];
}

export interface FileData {
  root: MindNode;
  lastSaved: number;
}

export type FilterType = 'all' | 'today' | 'overdue' | 'planned' | 'important' | 'urgent' | TaskStatus;

export interface FilterState {
  baseFilter: 'all' | 'today' | 'overdue' | 'planned' | TaskStatus;  // 基础筛选（互斥）
  priorityFilters: Set<'important' | 'urgent' | 'both'>;  // 优先级筛选（可多选，both=重要且紧急）
}
