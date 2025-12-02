import { TaskStatus } from './types';
import { Circle, AlertCircle, Clock, CheckCircle2, Lightbulb, Activity, CheckSquare, Eye, Star, Flame } from 'lucide-react';
import React from 'react';

export const STATUS_CONFIG = {
  [TaskStatus.IDEA]: {
    label: '想法',
    color: 'bg-gray-100 border-gray-300 text-gray-700',
    icon: <Lightbulb className="w-4 h-4" />,
  },
  [TaskStatus.TODO]: {
    label: '待办',
    color: 'bg-blue-50 border-blue-200 text-blue-600',
    icon: <Circle className="w-4 h-4" />,
  },
  [TaskStatus.IN_PROGRESS]: {
    label: '进行中',
    color: 'bg-green-50 border-green-200 text-green-600',
    icon: <Activity className="w-4 h-4" />,
  },
  [TaskStatus.TRACKING]: {
    label: '跟踪中',
    color: 'bg-purple-50 border-purple-200 text-purple-600',
    icon: <Eye className="w-4 h-4" />,
  },
  [TaskStatus.DONE]: {
    label: '已完成',
    color: 'bg-green-100 border-green-300 text-green-800',
    icon: <CheckSquare className="w-4 h-4" />,
  },
};

export const PRIORITY_BADGE_CONFIG = {
  important: {
    label: '重要',
    color: 'text-yellow-600 border-yellow-600',
    icon: <Star className="w-4 h-4 fill-yellow-100" />,
  },
  urgent: {
    label: '紧急',
    color: 'text-red-600 border-red-600',
    icon: <Flame className="w-4 h-4 fill-red-100" />,
  },
};
