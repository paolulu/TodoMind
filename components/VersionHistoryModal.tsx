import React, { useState, useEffect } from 'react';
import { getAllVersions, deleteVersion, exportVersion, VersionSnapshot } from '../versionManager';
import { Download, Trash2, RotateCcw, Clock, Monitor, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (data: any) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  onRestore
}) => {
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  // 加载版本列表
  const loadVersions = async () => {
    setLoading(true);
    try {
      const allVersions = await getAllVersions();
      setVersions(allVersions);
    } catch (error) {
      console.error('加载版本历史失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen]);

  // 恢复版本
  const handleRestore = async (version: VersionSnapshot) => {
    if (!confirm(`确定要恢复到这个版本吗？\n\n时间: ${new Date(version.timestamp).toLocaleString()}\n设备: ${version.deviceName}\n节点数: ${version.nodeCount}\n\n当前数据将被覆盖（会先保存当前状态到版本历史）`)) {
      return;
    }

    try {
      onRestore(version.data);
      onClose();
    } catch (error) {
      console.error('恢复版本失败:', error);
      alert('恢复版本失败，请查看控制台了解详情');
    }
  };

  // 删除版本
  const handleDelete = async (versionId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!confirm('确定要删除这个版本吗？此操作不可恢复。')) {
      return;
    }

    try {
      await deleteVersion(versionId);
      await loadVersions(); // 重新加载列表
    } catch (error) {
      console.error('删除版本失败:', error);
      alert('删除版本失败，请查看控制台了解详情');
    }
  };

  // 导出版本
  const handleExport = (version: VersionSnapshot, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      exportVersion(version);
    } catch (error) {
      console.error('导出版本失败:', error);
      alert('导出版本失败，请查看控制台了解详情');
    }
  };

  // 获取保存类型的显示信息
  const getSaveTypeInfo = (saveType: string) => {
    switch (saveType) {
      case 'manual':
        return { label: '手动保存', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: CheckCircle2 };
      case 'auto':
        return { label: '自动保存', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: Clock };
      case 'conflict-local':
        return { label: '冲突-本地', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: AlertTriangle };
      case 'conflict-remote':
        return { label: '冲突-远程', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertTriangle };
      default:
        return { label: saveType, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: FileText };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Clock size={20} />
              版本历史
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              共 {versions.length} 个版本（最多保留 20 个）
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-3 text-slate-600 dark:text-slate-300">加载中...</span>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">暂无版本历史</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                保存文件后将自动创建版本快照
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => {
                const saveTypeInfo = getSaveTypeInfo(version.saveType);
                const SaveTypeIcon = saveTypeInfo.icon;
                const isConflict = version.saveType.startsWith('conflict-');

                return (
                  <div
                    key={version.id}
                    className={`border rounded-lg p-4 transition-all cursor-pointer hover:shadow-md ${
                      selectedVersion === version.id
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : isConflict
                        ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedVersion(selectedVersion === version.id ? null : version.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Version Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {/* Version Number Badge */}
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            #{versions.length - index}
                          </span>

                          {/* Save Type Badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${saveTypeInfo.color}`}>
                            <SaveTypeIcon size={12} />
                            {saveTypeInfo.label}
                          </span>

                          {/* Latest Badge */}
                          {index === 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              最新
                            </span>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 mb-1">
                          <Clock size={14} />
                          <span className="font-medium">
                            {new Date(version.timestamp).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            ({formatRelativeTime(version.timestamp)})
                          </span>
                        </div>

                        {/* Device Info */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                          <Monitor size={12} />
                          <span>{version.deviceName}</span>
                          {version.fileName && (
                            <>
                              <span>•</span>
                              <FileText size={12} />
                              <span className="truncate">{version.fileName}</span>
                            </>
                          )}
                        </div>

                        {/* Node Count */}
                        <div className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                          节点总数: <span className="font-medium">{version.nodeCount}</span>
                        </div>

                        {/* Change Summary */}
                        {version.changeSummary && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                            <div className="font-medium text-slate-700 dark:text-slate-200">变更摘要:</div>
                            <div className="flex flex-wrap gap-2">
                              {version.changeSummary.nodesAdded > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                  +{version.changeSummary.nodesAdded} 新增
                                </span>
                              )}
                              {version.changeSummary.nodesDeleted > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                  -{version.changeSummary.nodesDeleted} 删除
                                </span>
                              )}
                              {version.changeSummary.nodesModified > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                  ~{version.changeSummary.nodesModified} 修改
                                </span>
                              )}
                            </div>
                            {version.changeSummary.majorChanges && version.changeSummary.majorChanges.length > 0 && (
                              <div className="text-slate-500 dark:text-slate-400">
                                {version.changeSummary.majorChanges.join(' · ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleRestore(version)}
                          className="p-2 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 transition-colors"
                          title="恢复到此版本"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button
                          onClick={(e) => handleExport(version, e)}
                          className="p-2 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                          title="导出此版本"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(version.id, e)}
                          className="p-2 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                          title="删除此版本"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Conflict Warning */}
                    {isConflict && (
                      <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
                        <div className="flex items-start gap-2 text-xs text-orange-700 dark:text-orange-300">
                          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium mb-1">检测到多设备同时编辑</div>
                            <div className="text-orange-600 dark:text-orange-400">
                              {version.saveType === 'conflict-local'
                                ? '这是您本地设备的版本，已被远程版本覆盖'
                                : '这是远程设备的版本，已自动同步到本地'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            💡 提示: 点击版本可查看详情，支持恢复、导出和删除操作
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

// 格式化相对时间
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  if (days < 365) return `${Math.floor(days / 30)}个月前`;
  return `${Math.floor(days / 365)}年前`;
}
