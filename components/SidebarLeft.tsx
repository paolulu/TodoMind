import React, { useState } from 'react';
import { MindNode, TaskStatus } from '../types';
import { Calendar, Star, LayoutList, Flame, Eye, EyeOff, AlertCircle, CalendarClock, HelpCircle, FileText, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { APP_VERSION } from '../version';
import { HelpModal } from './HelpModal';
import { ChangelogModal } from './ChangelogModal';

interface SidebarLeftProps {
  root: MindNode;
  selectedId: string | null;
  baseFilter: 'all' | 'today' | 'overdue' | 'planned' | TaskStatus;
  priorityFilters: Set<'important' | 'urgent' | 'both'>;
  onSelect: (id: string) => void;
  onSetBaseFilter: (filter: 'all' | 'today' | 'overdue' | 'planned' | TaskStatus) => void;
  onTogglePriorityFilter: (priority: 'important' | 'urgent' | 'both') => void;
  hideUnmatched: boolean;
  onToggleHideUnmatched: () => void;
  onOpenQuickInputSettings?: () => void;
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
  onToggleHideUnmatched,
  onOpenQuickInputSettings
}) => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);

  const baseFilters: { id: 'all' | 'today' | 'overdue' | 'planned' | TaskStatus; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'all', label: '全部', icon: <LayoutList size={16} />, shortcut: '0' },
    { id: 'today', label: '今日', icon: <Calendar size={16} />, shortcut: '1' },
    { id: 'overdue', label: '已到期', icon: <AlertCircle size={16} className="text-orange-600" />, shortcut: '2' },
    { id: 'planned', label: '计划中', icon: <CalendarClock size={16} className="text-blue-600" />, shortcut: '3' },
  ];

  const priorityFilterButtons: { id: 'important' | 'urgent' | 'both'; label: string; icon: React.ReactNode; shortcut: string }[] = [
    { id: 'important', label: '重要', icon: <Star size={16} className="text-yellow-600" />, shortcut: 'Z' },
    { id: 'urgent', label: '紧急', icon: <Flame size={16} className="text-red-600" />, shortcut: 'J' },
    { id: 'both', label: '重要且紧急', icon: <span className="flex gap-0.5"><Star size={14} className="text-yellow-600" /><Flame size={14} className="text-red-600" /></span>, shortcut: 'Q' },
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
            <span className="flex-1 text-left">{f.label}</span>
            <span className="text-xs opacity-50 font-mono">({f.shortcut})</span>
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
            <span className="flex-1 text-left">{f.label}</span>
            <span className="text-xs opacity-50 font-mono">({f.shortcut})</span>
            {priorityFilters.has(f.id) && (
              <span className="text-indigo-600 text-xs">✓</span>
            )}
          </button>
        ))}
      </div>

      {/* Outline - Collapsible */}
      <div className="mt-2 border-t border-slate-100">
        <button
          onClick={() => setIsOutlineExpanded(!isOutlineExpanded)}
          className="w-full flex items-center justify-between px-5 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-50 transition-colors"
        >
          <span>大纲</span>
          {isOutlineExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {isOutlineExpanded && (
          <div className="flex-1 overflow-y-auto max-h-64 pb-4">
            <OutlineNode node={root} selectedId={selectedId} onSelect={onSelect} depth={0} />
          </div>
        )}
      </div>

      {/* Spacer to push footer to bottom */}
      <div className="flex-1"></div>

      {/* Footer with Help and Version */}
      <div className="p-3 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-white"
              title="使用说明"
            >
              <HelpCircle size={14} />
              <span>帮助</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setShowChangelogModal(true)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-white"
              title="版本更新日志"
            >
              <FileText size={14} />
              <span>{APP_VERSION}</span>
            </button>
          </div>
          {onOpenQuickInputSettings && (
            <button
              onClick={onOpenQuickInputSettings}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded hover:bg-white"
              title="快速输入设置"
            >
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      <ChangelogModal isOpen={showChangelogModal} onClose={() => setShowChangelogModal(false)} />
    </div>
  );
};