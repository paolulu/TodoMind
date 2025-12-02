import React, { useEffect, useRef, useState } from 'react';
import { MindNode, TaskStatus } from '../types';
import { STATUS_CONFIG, PRIORITY_BADGE_CONFIG } from '../constants';
import { Trash2, Plus, GitBranch } from 'lucide-react';

interface ContextMenuProps {
  node: MindNode;
  position: { x: number; y: number };
  onClose: () => void;
  onUpdate: (updates: Partial<MindNode>) => void;
  onDelete: () => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onMove: (dir: 'up' | 'down') => void;
  isRoot: boolean;
  isLocked: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  node,
  position,
  onClose,
  onUpdate,
  onDelete,
  onAddChild,
  onAddSibling,
  onMove,
  isRoot,
  isLocked,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // 调整菜单位置，避免超出屏幕
  useEffect(() => {
    if (menuRef.current) {
      const menuRect = menuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let newX = position.x;
      let newY = position.y;

      // 检查是否超出屏幕底部
      if (position.y + menuRect.height > viewportHeight) {
        // 菜单向上展开
        newY = position.y - menuRect.height;
      }

      // 检查是否超出屏幕右侧
      if (position.x + menuRect.width > viewportWidth) {
        newX = viewportWidth - menuRect.width - 10;
      }

      // 检查是否超出屏幕左侧
      if (newX < 0) {
        newX = 10;
      }

      // 检查是否超出屏幕顶部
      if (newY < 0) {
        newY = 10;
      }

      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [position]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // 延迟添加事件监听，避免立即触发
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // ESC键关闭菜单
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-slate-200 py-2 z-[9999] min-w-[200px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* 快捷操作 */}
      <div className="px-2 py-1">
        <div className="text-xs font-semibold text-slate-400 uppercase px-2 py-1">快捷操作</div>
        <button
          onClick={() => handleAction(onAddChild)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded text-sm text-slate-700"
        >
          <GitBranch size={14} />
          添加子节点
        </button>
        {!isRoot && (
          <button
            onClick={() => handleAction(onAddSibling)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded text-sm text-slate-700"
          >
            <Plus size={14} />
            添加同级节点
          </button>
        )}
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-slate-200 my-1"></div>

      {/* 状态切换 */}
      <div className="px-2 py-1">
        <div className="text-xs font-semibold text-slate-400 uppercase px-2 py-1">状态</div>
        <div className="grid grid-cols-1 gap-1">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleAction(() => onUpdate({ status: key as TaskStatus }))}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-all
                ${
                  node.status === key
                    ? `${config.color} font-medium`
                    : 'hover:bg-slate-100 text-slate-600'
                }
              `}
            >
              {config.icon}
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-slate-200 my-1"></div>

      {/* 优先级切换 */}
      <div className="px-2 py-1">
        <div className="text-xs font-semibold text-slate-400 uppercase px-2 py-1">优先级</div>
        <button
          onClick={() => handleAction(() => onUpdate({ isImportant: !node.isImportant }))}
          className={`
            w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-all
            ${
              node.isImportant
                ? `bg-yellow-50 ${PRIORITY_BADGE_CONFIG.important.color} font-medium`
                : 'hover:bg-slate-100 text-slate-600'
            }
          `}
        >
          {PRIORITY_BADGE_CONFIG.important.icon}
          {node.isImportant ? '取消重要' : '标记为重要'}
        </button>
        <button
          onClick={() => handleAction(() => onUpdate({ isUrgent: !node.isUrgent }))}
          className={`
            w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-all
            ${
              node.isUrgent
                ? `bg-red-50 ${PRIORITY_BADGE_CONFIG.urgent.color} font-medium`
                : 'hover:bg-slate-100 text-slate-600'
            }
          `}
        >
          {PRIORITY_BADGE_CONFIG.urgent.icon}
          {node.isUrgent ? '取消紧急' : '标记为紧急'}
        </button>
      </div>

      {/* 分隔线 */}
      {!isRoot && <div className="h-px bg-slate-200 my-1"></div>}

      {/* 删除操作 */}
      {!isRoot && (
        <div className="px-2 py-1">
          <button
            onClick={() => handleAction(onDelete)}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 rounded text-sm text-red-600 font-medium"
          >
            <Trash2 size={14} />
            删除节点
          </button>
        </div>
      )}
    </div>
  );
};
