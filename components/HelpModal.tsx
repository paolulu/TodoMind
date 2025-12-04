import React from 'react';
import { X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">📖 使用说明</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <section className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">🧠 什么是 TodoMind？</h3>
            <p className="text-slate-600 leading-relaxed">
              TodoMind 是一款基于思维导图的待办事项管理工具，帮助您以可视化、层级化的方式组织和管理任务。
            </p>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">⌨️ 快捷键</h3>

            <div className="mb-4">
              <h4 className="font-medium text-slate-600 mb-2">节点操作（需先选中节点）</h4>
              <div className="space-y-1 text-sm text-slate-600 bg-slate-50 p-3 rounded">
                <div className="flex justify-between"><span>双击节点</span><span className="font-mono bg-white px-2 py-0.5 rounded">编辑内容</span></div>
                <div className="flex justify-between"><span>添加子节点</span><span className="font-mono bg-white px-2 py-0.5 rounded">Tab</span></div>
                <div className="flex justify-between"><span>添加同级节点</span><span className="font-mono bg-white px-2 py-0.5 rounded">Enter</span></div>
                <div className="flex justify-between"><span>删除节点</span><span className="font-mono bg-white px-2 py-0.5 rounded">Delete / Backspace</span></div>
                <div className="flex justify-between"><span>上移/下移节点</span><span className="font-mono bg-white px-2 py-0.5 rounded">Alt + ↑ / ↓</span></div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-slate-600 mb-2">筛选快捷键（未选中节点时）</h4>
              <div className="space-y-1 text-sm text-slate-600 bg-slate-50 p-3 rounded">
                <div className="flex justify-between"><span>全部</span><span className="font-mono bg-white px-2 py-0.5 rounded">0</span></div>
                <div className="flex justify-between"><span>今日</span><span className="font-mono bg-white px-2 py-0.5 rounded">1</span></div>
                <div className="flex justify-between"><span>已到期</span><span className="font-mono bg-white px-2 py-0.5 rounded">2</span></div>
                <div className="flex justify-between"><span>计划中</span><span className="font-mono bg-white px-2 py-0.5 rounded">3</span></div>
                <div className="flex justify-between"><span>重要（切换）</span><span className="font-mono bg-white px-2 py-0.5 rounded">Z</span></div>
                <div className="flex justify-between"><span>紧急（切换）</span><span className="font-mono bg-white px-2 py-0.5 rounded">J</span></div>
                <div className="flex justify-between"><span>重要且紧急（切换）</span><span className="font-mono bg-white px-2 py-0.5 rounded">Q</span></div>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-slate-600 mb-2">其他快捷键</h4>
              <div className="space-y-1 text-sm text-slate-600 bg-slate-50 p-3 rounded">
                <div className="flex justify-between"><span>保存/导出文件</span><span className="font-mono bg-white px-2 py-0.5 rounded">Cmd/Ctrl + S</span></div>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">🎯 任务状态</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-16 h-6 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-xs">想法</span>
                <span>初步想法，还未明确</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 h-6 bg-blue-100 border border-blue-300 rounded flex items-center justify-center text-xs text-blue-700">待办</span>
                <span>已确定要做的任务</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 h-6 bg-yellow-100 border border-yellow-300 rounded flex items-center justify-center text-xs text-yellow-700">进行中</span>
                <span>正在进行的任务</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 h-6 bg-purple-100 border border-purple-300 rounded flex items-center justify-center text-xs text-purple-700">跟踪</span>
                <span>需要持续关注的任务</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-16 h-6 bg-green-100 border border-green-300 rounded flex items-center justify-center text-xs text-green-700">完成</span>
                <span>已完成的任务</span>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">🔥 优先级标记</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600">⭐</span>
                <span>重要 - 对目标有重大影响的任务</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600">🔥</span>
                <span>紧急 - 有明确时间要求的任务</span>
              </div>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">💾 数据存储</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>• <strong>自动保存</strong>：数据自动保存到浏览器本地存储</p>
              <p>• <strong>文件保存</strong>：可将数据保存为 JSON 文件到本地</p>
              <p>• <strong>跨设备同步</strong>：保存文件后，程序会自动监测文件变化并同步（需要浏览器支持 File System Access API）</p>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">🎨 界面操作</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>• <strong>缩放</strong>：使用鼠标滚轮或触控板缩放画布</p>
              <p>• <strong>拖拽</strong>：按住空白区域拖动画布，或拖拽节点改变层级关系</p>
              <p>• <strong>折叠/展开</strong>：点击节点左侧箭头折叠或展开子节点</p>
              <p>• <strong>眼睛图标</strong>：在筛选模式下，切换"仅显示筛选结果"和"显示所有节点"</p>
              <p>• <strong>锁定/解锁</strong>：画布右下角可锁定编辑，防止误操作</p>
            </div>
          </section>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-3">📝 中文输入法</h3>
            <div className="space-y-2 text-sm text-slate-600">
              <p>程序已优化中文输入法支持，使用拼音输入时按 Enter 确认选字不会创建新节点。</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
