import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import { MindMapCanvas } from './components/MindMapCanvas';
import { MindNode, FilterType, TaskStatus, FileData } from './types';
import { createNode, findNode, updateNodeInTree, addChildNode, addSiblingNode, deleteNodeFromTree, findParent, flattenTree, matchesFilter, matchesFilterState, moveNodeInTree, moveNodeToNewParent } from './utils';
import { Save, FolderOpen, Download, RefreshCw, Lock, Unlock } from 'lucide-react';

const INITIAL_DATA: MindNode = {
  ...createNode('运营目标'),
  text: '公司运营',
  status: TaskStatus.IDEA,
  isImportant: true,
  isUrgent: true,
};

const LOCALSTORAGE_KEY = 'mindmap-todo-data';

// Load data from localStorage or return initial data
const loadInitialData = (): MindNode => {
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    if (stored) {
      const parsed: FileData = JSON.parse(stored);
      console.log('Loaded data from localStorage');
      return parsed.root;
    }
  } catch (err) {
    console.error('Failed to load from localStorage:', err);
  }
  return INITIAL_DATA;
};

// --- Custom Hook for File System ---
const useFileSystem = (data: MindNode, onLoad: (data: MindNode) => void) => {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isDirty, setIsDirty] = useState(false);

  // Auto-save every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (fileHandle && isDirty) {
        saveFile(true);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fileHandle, isDirty, data]);

  // Mark dirty on data change
  useEffect(() => {
    setIsDirty(true);
  }, [data]);

  const saveFile = async (auto = false) => {
    try {
      let handle = fileHandle;
      if (!handle && !auto) {
        try {
            // @ts-ignore - File System Access API
            handle = await window.showSaveFilePicker({
            types: [{ description: 'MindMap JSON', accept: { 'application/json': ['.json'] } }],
            });
            setFileHandle(handle);
        } catch (pickerErr) {
            // If user cancelled, just return
            if ((pickerErr as Error).name === 'AbortError') return;
            // If security error (cross-origin), throw to trigger fallback
            throw pickerErr;
        }
      }

      if (handle) {
        // @ts-ignore
        const writable = await handle.createWritable();
        const content: FileData = { root: data, lastSaved: Date.now() };
        await writable.write(JSON.stringify(content, null, 2));
        await writable.close();
        setLastSaved(Date.now());
        setIsDirty(false);
        console.log('Saved successfully');
      } else if (!auto) {
         // Manual save without handle (or FS API failed) -> Fallback to download
         throw new Error("No file handle");
      }
    } catch (err) {
      console.warn('File System API unavailable or failed, falling back to download.', err);
      // Fallback for browsers without File System Access API or restricted iframe
      if (!auto) {
         const blob = new Blob([JSON.stringify({ root: data, lastSaved: Date.now() }, null, 2)], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `mindmap-todo-${new Date().toISOString().slice(0,10)}.json`;
         a.click();
         URL.revokeObjectURL(url);
         setLastSaved(Date.now());
         setIsDirty(false);
      }
    }
  };

  const loadFile = async () => {
    try {
      // @ts-ignore
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'MindMap JSON', accept: { 'application/json': ['.json'] } }],
      });
      const file = await handle.getFile();
      const text = await file.text();
      const content: FileData = JSON.parse(text);
      onLoad(content.root);
      setFileHandle(handle);
      setLastSaved(content.lastSaved);
      setIsDirty(false);
    } catch (err) {
      console.error('Load failed or cancelled', err);
      // If native picker fails, we could implement a file input fallback, 
      // but for now we assume modern browser or just log error.
      if ((err as Error).name !== 'AbortError') {
          alert("Could not open file picker. Please try dragging a file (not implemented yet) or ensure browser permissions.");
      }
    }
  };

  return { saveFile, loadFile, lastSaved, isDirty, fileHandle };
};

export default function App() {
  const [root, setRoot] = useState<MindNode>(() => loadInitialData());
  const [selectedId, setSelectedId] = useState<string | null>(() => loadInitialData().id);
  const [baseFilter, setBaseFilter] = useState<'all' | 'today' | 'overdue' | 'planned' | TaskStatus>('all');
  const [priorityFilters, setPriorityFilters] = useState<Set<'important' | 'urgent'>>(new Set());
  const [filteredIds, setFilteredIds] = useState<Set<string>>(new Set());
  const prevSelectedIdRef = useRef<string | null>(selectedId);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [hideUnmatched, setHideUnmatched] = useState(false);
  const [isLocked, setIsLocked] = useState(true); // 默认锁定

  // Auto-save to localStorage whenever root changes
  useEffect(() => {
    try {
      const data: FileData = {
        root,
        lastSaved: Date.now()
      };
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      console.log('Auto-saved to localStorage');
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }, [root]);

  // Load persistence logic
  const { saveFile, loadFile, lastSaved, isDirty, fileHandle } = useFileSystem(root, (newRoot) => {
    setRoot(newRoot);
    setSelectedId(newRoot.id);
  });

  // Derived state for selected node
  const selectedNode = selectedId ? findNode(root, selectedId) : null;

  // Auto-cleanup empty nodes on selection change
  useEffect(() => {
    const prevId = prevSelectedIdRef.current;
    if (prevId && prevId !== selectedId) {
        setRoot(currentRoot => {
             // Find the previous node
             const prevNode = findNode(currentRoot, prevId);
             
             // Check if it exists, is not root, is empty, and has no children
             // We use trim() to treat whitespace as empty
             if (prevNode && prevNode.id !== currentRoot.id && (!prevNode.text || prevNode.text.trim() === '') && prevNode.children.length === 0) {
                 return deleteNodeFromTree(currentRoot, prevId);
             }
             return currentRoot;
        });
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId]);


  // Compute filters with new multi-select logic
  useEffect(() => {
    const allNodes = flattenTree(root);
    const matches = new Set<string>();

    // First pass: find direct matches using new filter state
    allNodes.forEach(node => {
      if (matchesFilterState(node, baseFilter, priorityFilters)) {
        matches.add(node.id);
        // Also add all ancestors to ensure visibility
        let curr = findParent(root, node.id);
        while(curr) {
          matches.add(curr.id);
          curr = findParent(root, curr.id);
        }
      }
    });
    setFilteredIds(matches);
  }, [root, baseFilter, priorityFilters]);

  // Actions
  const handleUpdateNode = useCallback((updates: Partial<MindNode>) => {
    if (!selectedId) return;
    setRoot(prev => updateNodeInTree(prev, selectedId, updates));
  }, [selectedId]);
  
  // Specific handler for Canvas updates (passing ID explicitly)
  const handleUpdateNodeById = useCallback((id: string, updates: Partial<MindNode>) => {
    setRoot(prev => updateNodeInTree(prev, id, updates));
  }, []);

  const handleToggleExpand = useCallback((id: string, expanded: boolean) => {
    setRoot(prev => updateNodeInTree(prev, id, { isExpanded: expanded }));
  }, []);

  const handleAddChild = useCallback(() => {
    if (!selectedId) return;
    
    const newNode = createNode(''); // Empty text
    setRoot(prev => addChildNode(prev, selectedId, newNode));
    // Auto expand parent and select new child
    setTimeout(() => {
        handleToggleExpand(selectedId, true);
        setSelectedId(newNode.id);
    }, 50);
  }, [selectedId, handleToggleExpand]);

  const handleAddSibling = useCallback(() => {
     if (!selectedId || selectedId === root.id) return; // Cannot add sibling to root
     
     // Prevent adding sibling if current node is empty
     const currentNode = findNode(root, selectedId);
     if (currentNode && (!currentNode.text || currentNode.text.trim() === '')) {
         return;
     }

     const parent = findParent(root, selectedId);
     if (parent) {
         const newNode = createNode(''); // Empty text
         setRoot(prev => addSiblingNode(prev, selectedId, newNode));
         setTimeout(() => setSelectedId(newNode.id), 50);
     }
  }, [selectedId, root]);

  const handleDelete = useCallback(() => {
    if (!selectedId || selectedId === root.id) return;
    const nodeToDelete = findNode(root, selectedId);
    if (!nodeToDelete) return;
    
    if (nodeToDelete.children.length > 0) {
        if (!confirm(`Delete "${nodeToDelete.text || 'Untitled'}" and its ${nodeToDelete.children.length} children?`)) {
            return;
        }
    }
    
    const parent = findParent(root, selectedId);
    setRoot(prev => deleteNodeFromTree(prev, selectedId));
    if (parent) setSelectedId(parent.id);
    else setSelectedId(null);
  }, [selectedId, root]);

  const handleMove = useCallback((direction: 'up' | 'down') => {
      if (!selectedId || selectedId === root.id) return;
      const parent = findParent(root, selectedId);
      if (parent) {
          setRoot(prev => moveNodeInTree(prev, selectedId, direction));
      }
  }, [selectedId, root]);

  // Drag and drop handler
  const handleNodeDrop = useCallback((draggedNodeId: string, targetNodeId: string, insertIndex?: number) => {
      if (draggedNodeId === root.id) return; // Cannot drag root
      setRoot(prev => moveNodeToNewParent(prev, draggedNodeId, targetNodeId, insertIndex));
  }, [root.id]);

  // Clear all data and reset to initial
  const handleClearData = useCallback(() => {
    const userInput = prompt(
      '这将永久删除您的所有数据!\n\n' +
      '输入 "reset" (不含引号) 以确认:'
    );

    if (userInput === 'reset') {
      localStorage.removeItem(LOCALSTORAGE_KEY);
      setRoot(INITIAL_DATA);
      setSelectedId(INITIAL_DATA.id);
      console.log('数据已清除并重置为初始状态');
      alert('所有数据已重置为初始状态。');
    } else if (userInput !== null) {
      // User entered something but it wasn't "reset"
      alert('重置已取消。您必须准确输入 "reset" 以确认。');
    }
    // If userInput is null, user clicked Cancel, do nothing
  }, []);

  // Keyboard Shortcuts (Global)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            saveFile();
            return;
        }

        switch (e.key) {
            case 'Tab':
                e.preventDefault();
                handleAddChild();
                break;
            case 'Enter':
                e.preventDefault();
                handleAddSibling();
                break;
            case 'Backspace':
            case 'Delete':
                handleDelete();
                break;
            case 'ArrowUp':
                if (e.altKey) {
                    e.preventDefault();
                    handleMove('up');
                }
                break;
            case 'ArrowDown':
                if (e.altKey) {
                    e.preventDefault();
                    handleMove('down');
                }
                break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAddChild, handleAddSibling, handleDelete, handleMove, saveFile]);


  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* Left Sidebar: Outline */}
      <SidebarLeft
        root={root}
        selectedId={selectedId}
        onSelect={setSelectedId}
        baseFilter={baseFilter}
        priorityFilters={priorityFilters}
        onSetBaseFilter={(filter) => {
          setBaseFilter(filter);
          // 切换基础筛选时，清除优先级筛选
          setPriorityFilters(new Set());
        }}
        onTogglePriorityFilter={(priority) => {
          setPriorityFilters(prev => {
            const next = new Set(prev);
            if (next.has(priority)) {
              next.delete(priority);
            } else {
              next.add(priority);
            }
            return next;
          });
        }}
        hideUnmatched={hideUnmatched}
        onToggleHideUnmatched={() => setHideUnmatched(!hideUnmatched)}
      />

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Toolbar */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
                onClick={loadFile}
                className="flex items-center gap-2 bg-white px-3 py-2 rounded shadow text-sm font-medium hover:bg-slate-50 text-slate-700"
            >
                <FolderOpen size={16} /> 打开
            </button>
            <button
                onClick={() => saveFile()}
                className={`flex items-center gap-2 px-3 py-2 rounded shadow text-sm font-medium text-white transition-colors ${isDirty ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-400'}`}
            >
                {fileHandle ? <Save size={16} /> : <Download size={16} />}
                {fileHandle ? '保存' : '导出'}
            </button>
            <button
                onClick={handleClearData}
                className="flex items-center justify-center bg-white p-2 rounded shadow text-sm font-medium hover:bg-red-50 text-red-600 border border-red-200 transition-colors"
                title="重置所有数据(需要确认)"
            >
                <RefreshCw size={16} />
            </button>
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 z-50 bg-white/80 backdrop-blur px-3 py-1 rounded text-xs text-slate-600 shadow-sm flex items-center gap-2">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
           已自动保存到浏览器
        </div>

        {/* Lock/Unlock Button */}
        <div className="absolute bottom-4 right-4 z-50">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center gap-2 px-3 py-2 rounded shadow text-sm font-medium transition-colors ${
              isLocked
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
            title={isLocked ? '点击解锁以编辑' : '点击锁定以防止编辑'}
          >
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            {isLocked ? '已锁定' : '已解锁'}
          </button>
        </div>

        <MindMapCanvas
            root={root}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleExpand={handleToggleExpand}
            filterMode={baseFilter !== 'all' || priorityFilters.size > 0}
            filteredIds={filteredIds}
            hideUnmatched={hideUnmatched}
            onUpdateNode={handleUpdateNodeById}
            onAddSibling={handleAddSibling}
            onAddChild={handleAddChild}
            onDelete={handleDelete}
            onMove={handleMove}
            onNodeDrop={handleNodeDrop}
            isLocked={isLocked}
        />
      </div>

      {/* Right Sidebar: Properties */}
      <SidebarRight
        node={selectedNode}
        onUpdate={handleUpdateNode}
        onDelete={handleDelete}
        onAddChild={handleAddChild}
        onAddSibling={handleAddSibling}
        onMove={handleMove}
        isOpen={isRightSidebarOpen}
        onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        isLocked={isLocked}
      />
    </div>
  );
}