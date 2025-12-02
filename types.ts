export enum TaskStatus {
  IDEA = 'idea',
  TODO = 'todo',
  IN_PROGRESS = 'in-progress',
  TRACKING = 'tracking',
  DONE = 'done',
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
}

export interface FileData {
  root: MindNode;
  lastSaved: number;
}

export type FilterType = 'all' | 'today' | 'overdue' | 'important' | 'urgent' | TaskStatus;

export interface FilterState {
  baseFilter: 'all' | 'today' | 'overdue' | TaskStatus;  // 基础筛选（互斥）
  priorityFilters: Set<'important' | 'urgent'>;  // 优先级筛选（可多选）
}
