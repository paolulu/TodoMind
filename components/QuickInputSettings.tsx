import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { MindNode } from '../types';
import { flattenTree } from '../utils';

interface QuickInputSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  root: MindNode;
  currentTargetId: string | null;
  onSaveTarget: (nodeId: string) => void;
}

export const QuickInputSettings: React.FC<QuickInputSettingsProps> = ({
  isOpen,
  onClose,
  root,
  currentTargetId,
  onSaveTarget,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(currentTargetId);

  useEffect(() => {
    setSelectedNodeId(currentTargetId);
  }, [currentTargetId, isOpen]);

  if (!isOpen) return null;

  const allNodes = flattenTree(root);

  // Filter nodes by search text
  const filteredNodes = searchText.trim()
    ? allNodes.filter(node =>
        node.text.toLowerCase().includes(searchText.toLowerCase())
      )
    : allNodes;

  // Get node path for better identification
  const getNodePath = (nodeId: string): string => {
    const path: string[] = [];
    let currentId: string | null = nodeId;

    while (currentId) {
      const node = allNodes.find(n => n.id === currentId);
      if (!node) break;
      path.unshift(node.text || '未命名');

      // Find parent
      const parent = allNodes.find(n => n.children.some(c => c.id === currentId));
      currentId = parent ? parent.id : null;
    }

    return path.join(' > ');
  };

  const handleSave = () => {
    if (selectedNodeId) {
      onSaveTarget(selectedNodeId);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            ⚙️ 快速输入设置
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="输入节点名称搜索..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Node List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {filteredNodes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                未找到匹配的节点
              </div>
            ) : (
              filteredNodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedNodeId === node.id
                      ? 'bg-indigo-100 border border-indigo-300'
                      : 'hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-slate-800 text-sm">
                    {node.text || '未命名节点'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {getNodePath(node.id)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <div className="text-sm text-slate-600">
            {selectedNodeId && (
              <span>
                已选择: <strong>{allNodes.find(n => n.id === selectedNodeId)?.text}</strong>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedNodeId}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
