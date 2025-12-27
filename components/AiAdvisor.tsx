
import React, { useState } from 'react';
import { Sparkles, RefreshCw, ArrowRight, XCircle, Play, AlertTriangle } from 'lucide-react';
import { MindNode, TaskStatus } from '../types';
import { generateActionSuggestion, AiSuggestion, getAiSettings } from '../aiService';

interface AiAdvisorProps {
    root: MindNode;
    onSelectNode: (nodeId: string) => void;
    onOpenSettings: () => void;
    onUpdateStatus: (nodeId: string, status: TaskStatus) => void;
}

export const AiAdvisor: React.FC<AiAdvisorProps> = ({ root, onSelectNode, onOpenSettings, onUpdateStatus }) => {
    const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetAdvice = async () => {
        const settings = getAiSettings();
        if (!settings.apiKey) {
            if (confirm('AI 功能需要配置 API Key。是否现在去设置？')) {
                onOpenSettings();
            }
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await generateActionSuggestion(root);
            if (result) {
                setSuggestion(result);
            } else {
                setError('目前没有待办任务需要分析。');
            }
        } catch (err: any) {
            console.error(err);
            if (err.message && err.message.includes('API Key')) {
                setError('API Key 无效或未配置。');
            } else {
                setError('分析失败，请稍后重试。');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStartTask = () => {
        if (suggestion) {
            onSelectNode(suggestion.nodeId);
            // 自动标为进行中 (可选，这里先只聚焦)
            onUpdateStatus(suggestion.nodeId, TaskStatus.IN_PROGRESS);
        }
    };

    if (!suggestion && !error) {
        return (
            <div className="mb-4">
                <button
                    onClick={handleGetAdvice}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl p-3 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] group"
                >
                    {loading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                        <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                    )}
                    <span className="font-medium tracking-wide">
                        {loading ? 'AI 正在思考...' : 'AI：现在做什么？'}
                    </span>
                </button>
            </div>
        );
    }

    return (
        <div className="mb-4 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-900/30 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-800/50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">

            {/* 头部 */}
            <div className="px-4 py-2 bg-indigo-100/50 dark:bg-indigo-900/40 flex justify-between items-center border-b border-indigo-100 dark:border-indigo-800/30">
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    {error ? '出错了' : '最佳行动建议'}
                </div>
                <button
                    onClick={() => { setSuggestion(null); setError(null); }}
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                >
                    <XCircle className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4">
                {error ? (
                    <div className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p>{error}</p>
                            {error.includes('API Key') && (
                                <button
                                    onClick={onOpenSettings}
                                    className="mt-2 text-xs font-semibold underline hover:text-red-800 dark:hover:text-red-300"
                                >
                                    去设置 API Key
                                </button>
                            )}
                        </div>
                    </div>
                ) : suggestion && (
                    <>
                        <div className="mb-4">
                            {/* 理由 */}
                            <div className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300 italic mb-3 relative">
                                <span className="absolute -top-2 -left-1 text-4xl text-indigo-200 dark:text-indigo-800 select-none">"</span>
                                {suggestion.reason}
                                <span className="absolute -bottom-4 -right-1 text-4xl text-indigo-200 dark:text-indigo-800 select-none">"</span>
                            </div>

                            {/* 任务名 */}
                            <div className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight flex items-start gap-2">
                                <span className="min-w-[4px] h-[1.2em] bg-indigo-500 rounded-full mt-1"></span>
                                {/* 我们这里其实只有ID，需要外部帮我们找名字，或者我们自己找。
                     为了简单，我在 AI 返回时没有存 text，这有点问题。
                     AI 是知道 text 的，应该让它带回来。
                     虽然 utils 有 findNode，但我没有 root 的便利访问（除了 props）。
                     为了严谨，AI 返回时建议带上 task text，或者我们通过 ID 查找。
                     Service 里已经有了 NodeId，为了显示方便，让 service 返回 text 更好。
                     
                     等等，aiService 的 Suggestion 定义只有 nodeId 和 reason。
                     我需要去修改一下 aiService 或者在这里查找。
                     在这里查找比较合理，因为 client 端数据最新。
                  */}
                                <TaskNameDisplay root={root} nodeId={suggestion.nodeId} />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleStartTask}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-lg text-sm font-semibold shadow-md shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition-all"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                立即行动
                            </button>
                            <button
                                onClick={handleGetAdvice}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="换一个建议"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// 辅助组件：显示任务名称
import { findNode } from '../utils';

const TaskNameDisplay: React.FC<{ root: MindNode; nodeId: string }> = ({ root, nodeId }) => {
    const node = React.useMemo(() => findNode(root, nodeId), [root, nodeId]);
    if (!node) return <span className="opacity-50">未知任务</span>;
    return <span>{node.text || '未命名任务'}</span>;
};
