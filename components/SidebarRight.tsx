import React from 'react';
import { MindNode, TaskStatus } from '../types';
import { STATUS_CONFIG, PRIORITY_BADGE_CONFIG } from '../constants';
import { Trash2, ArrowUp, ArrowDown, Plus, GitBranch } from 'lucide-react';

interface SidebarRightProps {
  node: MindNode | null;
  onUpdate: (updates: Partial<MindNode>) => void;
  onDelete: () => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onMove: (dir: 'up' | 'down') => void;
}

export const SidebarRight: React.FC<SidebarRightProps> = ({ node, onUpdate, onDelete, onAddChild, onAddSibling, onMove }) => {
  if (!node) {
    return (
      <div className="w-80 bg-white border-l border-slate-200 h-full flex items-center justify-center text-slate-400 p-8 text-center z-20">
        <div>
           <p>选择一个节点以编辑属性</p>
           <p className="text-xs mt-2">点击导图或大纲中的节点</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl z-20">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h2 className="font-semibold text-slate-800">任务详情</h2>
        <div className="flex gap-1">
            <button onClick={() => onMove('up')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Move Up"><ArrowUp size={16}/></button>
            <button onClick={() => onMove('down')} className="p-1.5 hover:bg-slate-200 rounded text-slate-600" title="Move Down"><ArrowDown size={16}/></button>
            <button onClick={onDelete} className="p-1.5 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded ml-2" title="Delete"><Trash2 size={16}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">任务名称</label>
          <input
            type="text"
            value={node.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            className="w-full text-lg font-bold border-b-2 border-slate-200 focus:border-indigo-500 outline-none py-1 bg-transparent transition-colors"
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
                  onClick={() => onUpdate({ status: key as TaskStatus })}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded border-2 text-sm transition-all
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
                onClick={() => onUpdate({ isImportant: !node.isImportant })}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded border-2 text-sm transition-all
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
                onClick={() => onUpdate({ isUrgent: !node.isUrgent })}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded border-2 text-sm transition-all
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
            onChange={(e) => onUpdate({ dueDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-200 outline-none text-sm"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">备注</label>
          <textarea
            value={node.note || ''}
            onChange={(e) => onUpdate({ note: e.target.value })}
            className="w-full h-32 px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-200 outline-none text-sm resize-none"
            placeholder="添加描述或详情..."
          />
        </div>

         {/* Quick Actions */}
         <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
             <button onClick={onAddSibling} className="flex items-center justify-center gap-2 py-2 px-4 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-700 text-sm font-medium">
               <Plus size={16} /> 同级
             </button>
             <button onClick={onAddChild} className="flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium">
               <GitBranch size={16} /> 子级
             </button>
         </div>
      </div>
    </div>
  );
};
