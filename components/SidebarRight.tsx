import React from 'react';
import { MindNode, TaskStatus } from '../types';
import { STATUS_CONFIG, PRIORITY_BADGE_CONFIG } from '../constants';
import { Trash2, ArrowUp, ArrowDown, Plus, GitBranch, ChevronRight, ChevronLeft, History, Clock } from 'lucide-react';

interface SidebarRightProps {
  node: MindNode | null;
  onUpdate: (updates: Partial<MindNode>) => void;
  onDelete: () => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onMove: (dir: 'up' | 'down') => void;
  isOpen: boolean;
  onToggle: () => void;
  isLocked: boolean;
}

const formatHistoryMessage = (item: any) => {
  const fieldNames: Record<string, string> = {
    status: '状态',
    isImportant: '重要性',
    isUrgent: '紧急性',
    dueDate: '截止日期',
    text: '任务名',
    note: '备注'
  };

  const field = fieldNames[item.field] || item.field;
  const oldVal = item.oldValue;
  const newVal = item.newValue;

  if (item.field === 'status') {
    const statusMap: Record<string, string> = {
      'idea': '想法', 'todo': '待办', 'in-progress': '进行中', 'tracking': '跟踪中', 'done': '已完成'
    };
    const label = (v: string) => statusMap[v] || v.toUpperCase();
    return `状态: ${label(oldVal)} → ${label(newVal)}`;
  }

  if (item.field === 'isImportant') {
    return newVal === 'true' ? '➕ 标记为重要' : '➖ 取消重要标记';
  }

  if (item.field === 'isUrgent') {
    return newVal === 'true' ? '🔥 标记为紧急' : '❄️ 取消紧急标记';
  }

  if (item.field === 'dueDate') {
    if (!newVal || newVal === 'undefined') return `🗑️ 清除截止日期 (${oldVal})`;
    if (!oldVal || oldVal === 'undefined') return `📅 设定截止日期: ${newVal}`;
    return `📅 日期变更: ${oldVal} → ${newVal}`;
  }

  if (item.field === 'text') {
    const trunc = (s: string) => s.length > 8 ? s.substring(0, 8) + '...' : s;
    return `📝 改名: "${trunc(oldVal)}" → "${trunc(newVal)}"`;
  }

  if (item.field === 'note') {
    return `📒 更新了备注内容`;
  }

  return `修改了 ${field}: ${oldVal} → ${newVal}`;
};

export const SidebarRight: React.FC<SidebarRightProps> = ({ node, onUpdate, onDelete, onAddChild, onAddSibling, onMove, isOpen, onToggle, isLocked }) => {
  // Local state for text and note to prevent history spam
  const [localText, setLocalText] = React.useState('');
  const [localNote, setLocalNote] = React.useState('');

  // Sync local state when node changes
  React.useEffect(() => {
    if (node) {
      setLocalText(node.text);
      setLocalNote(node.note || '');
    }
  }, [node?.id]); // Only reset when switching to a different node

  // Handler for text blur - only update if changed
  const handleTextBlur = () => {
    if (node && localText !== node.text) {
      onUpdate({ text: localText });
    }
  };

  // Handler for note blur - only update if changed
  const handleNoteBlur = () => {
    if (node && localNote !== (node.note || '')) {
      onUpdate({ note: localNote });
    }
  };

  return (
    <div className={`relative h-full flex transition-all duration-300 ease-in-out ${isOpen ? 'w-80' : 'w-0'}`}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white border border-slate-200 rounded-l-lg p-2 shadow-md hover:bg-slate-50 transition-colors z-30"
        title={isOpen ? '收起侧边栏' : '展开侧边栏'}
      >
        {isOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      {/* Sidebar Content */}
      <div className={`w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {!node ? (
          <div className="w-full h-full flex items-center justify-center text-slate-400 p-8 text-center">
            <div>
              <p>选择一个节点以编辑属性</p>
              <p className="text-xs mt-2">点击导图或大纲中的节点</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-semibold text-slate-800">任务详情</h2>
              <div className="flex gap-1">
                <button onClick={() => !isLocked && onMove('up')} disabled={isLocked} className={`p-1.5 rounded ${isLocked ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-200 text-slate-600'}`} title={isLocked ? '已锁定' : 'Move Up'}><ArrowUp size={16} /></button>
                <button onClick={() => !isLocked && onMove('down')} disabled={isLocked} className={`p-1.5 rounded ${isLocked ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-200 text-slate-600'}`} title={isLocked ? '已锁定' : 'Move Down'}><ArrowDown size={16} /></button>
                <button onClick={() => !isLocked && onDelete()} disabled={isLocked} className={`p-1.5 rounded ml-2 ${isLocked ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-red-100 text-slate-600 hover:text-red-600'}`} title={isLocked ? '已锁定' : 'Delete'}><Trash2 size={16} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">任务名称</label>
                <input
                  type="text"
                  value={localText}
                  onChange={(e) => !isLocked && setLocalText(e.target.value)}
                  onBlur={handleTextBlur}
                  disabled={isLocked}
                  className={`w-full text-lg font-bold border-b-2 outline-none py-1 bg-transparent transition-colors ${isLocked ? 'border-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:border-indigo-500'}`}
                  placeholder="输入任务名称..."
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">状态</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => !isLocked && onUpdate({ status: key as TaskStatus })}
                      disabled={isLocked}
                      className={`
                    flex items-center gap-2 px-3 py-2 rounded border-2 text-sm transition-all
                    ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                    ${node.status === key
                          ? `${config.color} font-medium`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                  `}
                    >
                      {config.icon}
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Toggles */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">优先级标签</label>
                <div className="space-y-2">
                  {/* Important Toggle */}
                  <button
                    onClick={() => !isLocked && onUpdate({ isImportant: !node.isImportant })}
                    disabled={isLocked}
                    className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded border-2 text-sm transition-all
                  ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                  ${node.isImportant
                        ? `bg-yellow-50 border-yellow-200 ${PRIORITY_BADGE_CONFIG.important.color} font-medium`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                `}
                  >
                    {PRIORITY_BADGE_CONFIG.important.icon}
                    <span>{PRIORITY_BADGE_CONFIG.important.label}</span>
                    {node.isImportant && <span className="ml-auto text-yellow-600 text-xs">●</span>}
                  </button>

                  {/* Urgent Toggle */}
                  <button
                    onClick={() => !isLocked && onUpdate({ isUrgent: !node.isUrgent })}
                    disabled={isLocked}
                    className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded border-2 text-sm transition-all
                  ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
                  ${node.isUrgent
                        ? `bg-red-50 border-red-200 ${PRIORITY_BADGE_CONFIG.urgent.color} font-medium`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                `}
                  >
                    {PRIORITY_BADGE_CONFIG.urgent.icon}
                    <span>{PRIORITY_BADGE_CONFIG.urgent.label}</span>
                    {node.isUrgent && <span className="ml-auto text-red-600 text-xs">●</span>}
                  </button>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">截止日期</label>
                <input
                  type="date"
                  value={node.dueDate || ''}
                  onChange={(e) => !isLocked && onUpdate({ dueDate: e.target.value })}
                  disabled={isLocked}
                  className={`w-full px-3 py-2 border rounded-md outline-none text-sm ${isLocked ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:ring-2 focus:ring-indigo-200'}`}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">备注</label>
                <textarea
                  value={localNote}
                  onChange={(e) => !isLocked && setLocalNote(e.target.value)}
                  onBlur={handleNoteBlur}
                  disabled={isLocked}
                  className={`w-full h-32 px-3 py-2 border rounded-md outline-none text-sm resize-none ${isLocked ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed' : 'border-slate-200 focus:ring-2 focus:ring-indigo-200'}`}
                  placeholder="添加描述或详情..."
                />
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
                <button onClick={() => !isLocked && onAddSibling()} disabled={isLocked} className={`flex items-center justify-center gap-2 py-2 px-4 border rounded text-sm font-medium ${isLocked ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'}`}>
                  <Plus size={16} /> 同级
                </button>
                <button onClick={() => !isLocked && onAddChild()} disabled={isLocked} className={`flex items-center justify-center gap-2 py-2 px-4 rounded text-sm font-medium ${isLocked ? 'bg-slate-400 text-slate-200 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  <GitBranch size={16} /> 子级
                </button>
              </div>
            </div>

            {/* Metadata & History */}
            <div className="pt-4 border-t border-slate-100 space-y-3 pb-8">
              <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <History size={12} /> 历史记录
              </label>

              <div className="text-xs text-slate-500 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1"><Clock size={10} /> 创建时间</span>
                  <span className="font-mono text-[10px]">{new Date(node.createdAt).toLocaleString()}</span>
                </div>
                {node.updatedAt && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1"><History size={10} /> 最后更新</span>
                    <span className="font-mono text-[10px]">{new Date(node.updatedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* History List */}
              {node.history && node.history.length > 0 ? (
                <div className="mt-2 space-y-0 relative border-l-2 border-slate-200 ml-2 pl-3">
                  {node.history.slice().reverse().map((item, i) => (
                    <div key={i} className="mb-4 relative">
                      <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white"></div>
                      <div className="text-[10px] text-slate-400 font-mono mb-0.5">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-700">
                        {formatHistoryMessage(item)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-slate-300 italic">
                  暂无修改记录
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
