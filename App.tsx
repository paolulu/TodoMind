import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SidebarLeft } from './components/SidebarLeft';
import { SidebarRight } from './components/SidebarRight';
import { MindMapCanvas } from './components/MindMapCanvas';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { MindNode, FilterType, TaskStatus, FileData } from './types';
import { createNode, findNode, updateNodeInTree, addChildNode, addSiblingNode, deleteNodeFromTree, findParent, flattenTree, matchesFilter, matchesFilterState, moveNodeInTree, moveNodeToNewParent } from './utils';
import { Save, FolderOpen, Download, RefreshCw, Lock, Unlock, Maximize2, Sun, Moon, Clock, Copy, ChevronDown, Calendar } from 'lucide-react';
import { saveFileHandle, loadFileHandle, clearFileHandle, getFileName } from './indexedDBHelper';
import { saveVersion } from './versionManager';

const INITIAL_DATA: MindNode = {
  ...createNode('运营目标'),
  text: '公司运营',
  status: TaskStatus.IDEA,
  isImportant: true,
  isUrgent: true,
};

const LOCALSTORAGE_KEY = 'mindmap-todo-data';
const THEME_KEY = 'mindmap-theme';

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
  const [fileName, setFileName] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [lastFileModified, setLastFileModified] = useState<number>(0);
  const [showSyncNotification, setShowSyncNotification] = useState(false);

  // Helper function to get file display path
  // Note: Due to browser security, we cannot get the actual file system path
  // This function tries to extract any available path information
  const getFilePath = async (handle: FileSystemFileHandle): Promise<string | null> => {
    try {
      const file = await handle.getFile();

      // Try webkitRelativePath (only available for directory picker)
      if ((file as any).webkitRelativePath && (file as any).webkitRelativePath !== '') {
        return (file as any).webkitRelativePath;
      }

      // For security reasons, File System Access API doesn't expose full paths
      // Return null to indicate path is not available
      return null;
    } catch (err) {
      console.warn('Could not get file path:', err);
      return null;
    }
  };

  // Load file handle from IndexedDB on mount
  useEffect(() => {
    const restoreFileHandle = async () => {
      try {
        console.log('Attempting to restore file handle from IndexedDB...');
        const handle = await loadFileHandle();
        if (handle) {
          setFileHandle(handle);
          setFileName(handle.name);

          // Try to get full path and file info
          const path = await getFilePath(handle);
          setFilePath(path);

          console.log('✅ Successfully restored file handle:', handle.name);

          // Initialize file metadata
          try {
            const file = await handle.getFile();
            setLastFileModified(file.lastModified);
            setFileSize(file.size);
            console.log('📅 Initial file modified time:', new Date(file.lastModified).toLocaleString());
          } catch (err) {
            console.warn('Could not read initial file metadata:', err);
          }
        } else {
          console.log('⚠️ No file handle found in IndexedDB or permission denied');
        }
      } catch (err) {
        console.error('❌ Failed to restore file handle:', err);
      }
    };
    restoreFileHandle();
  }, []);

  // Auto-save every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (fileHandle && isDirty) {
        saveFile(true);
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fileHandle, isDirty, data]);

  // File polling: Check for external changes every 10 seconds
  useEffect(() => {
    if (!fileHandle) return;

    const checkForUpdates = async () => {
      try {
        const file = await fileHandle.getFile();
        const currentModified = file.lastModified;

        console.log('[Sync Check]', {
          lastFileModified: new Date(lastFileModified).toLocaleString(),
          currentModified: new Date(currentModified).toLocaleString(),
          lastSaved: new Date(lastSaved).toLocaleString(),
          isDirty,
          hasChange: currentModified > lastFileModified
        });

        // If file was modified externally (by another device/window)
        if (lastFileModified > 0 && currentModified > lastFileModified) {
          console.log('🔄 File modified externally detected!');
          console.log('   File lastModified:', new Date(lastFileModified).toLocaleString(), '→', new Date(currentModified).toLocaleString());
          console.log('   isDirty:', isDirty);

          // Always reload external changes for cross-device sync
          // If both devices are editing simultaneously, the most recent save wins
          const text = await file.text();
          const content: FileData = JSON.parse(text);

          console.log('   Local lastSaved:', new Date(lastSaved).toLocaleString());
          console.log('   External lastSaved:', new Date(content.lastSaved).toLocaleString());
          console.log('   Comparison:', content.lastSaved > lastSaved ? 'External is newer ✅' : 'Local is newer ⏸️');

          // Check if external change is newer than our last save
          if (content.lastSaved > lastSaved) {
            // 冲突检测：保存本地和远程两个版本
            console.log('🔄 检测到冲突，保存两个版本到历史记录');

            // 保存当前本地版本为冲突备份
            try {
              const currentLocalData = findNode({ id: 'temp', text: '', status: TaskStatus.IDEA, isImportant: false, isUrgent: false, children: [data], isExpanded: true, createdAt: Date.now() }, 'temp');
              if (currentLocalData) {
                await saveVersion(data, fileName || undefined, 'conflict-local');
                console.log('✅ 本地冲突版本已保存');
              }
            } catch (versionErr) {
              console.warn('⚠️ 保存本地冲突版本失败:', versionErr);
            }

            // 保存远程版本为冲突备份
            try {
              await saveVersion(content.root, fileName || undefined, 'conflict-remote');
              console.log('✅ 远程冲突版本已保存');
            } catch (versionErr) {
              console.warn('⚠️ 保存远程冲突版本失败:', versionErr);
            }

            // 加载远程版本
            onLoad(content.root);
            setLastFileModified(currentModified);
            setLastSaved(content.lastSaved);
            setIsDirty(false); // Reset dirty flag after loading

            // Show notification
            setShowSyncNotification(true);
            setTimeout(() => setShowSyncNotification(false), 3000);

            console.log('✅ Automatically reloaded file from external change (冲突已记录到版本历史)');
          } else {
            // Our local version is newer, just update the timestamp
            console.log('📌 External file modified but local version is newer, keeping local changes');
            setLastFileModified(currentModified);
          }
        }
      } catch (err) {
        console.error('Error checking for file updates:', err);
      }
    };

    // Check every 10 seconds
    const interval = setInterval(checkForUpdates, 10000);

    // Also check immediately on mount
    checkForUpdates();

    return () => clearInterval(interval);
  }, [fileHandle, lastFileModified, isDirty, onLoad]);

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
          setFileName(handle.name);

          // Get and set file path
          const path = await getFilePath(handle);
          setFilePath(path);

          // Save handle to IndexedDB for persistence
          console.log('💾 Saving file handle to IndexedDB:', handle.name);
          await saveFileHandle(handle);
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

        // Update file metadata after save
        try {
          const file = await handle.getFile();
          setLastFileModified(file.lastModified);
          setFileSize(file.size);
        } catch (err) {
          console.warn('Could not update file metadata after save:', err);
        }

        console.log('Saved successfully to:', handle.name);

        // 保存版本快照
        try {
          await saveVersion(data, handle.name, auto ? 'auto' : 'manual');
          console.log('✅ 版本快照已创建');
        } catch (versionErr) {
          console.warn('⚠️ 版本快照保存失败（不影响文件保存）:', versionErr);
        }
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
        a.download = `mindmap-todo-${new Date().toISOString().slice(0, 10)}.json`;
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
      setFileName(handle.name);

      // Get and set file path
      const path = await getFilePath(handle);
      setFilePath(path);

      setLastSaved(content.lastSaved);
      setIsDirty(false);
      setLastFileModified(file.lastModified);
      setFileSize(file.size);
      // Save handle to IndexedDB for persistence
      await saveFileHandle(handle);
      console.log('Loaded and saved handle for:', handle.name);
    } catch (err) {
      console.error('Load failed or cancelled', err);
      // If native picker fails, we could implement a file input fallback,
      // but for now we assume modern browser or just log error.
      if ((err as Error).name !== 'AbortError') {
        alert("Could not open file picker. Please try dragging a file (not implemented yet) or ensure browser permissions.");
      }
    }
  };

  // 另存为功能 - 强制弹出保存对话框
  const saveAsFile = async (suggestedName?: string) => {
    try {
      // @ts-ignore - File System Access API
      const handle = await window.showSaveFilePicker({
        types: [{ description: 'MindMap JSON', accept: { 'application/json': ['.json'] } }],
        suggestedName: suggestedName || `mindmap-todo-${new Date().toISOString().slice(0, 10)}.json`
      });

      // @ts-ignore
      const writable = await handle.createWritable();
      const content: FileData = { root: data, lastSaved: Date.now() };
      await writable.write(JSON.stringify(content, null, 2));
      await writable.close();

      // 更新文件句柄和状态
      setFileHandle(handle);
      setFileName(handle.name);
      setLastSaved(Date.now());
      setIsDirty(false);

      // 更新文件元数据
      try {
        const file = await handle.getFile();
        setLastFileModified(file.lastModified);
        setFileSize(file.size);
      } catch (err) {
        console.warn('Could not update file metadata after save:', err);
      }

      // 保存文件句柄到 IndexedDB
      await saveFileHandle(handle);

      // 保存版本快照
      try {
        await saveVersion(data, handle.name, 'manual');
        console.log('✅ 版本快照已创建');
      } catch (versionErr) {
        console.warn('⚠️ 版本快照保存失败（不影响文件保存）:', versionErr);
      }

      console.log('Saved as new file:', handle.name);
      return true;
    } catch (err) {
      console.error('Save as failed:', err);
      if ((err as Error).name === 'AbortError') {
        // 用户取消
        return false;
      }
      // 如果 File System API 不可用，降级到下载
      const blob = new Blob([JSON.stringify({ root: data, lastSaved: Date.now() }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName || `mindmap-todo-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }
  };

  // 快速另存为今日日期文件
  const quickSaveAsToday = async () => {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const suggestedName = `TodoMind-${today}.json`;
    await saveAsFile(suggestedName);
  };

  return { saveFile, saveAsFile, quickSaveAsToday, loadFile, lastSaved, isDirty, fileHandle, fileName, filePath, fileSize, lastFileModified, showSyncNotification };
};

export default function App() {
  const [root, setRoot] = useState<MindNode>(() => loadInitialData());
  const [selectedId, setSelectedId] = useState<string | null>(() => loadInitialData().id);
  const [baseFilter, setBaseFilter] = useState<'all' | 'today' | 'overdue' | 'planned' | TaskStatus>('all');
  const [priorityFilters, setPriorityFilters] = useState<Set<'important' | 'urgent' | 'both'>>(new Set());
  const [filteredIds, setFilteredIds] = useState<Set<string>>(new Set());
  const prevSelectedIdRef = useRef<string | null>(selectedId);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [hideUnmatched, setHideUnmatched] = useState(false);
  const [isLocked, setIsLocked] = useState(true); // 默认锁定
  const [newlyCreatedNodeId, setNewlyCreatedNodeId] = useState<string | null>(null); // 追踪新创建的节点
  const [showFileInfoModal, setShowFileInfoModal] = useState(false); // 文件信息模态框
  const [showLockToast, setShowLockToast] = useState(false); // 锁定状态提示
  const [lockToastMessage, setLockToastMessage] = useState(''); // 锁定提示消息
  const [showVersionHistory, setShowVersionHistory] = useState(false); // 版本历史模态框
  const [showSaveAsMenu, setShowSaveAsMenu] = useState(false); // 另存为下拉菜单
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // AI Settings modal
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return stored === 'dark';
    } catch {
      return false;
    }
  });

  // Ref for reset view function from MindMapCanvas
  const resetViewRef = useRef<(() => void) | null>(null);

  // Persist and apply theme
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.error('Failed to save theme:', err);
    }
  }, [isDarkMode]);

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
  const { saveFile, saveAsFile, quickSaveAsToday, loadFile, lastSaved, isDirty, fileHandle, fileName, filePath, fileSize, lastFileModified, showSyncNotification } = useFileSystem(root, (newRoot) => {
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


  // Calculate filter counts
  const filterCounts = React.useMemo(() => {
    const allNodes = flattenTree(root);

    return {
      all: allNodes.length,
      today: allNodes.filter(node => {
        if (!node.dueDate) return false;
        const today = new Date().toISOString().split('T')[0];
        return node.dueDate === today;
      }).length,
      overdue: allNodes.filter(node => {
        if (!node.dueDate) return false;
        const today = new Date().toISOString().split('T')[0];
        return node.dueDate < today && node.status !== TaskStatus.DONE;
      }).length,
      planned: allNodes.filter(node => {
        if (!node.dueDate) return false;
        const today = new Date().toISOString().split('T')[0];
        return node.dueDate > today;
      }).length,
      important: allNodes.filter(node => node.isImportant).length,
      urgent: allNodes.filter(node => node.isUrgent).length,
      both: allNodes.filter(node => node.isImportant && node.isUrgent).length,
    };
  }, [root]);

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
        while (curr) {
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

    setRoot(prevRoot => {
      const currentNode = findNode(prevRoot, selectedId);
      if (!currentNode) return prevRoot;

      const timestamp = Date.now();
      const historyItems: any[] = [];

      // Fields to track in history
      const trackableFields = ['status', 'isImportant', 'isUrgent', 'dueDate', 'text', 'note'];

      trackableFields.forEach(field => {
        if (field in updates) {
          const key = field as keyof MindNode;
          const newVal = updates[key];
          const oldVal = currentNode[key];

          if (newVal !== oldVal) {
            historyItems.push({
              timestamp,
              field,
              oldValue: String(oldVal),
              newValue: String(newVal)
            });
          }
        }
      });

      // Special handling for text/note: verify they actually changed, but don't spam history
      // We update 'updatedAt' for any change, but 'history' only for trackable fields
      const effectiveUpdates = {
        ...updates,
        updatedAt: timestamp,
        history: [...(currentNode.history || []), ...historyItems]
      };

      return updateNodeInTree(prevRoot, selectedId, effectiveUpdates);
    });
  }, [selectedId]);

  // Specific handler for Canvas updates (passing ID explicitly)
  const handleUpdateNodeById = useCallback((id: string, updates: Partial<MindNode>) => {
    setRoot(prevRoot => {
      const currentNode = findNode(prevRoot, id);
      if (!currentNode) return prevRoot;

      const timestamp = Date.now();
      const historyItems: any[] = [];
      const trackableFields = ['status', 'isImportant', 'isUrgent', 'dueDate', 'text', 'note'];

      trackableFields.forEach(field => {
        if (field in updates) {
          const key = field as keyof MindNode;
          const newVal = updates[key];
          const oldVal = currentNode[key];

          if (newVal !== oldVal) {
            historyItems.push({
              timestamp,
              field,
              oldValue: String(oldVal),
              newValue: String(newVal)
            });
          }
        }
      });

      const effectiveUpdates = {
        ...updates,
        updatedAt: timestamp,
        history: [...(currentNode.history || []), ...historyItems]
      };

      return updateNodeInTree(prevRoot, id, effectiveUpdates);
    });
  }, []);

  const handleToggleExpand = useCallback((id: string, expanded: boolean) => {
    setRoot(prev => updateNodeInTree(prev, id, { isExpanded: expanded }));
  }, []);

  const handleAddChild = useCallback(() => {
    if (!selectedId) return;

    const newNode = createNode(''); // Empty text
    setRoot(prev => addChildNode(prev, selectedId, newNode));
    setNewlyCreatedNodeId(newNode.id); // 标记为新创建的节点
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
      setNewlyCreatedNodeId(newNode.id); // 标记为新创建的节点
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

  // Handle lock toggle with toast notification
  const handleToggleLock = useCallback(() => {
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    setLockToastMessage(newLockState ? '已锁定' : '已解锁');
    setShowLockToast(true);
    setTimeout(() => setShowLockToast(false), 2000);
  }, [isLocked]);

  // Handle theme toggle
  const handleToggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  // Handle version restore
  const handleRestoreVersion = useCallback(async (versionData: MindNode) => {
    try {
      // 先保存当前状态为版本（以防恢复后想回到当前状态）
      await saveVersion(root, fileName || undefined, 'manual');
      console.log('✅ 恢复前已保存当前状态');

      // 恢复版本数据
      setRoot(versionData);
      setSelectedId(versionData.id);

      console.log('✅ 版本已恢复');
      alert('版本已恢复！当前状态已保存到版本历史中。');
    } catch (error) {
      console.error('❌ 恢复版本失败:', error);
      alert('恢复版本失败，请查看控制台了解详情');
    }
  }, [root, fileName]);

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

      // 筛选快捷键 - 只在没有选中节点时生效
      if (!selectedId) {
        switch (e.key) {
          case '0':
            e.preventDefault();
            setBaseFilter('all');
            setPriorityFilters(new Set());
            return;
          case '1':
            e.preventDefault();
            // 切换逻辑：如果当前是 overdue，返回 all；否则切换到 overdue
            setBaseFilter(prev => prev === 'overdue' ? 'all' : 'overdue');
            setPriorityFilters(new Set());
            setHideUnmatched(prev => baseFilter === 'overdue' ? prev : true);
            return;
          case '2':
            e.preventDefault();
            // 切换逻辑：如果当前是 today，返回 all；否则切换到 today
            setBaseFilter(prev => prev === 'today' ? 'all' : 'today');
            setPriorityFilters(new Set());
            setHideUnmatched(prev => baseFilter === 'today' ? prev : true);
            return;
          case '3':
            e.preventDefault();
            // 切换逻辑：如果当前是 planned，返回 all；否则切换到 planned
            setBaseFilter(prev => prev === 'planned' ? 'all' : 'planned');
            setPriorityFilters(new Set());
            setHideUnmatched(prev => baseFilter === 'planned' ? prev : true);
            return;
          case 'z':
          case 'Z':
            e.preventDefault();
            setBaseFilter('all');
            setPriorityFilters(prev => {
              const next = new Set(prev);
              if (next.has('important')) {
                next.delete('important');
              } else {
                next.add('important');
              }
              return next;
            });
            setHideUnmatched(true);
            return;
          case 'j':
          case 'J':
            e.preventDefault();
            setBaseFilter('all');
            setPriorityFilters(prev => {
              const next = new Set(prev);
              if (next.has('urgent')) {
                next.delete('urgent');
              } else {
                next.add('urgent');
              }
              return next;
            });
            setHideUnmatched(true);
            return;
          case 'q':
          case 'Q':
            e.preventDefault();
            setBaseFilter('all');
            setPriorityFilters(prev => {
              const next = new Set(prev);
              if (next.has('both')) {
                next.delete('both');
              } else {
                next.add('both');
              }
              return next;
            });
            setHideUnmatched(true);
            return;
        }
      }

      // 节点操作快捷键 - 只在有选中节点时生效
      if (selectedId) {
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, handleAddChild, handleAddSibling, handleDelete, handleMove, saveFile]);


  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">

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
          // 如果不是"全部"筛选，自动开启"仅显示筛选结果"
          if (filter !== 'all') {
            setHideUnmatched(true);
          }
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
          // 开启优先级筛选时，自动开启"仅显示筛选结果"
          setHideUnmatched(true);
        }}
        hideUnmatched={hideUnmatched}
        onToggleHideUnmatched={() => setHideUnmatched(!hideUnmatched)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onUpdateStatus={(nodeId, status) => handleUpdateNodeById(nodeId, { status })}
        filterCounts={filterCounts}
      />

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Toolbar */}
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <button
            onClick={loadFile}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded shadow text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
          >
            <FolderOpen size={16} /> 打开
          </button>
          <button
            onClick={() => saveFile()}
            className={`flex items-center gap-2 px-3 py-2 rounded shadow text-sm font-medium text-white transition-colors ${isDirty ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-400 dark:bg-slate-600'}`}
          >
            {fileHandle ? <Save size={16} /> : <Download size={16} />}
            {fileHandle ? '保存' : '导出'}
          </button>

          {/* 另存为按钮（带下拉菜单） */}
          <div className="relative">
            <button
              onClick={() => setShowSaveAsMenu(!showSaveAsMenu)}
              className="flex items-center gap-1 bg-white dark:bg-slate-800 px-3 py-2 rounded shadow text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
              title="另存为"
            >
              <Copy size={16} />
              另存为
              <ChevronDown size={14} />
            </button>

            {/* 下拉菜单 */}
            {showSaveAsMenu && (
              <>
                {/* 点击外部关闭菜单 */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSaveAsMenu(false)}
                />

                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                  <button
                    onClick={() => {
                      saveAsFile();
                      setShowSaveAsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                  >
                    <Copy size={16} />
                    <div>
                      <div className="font-medium">另存为...</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">自定义文件名</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      quickSaveAsToday();
                      setShowSaveAsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left border-t border-slate-200 dark:border-slate-700"
                  >
                    <Calendar size={16} />
                    <div>
                      <div className="font-medium">保存为今日</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        TodoMind-{new Date().toISOString().slice(0, 10)}.json
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setShowVersionHistory(true)}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded shadow text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            title="查看版本历史"
          >
            <Clock size={16} /> 历史
          </button>
          <button
            onClick={handleClearData}
            className="flex items-center justify-center bg-white dark:bg-slate-800 p-2 rounded shadow text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 transition-colors"
            title="重置所有数据(需要确认)"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Status Bar */}
        <div className="absolute bottom-4 left-4 z-50 bg-white/80 dark:bg-slate-800/80 backdrop-blur px-3 py-1 rounded text-xs text-slate-600 dark:text-slate-300 shadow-sm flex items-center gap-3 max-w-[600px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            已自动保存到浏览器
          </div>
          {fileName && (
            <div className="flex items-center gap-1 border-l border-slate-300 dark:border-slate-600 pl-3">
              <span className="text-slate-400 dark:text-slate-500">文件:</span>
              <button
                onClick={() => setShowFileInfoModal(true)}
                className="font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 truncate cursor-pointer transition-colors underline decoration-dotted underline-offset-2"
                title="点击查看文件详细信息"
              >
                {fileName}
              </button>
            </div>
          )}
        </div>

        {/* Sync Notification */}
        {showSyncNotification && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
            <RefreshCw size={16} className="animate-spin" />
            <span className="font-medium">检测到文件更新，已自动同步！</span>
          </div>
        )}

        {/* Bottom Right Controls */}
        <div className="absolute bottom-4 right-4 z-50 flex gap-2">
          {/* Reset View Button */}
          <button
            onClick={() => resetViewRef.current?.()}
            className="p-2 rounded-full shadow-lg transition-all hover:scale-110 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            title="重置视图到中心并适应视口"
          >
            <Maximize2 size={20} className="text-slate-600 dark:text-slate-300" />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-full shadow-lg transition-all hover:scale-110 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
            title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
          >
            {isDarkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-slate-600" />}
          </button>

          {/* Lock/Unlock Button */}
          <button
            onClick={handleToggleLock}
            className={`p-2 rounded-full shadow-lg transition-all hover:scale-110 ${isLocked
              ? 'bg-slate-600 hover:bg-slate-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            title={isLocked ? '点击解锁以编辑' : '点击锁定以防止编辑'}
          >
            {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
          </button>
        </div>

        {/* Lock Status Toast */}
        {showLockToast && (
          <div className="absolute bottom-20 right-4 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            <span className="font-medium">{lockToastMessage}</span>
          </div>
        )}

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
          newlyCreatedNodeId={newlyCreatedNodeId}
          onClearNewlyCreated={() => setNewlyCreatedNodeId(null)}
          onResetViewRef={resetViewRef}
          baseFilter={baseFilter}
          priorityFilters={priorityFilters}
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

      {/* File Info Modal */}
      {showFileInfoModal && fileName && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowFileInfoModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                📄 文件信息
              </h2>
              <button
                onClick={() => setShowFileInfoModal(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-700 dark:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">文件名</label>
                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium mt-1 break-all">{fileName}</p>
              </div>

              {filePath && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">路径</label>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-1 break-all font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded">{filePath}</p>
                </div>
              )}

              {!filePath && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    ⚠️ 由于浏览器安全限制，无法显示完整文件系统路径。<br />
                    文件通过 File System Access API 访问。
                  </p>
                </div>
              )}

              {lastFileModified > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">最后修改时间</label>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
                    {new Date(lastFileModified).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
              )}

              {fileSize > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">文件大小</label>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
                    {fileSize < 1024
                      ? `${fileSize} B`
                      : fileSize < 1024 * 1024
                        ? `${(fileSize / 1024).toFixed(2)} KB`
                        : `${(fileSize / (1024 * 1024)).toFixed(2)} MB`
                    }
                  </p>
                </div>
              )}

              {lastSaved && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">最后保存时间</label>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mt-1">
                    {new Date(lastSaved).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end">
              <button
                onClick={() => setShowFileInfoModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={handleRestoreVersion}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}