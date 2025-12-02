import React from 'react';
import { MindNode, TaskStatus } from '../types';
import { Calendar, Star, LayoutList, Flame, Eye, EyeOff } from 'lucide-react';

interface SidebarLeftProps {
  root: MindNode;
  selectedId: string | null;
  baseFilter: 'all' | 'today' | TaskStatus;
  priorityFilters: Set<'important' | 'urgent'>;
  onSelect: (id: string) => void;
  onSetBaseFilter: (filter: 'all' | 'today' | TaskStatus) => void;
  onTogglePriorityFilter: (priority: 'important' | 'urgent') => void;
  hideUnmatched: boolean;
  onToggleHideUnmatched: () => void;
}

const OutlineNode: React.FC<{ node: MindNode; selectedId: string | null; onSelect: (id: string) => void; depth: number }> = ({ node, selectedId, onSelect, depth }) => {
  const isSelected = selectedId === node.id;
  
  return (
    <div>
      <div 
        className={`
          flex items-center py-1 px-2 cursor-pointer text-sm rounded
          ${isSelected ? 'bg-indigo-100 text-indigo-700 font-medium' : 'hover:bg-slate-100 text-slate-700'}
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        <div className={`w-2 h-2 rounded-full mr-2 ${node.children.length ? 'bg-slate-400' : 'bg-slate-200'}`}></div>
        <span className="truncate">{node.text || 'Untitled'}</span>
      </div>
      {node.children.map(child => (
        <OutlineNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
};

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  root,
  selectedId,
  baseFilter,
  priorityFilters,
  onSelect,
  onSetBaseFilter,
  onTogglePriorityFilter,
  hideUnmatched,
  onToggleHideUnmatched
}) => {
  const baseFilters: { id: 'all' | 'today' | TaskStatus; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: '全部', icon: <LayoutList size={16} /> },
    { id: 'today', label: '今日', icon: <Calendar size={16} /> },
  ];

  const priorityFilterButtons: { id: 'important' | 'urgent'; label: string; icon: React.ReactNode }[] = [
    { id: 'important', label: '重要', icon: <Star size={16} className="text-yellow-600" /> },
    { id: 'urgent', label: '紧急', icon: <Flame size={16} className="text-red-600" /> },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-20">
      <div className="p-4 border-b border-slate-100">
        <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
           🧠 TodoMind
        </h1>
        <p className="text-xs text-slate-500 mt-1">思维导图式待办管理</p>
      </div>

      {/* Base Filters */}
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">筛选</p>
          {(baseFilter !== 'all' || priorityFilters.size > 0) && (
            <button
              onClick={onToggleHideUnmatched}
              className={`p-1 rounded transition-colors ${hideUnmatched ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
              title={hideUnmatched ? '显示所有节点' : '仅显示筛选结果'}
            >
              {hideUnmatched ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
        {baseFilters.map(f => (
          <button
            key={f.id}
            onClick={() => onSetBaseFilter(f.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
              ${baseFilter === f.id ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'}
            `}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      {/* Priority Filters - Multi-Select */}
      <div className="p-2 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">优先级（可多选）</p>
        {priorityFilterButtons.map(f => (
          <button
            key={f.id}
            onClick={() => onTogglePriorityFilter(f.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
              ${priorityFilters.has(f.id) ? 'bg-indigo-50 text-indigo-700 font-medium border-2 border-indigo-200' : 'text-slate-600 hover:bg-slate-50 border-2 border-transparent'}
            `}
          >
            {f.icon}
            {f.label}
            {priorityFilters.has(f.id) && (
              <span className="ml-auto text-indigo-600 text-xs">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Outline */}
      <div className="flex-1 overflow-y-auto mt-2">
        <p className="px-5 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0 bg-white">大纲</p>
        <div className="pb-4">
           <OutlineNode node={root} selectedId={selectedId} onSelect={onSelect} depth={0} />
        </div>
      </div>
    </div>
  );
};