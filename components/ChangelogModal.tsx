import React from 'react';
import { X } from 'lucide-react';
import { APP_VERSION } from '../version';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">📋 版本更新日志</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">

          {/* v1.0.10 */}
          <section className="mb-6 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold text-indigo-600">v1.0.10</h3>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">当前版本</span>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">✨ 新功能</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>左侧筛选栏显示节点数：快捷键显示替换为实时节点计数</li>
                  <li>筛选时自动隐藏未匹配节点：提升筛选结果的可视性</li>
                  <li>筛选时自动居中视图：每次切换筛选条件时自动调整视图到最佳位置</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-1">🐛 修复</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>修复视图重置问题：解决手动缩放/平移后筛选视图无法正确居中的问题</li>
                  <li>修复 React 闭包陷阱：确保视图重置函数始终使用最新的状态值</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-1">🎨 优化</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>优化筛选交互：自动开启"仅显示筛选结果"模式，提供更直观的筛选体验</li>
                  <li>改进节点计数显示：使用小徽章样式展示，界面更加清晰</li>
                </ul>
              </div>
            </div>
          </section>

          {/* v1.0.06 */}
          <section className="mb-6 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-semibold text-slate-700">v1.0.06</h3>
            </div>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">✨ 新功能</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>新增文件信息模态框：点击左下角文件名可查看文件详细信息</li>
                  <li>显示文件大小、最后修改时间、最后保存时间等元数据</li>
                  <li>优化文件名显示：带下划线样式，悬停变色，提升交互体验</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-1">🔧 优化</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>改进文件路径显示逻辑，在安全限制下提供更好的用户反馈</li>
                  <li>增强文件元数据跟踪，自动更新文件信息</li>
                </ul>
              </div>
            </div>
          </section>

          {/* v1.0.05 */}
          <section className="mb-6 pb-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">v1.0.05</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">✨ 新功能</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>新增"重要且紧急"筛选选项，可精确筛选同时满足重要和紧急的节点</li>
                  <li>实现上下文感知快捷键系统，区分节点操作和筛选操作</li>
                  <li>在侧边栏显示快捷键提示，提升可发现性</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-1">🐛 修复</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>修复中文输入法冲突：使用拼音输入按 Enter 确认选字时不再创建新节点</li>
                  <li>优化优先级筛选逻辑：多选时从 AND 改为 OR 逻辑，更符合使用习惯</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-700 mb-1">⌨️ 快捷键更新</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>筛选快捷键：0(全部) 1(今日) 2(已到期) 3(计划中) Z(重要) J(紧急) Q(重要且紧急)</li>
                  <li>节点操作快捷键仅在选中节点时生效</li>
                </ul>
              </div>
            </div>
          </section>

          {/* v1.0.04 */}
          <section className="mb-6 pb-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">v1.0.04</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">✨ 新功能</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>改进文件同步逻辑：自动检测外部文件修改并同步</li>
                  <li>优化跨设备协作体验</li>
                </ul>
              </div>
            </div>
          </section>

          {/* v1.0.03 */}
          <section className="mb-6 pb-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">v1.0.03</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">✨ 新功能</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>添加文件持久化功能，支持保存和加载 JSON 文件</li>
                  <li>实现 IndexedDB 存储文件句柄，刷新页面后保持文件关联</li>
                </ul>
              </div>
            </div>
          </section>

          {/* v1.0.02 */}
          <section className="mb-6 pb-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">v1.0.02</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">✨ 新功能</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>添加筛选功能：今日、已到期、计划中、重要、紧急</li>
                  <li>支持多选优先级筛选</li>
                  <li>添加"仅显示筛选结果"模式</li>
                </ul>
              </div>
            </div>
          </section>

          {/* v1.0.01 */}
          <section className="mb-6 pb-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">v1.0.01</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">✨ 新功能</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>基础思维导图编辑功能</li>
                  <li>任务状态管理（想法、待办、进行中、跟踪、完成）</li>
                  <li>优先级标记（重要、紧急）</li>
                  <li>截止日期设置</li>
                  <li>节点拖拽移动</li>
                  <li>画布缩放和平移</li>
                </ul>
              </div>
            </div>
          </section>

          {/* v1.0.0 */}
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">v1.0.0</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <h4 className="font-medium text-slate-700 mb-1">🎉 初始版本</h4>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>TodoMind 首次发布</li>
                  <li>基于思维导图的待办事项管理系统</li>
                </ul>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
