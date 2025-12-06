import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { MindNode } from '../types';

interface QuickInputProps {
  onQuickAdd: (text: string) => void;
  onFocusChange?: (isFocused: boolean) => void;
}

export const QuickInput: React.FC<QuickInputProps> = ({
  onQuickAdd,
  onFocusChange,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Track focus state
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => onFocusChange?.(true);
    const handleBlur = () => onFocusChange?.(false);

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);

    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
    };
  }, [onFocusChange]);

  const handleSubmit = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      onQuickAdd(trimmedValue);
      setInputValue('');
      // Keep focus on input
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[600px] max-w-[90vw]">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden p-2">
        <div className="flex items-center gap-2">
          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="快速添加想法...(Cmd+Enter)保存"
            className="flex-1 px-3 py-2 text-sm outline-none focus:ring-0 border-none"
          />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className="p-2 rounded hover:bg-slate-100 text-slate-600 hover:text-indigo-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="提交 (Cmd+Enter)"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
