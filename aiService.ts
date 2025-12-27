
import { GoogleGenerativeAI } from '@google/generative-ai';
import { MindNode, TaskStatus } from './types';
import { flattenTree } from './utils';

// 本地存储 Keys
export const AI_SETTINGS_KEY = 'todomind-ai-settings';

export interface AiSettings {
    apiKey: string;
    model: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
    apiKey: '',
    model: 'gemini-3-pro-preview', // 用户指定模型
};

export interface AiSuggestion {
    nodeId: string;
    reason: string;
}

export const getAiSettings = (): AiSettings => {
    try {
        const saved = localStorage.getItem(AI_SETTINGS_KEY);
        if (saved) {
            return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Failed to load AI settings', e);
    }
    return DEFAULT_AI_SETTINGS;
};

export const saveAiSettings = (settings: AiSettings) => {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
};

export const generateActionSuggestion = async (root: MindNode): Promise<AiSuggestion | null> => {
    const settings = getAiSettings();
    if (!settings.apiKey) {
        throw new Error('请先在设置中配置 Gemini API Key');
    }

    const genAI = new GoogleGenerativeAI(settings.apiKey);
    const model = genAI.getGenerativeModel({ model: settings.model });

    // 1. 准备数据：扁平化并简化任务数据，只保留未完成的任务
    const allNodes = flattenTree(root);
    const activeTasks = allNodes.filter(
        node =>
            node.status !== TaskStatus.DONE &&
            node.status !== TaskStatus.IDEA // 也可以包含 IDEA，视情况而定，但通常我们想推进 TODO
    );

    if (activeTasks.length === 0) {
        return null;
    }

    // 简化数据结构以减少 Token 消耗
    const tasksForPrompt = activeTasks.map(node => ({
        id: node.id,
        text: node.text,
        status: node.status,
        important: node.isImportant,
        urgent: node.isUrgent,
        dueDate: node.dueDate || '无',
        hasChildren: node.children.length > 0
    }));

    // 2. 构建 ISTP 专属 Prompt
    const prompt = `
你是一个专门辅助 ISTP 性格用户的 AI 效率专家。
用户特点：ISTP，内向、感觉、思考、感知。
用户痛点：做事拖拉，内耗严重，面对大量选项时容易瘫痪，难以决定第一步。
当前任务：从以下任务列表中，挑选**唯一一个**最适合用户**现在立刻开始**的任务。

选择策略（打破内耗）：
1. **阻力最小原则**：优先选择看起来容易上手、能快速获得正反馈的任务。
2. **紧急防火原则**：如果有极度紧急且即将过期的任务，必须优先处理。
3. **行动导向**：不要选那些模糊不清的大项目（除非它是唯一的选项），尽量选具体可执行的步骤。

请返回 JSON 格式，不要包含 Markdown 格式化（如 \`\`\`json）：
{
  "nodeId": "任务ID",
  "reason": "简短的理由（1-2句）。语气要直接、冷静、像个并肩作战的伙伴。告诉他为什么做这个能让他爽或者安心。"
}

任务列表数据：
${JSON.stringify(tasksForPrompt)}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // 清理可能存在的 Markdown 标记
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const suggestion = JSON.parse(cleanText) as AiSuggestion;
        return suggestion;
    } catch (error) {
        console.error('AI Generation failed:', error);
        throw error;
    }
};
