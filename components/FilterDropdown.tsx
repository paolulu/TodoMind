import React, { useState, useRef, useEffect } from 'react';
import { MindNode, TaskStatus } from '../types';
import { ChevronDown, Check, Calendar, Star, LayoutList, Flame, AlertCircle, CalendarClock, HelpCircle, FileText, Settings, Eye, EyeOff, Filter } from 'lucide-react';
import { APP_VERSION } from '../version';
import { HelpModal } from './HelpModal';
import { ChangelogModal } from './ChangelogModal';

interface FilterDropdownProps {
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

const FILTER_OPTIONS = [
  { id: 'all', label: '全部', icon: <LayoutList size={14} />, shortcut: '0' },
  { id: 'today', label: '今日', icon: <Calendar size={14} />, shortcut: '1' },
  { id: 'overdue', label: '到期', icon: <AlertCircle size={14} className="text-orange-600" />, shortcut: '2' },
  { id: 'planned', label: '计划', icon: <CalendarClock size={14} className="text-blue-600" />, shortcut: '3' },
] as const;

const PRIORITY_OPTIONS = [
  { id: 'important', label: '重要', icon: <Star size={14} className="text-yellow-600" />, shortcut: 'Z' },
  { id: 'urgent', label: '紧急', icon: <Flame size={14} className="text-red-600" />, shortcut: 'J' },
  { id: 'both', label: '重要且紧急', icon: <span className="flex gap-0.5"><Star size={12} className="text-yellow-600" /><Flame size={12} className="text-red-600" /></span>, shortcut: 'Q' },
] as const;

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  root,
  selectedId,
  baseFilter,
  priorityFilters,
  onSelect,
  onSetBaseFilter,
  onTogglePriorityFilter,
  hideUnmatched,
  onToggleHideUnmatched,
  onOpenQuickInputSettings,
}) => {
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownWidth, setDropdownWidth] = useState<number>(0);

  const currentLabel = FILTER_OPTIONS.find(f => f.id === baseFilter)?.label || '全部';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Filter Panel - Always visible, drawer-like */}
        <div className="bg-white/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/60 transition-all duration-300 w-52">
          {/* Header with Toggle */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100/50 bg-white/30">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg flex-shrink-0">🧠</span>
              <span className={`${isExpanded ? 'font-bold' : 'font-medium text-sm'} text-slate-800 flex-shrink-0`}>
                TodoMind
              </span>
              <span className="text-sm text-slate-500 flex-shrink-0">·</span>
              <span className="text-sm font-medium text-slate-700 truncate">{currentLabel}</span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded hover:bg-slate-100 transition-colors flex-shrink-0"
              title={isExpanded ? '收起' : '展开'}
            >
              <ChevronDown
                size={16}
                className={`text-slate-500 transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>
          </div>

          {/* Filter Content - Collapsible */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {/* Base Filters */}
            <div className="px-2 py-2">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">筛选</p>
                {(baseFilter !== 'all' || priorityFilters.size > 0) && (
                  <button
                    onClick={onToggleHideUnmatched}
                    className={`p-1 rounded transition-colors ${hideUnmatched ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
                    title={hideUnmatched ? '显示所有节点' : '仅显示筛选结果'}
                  >
                    {hideUnmatched ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                )}
              </div>
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    onSetBaseFilter(option.id);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                    baseFilter === option.id
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option.icon}
                  <span className="flex-1 text-left">{option.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{option.shortcut}</span>
                  {baseFilter === option.id && <Check size={14} className="ml-1" />}
                </button>
              ))}
            </div>

            {/* Priority Filters */}
            <div className="px-2 py-2 border-t border-slate-100/50">
              <p className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">优先级（可多选）</p>
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onTogglePriorityFilter(option.id)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                    priorityFilters.has(option.id)
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option.icon}
                  <span className="flex-1 text-left">{option.label}</span>
                  <span className="text-xs text-slate-400 font-mono">{option.shortcut}</span>
                  {priorityFilters.has(option.id) && <span className="text-indigo-600 text-xs ml-1">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      <ChangelogModal isOpen={showChangelogModal} onClose={() => setShowChangelogModal(false)} />
    </>
  );
};
