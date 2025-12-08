import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MindNode, TaskStatus } from '../types';
import { STATUS_CONFIG, PRIORITY_BADGE_CONFIG } from '../constants';
import { ChevronRight, ChevronDown, GripVertical, Square, CheckSquare, Maximize2 } from 'lucide-react';
import { ContextMenu } from './ContextMenu';

interface MindMapCanvasProps {
  root: MindNode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggleExpand: (id: string, expanded: boolean) => void;
  filterMode: boolean;
  filteredIds: Set<string>;
  hideUnmatched: boolean;
  onUpdateNode: (id: string, updates: Partial<MindNode>) => void;
  onAddSibling: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onNodeDrop: (draggedNodeId: string, targetNodeId: string, insertIndex?: number) => void;
  isLocked: boolean;
  newlyCreatedNodeId: string | null;
  onClearNewlyCreated: () => void;
  onResetViewRef?: React.MutableRefObject<(() => void) | null>;
  baseFilter?: 'all' | 'today' | 'overdue' | 'planned' | TaskStatus;
  priorityFilters?: Set<'important' | 'urgent' | 'both'>;
}

// A recursive component to render the tree horizontally with orthogonal lines
const TreeNode: React.FC<{
  node: MindNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string, expanded: boolean) => void;
  isFilteredMatch: boolean;
  filterActive: boolean;
  filteredIds: Set<string>;
  hideUnmatched: boolean;
  onUpdateNode: (id: string, updates: Partial<MindNode>) => void;
  onAddSibling: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onMove: (dir: 'up' | 'down') => void;
  onDragStart: (nodeId: string, e: React.DragEvent) => void;
  onDragOver: (nodeId: string, e: React.DragEvent) => void;
  onDrop: (nodeId: string, e: React.DragEvent) => void;
  onDragEnd: () => void;
  dragOverNodeId: string | null;
  isRoot: boolean;
  draggedNodeId: string | null;
  onShowContextMenu: (nodeId: string, x: number, y: number) => void;
  isLocked: boolean;
  newlyCreatedNodeId: string | null;
  onClearNewlyCreated: () => void;
}> = ({ node, selectedId, onSelect, onToggleExpand, isFilteredMatch, filterActive, filteredIds, hideUnmatched, onUpdateNode, onAddSibling, onAddChild, onDelete, onMove, onDragStart, onDragOver, onDrop, onDragEnd, dragOverNodeId, isRoot, draggedNodeId, onShowContextMenu, isLocked, newlyCreatedNodeId, onClearNewlyCreated }) => {
  const isSelected = node.id === selectedId;
  const statusStyle = STATUS_CONFIG[node.status];
  const inputRef = useRef<HTMLInputElement>(null);
  const isDragOver = dragOverNodeId === node.id;
  const isDragging = draggedNodeId === node.id;
  const [isEditing, setIsEditing] = useState(false);
  const isNewlyCreated = node.id === newlyCreatedNodeId;
  const [isComposing, setIsComposing] = useState(false); // 跟踪输入法组合状态

  const opacityClass = filterActive && !isFilteredMatch ? 'opacity-30 grayscale' : 'opacity-100';

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Reset editing state when node is deselected
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
    }
  }, [isSelected]);

  // Auto-enter edit mode for newly created nodes
  useEffect(() => {
    if (isNewlyCreated && isSelected && !isLocked) {
      setIsEditing(true);
      onClearNewlyCreated(); // Clear the flag after entering edit mode
    }
  }, [isNewlyCreated, isSelected, isLocked, onClearNewlyCreated]);

  // If hideUnmatched is true and this node doesn't match, don't render it
  // This check must come AFTER all hooks
  if (hideUnmatched && filterActive && !isFilteredMatch) {
    return null;
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 如果正在使用输入法组合输入，不处理快捷键
    if (isComposing) {
      return;
    }

    // Shortcuts inside the edit input
    if (e.key === 'Enter') {
        e.preventDefault();
        setIsEditing(false);
        onAddSibling();
    } else if (e.key === 'Tab') {
        e.preventDefault();
        setIsEditing(false);
        onAddChild();
    } else if (e.key === 'Delete' && e.ctrlKey) {
        // Ctrl+Delete to delete node while editing
        e.preventDefault();
        onDelete();
    } else if (e.key === 'Escape') {
        // Escape to exit edit mode
        e.preventDefault();
        setIsEditing(false);
        inputRef.current?.blur();
    }
  };

  return (
    <div className={`flex flex-row items-center ${opacityClass} transition-all duration-300 tree-node-container`}>
      {/* Node Content */}
      <div className="flex flex-col items-start relative z-10 group my-2">
        {/* Drag drop zone wrapper with larger hit area */}
        <div
          onDragOver={(e) => onDragOver(node.id, e)}
          onDrop={(e) => onDrop(node.id, e)}
          className="p-3 -m-3"
        >
          <div
            draggable={!isRoot && !isLocked}
            onDragStart={(e) => !isRoot && !isLocked && onDragStart(node.id, e)}
            onDragEnd={onDragEnd}
            onClick={(e) => {
              e.stopPropagation();
              if (isSelected && !isLocked) {
                // Second click: enter edit mode
                setIsEditing(true);
              } else {
                // First click: select node
                onSelect(node.id);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isLocked) {
                onShowContextMenu(node.id, e.clientX, e.clientY);
              }
            }}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 shadow-sm cursor-pointer transition-all
              ${node.status === TaskStatus.DONE ? 'bg-slate-100 border-slate-300 text-slate-400' : `bg-white ${statusStyle.color}`}
              ${isSelected ? 'ring-1 ring-indigo-500' : 'hover:shadow-md'}
              ${isDragOver ? 'ring-2 ring-green-500 bg-green-50' : ''}
              ${isDragging ? 'opacity-50' : ''}
              min-w-[120px] max-w-[400px]
            `}
          >
          {/* Drag Handle - Only show for non-root nodes */}
          {!isRoot && (
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
              <GripVertical size={16} className="text-slate-400" />
            </div>
          )}

          {/* Priority Badges - Show important and urgent badges */}
          <div className="absolute -top-2 -left-2 flex gap-1">
            {node.isImportant && (
              <div className={`bg-white rounded-full p-0.5 shadow-sm border ${PRIORITY_BADGE_CONFIG.important.color}`}>
                {PRIORITY_BADGE_CONFIG.important.icon}
              </div>
            )}
            {node.isUrgent && (
              <div className={`bg-white rounded-full p-0.5 shadow-sm border ${PRIORITY_BADGE_CONFIG.urgent.color}`}>
                {PRIORITY_BADGE_CONFIG.urgent.icon}
              </div>
            )}
          </div>

          {/* Checkbox for non-IDEA status */}
          {node.status !== TaskStatus.IDEA && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (node.status === TaskStatus.DONE) {
                  // If already done, revert to previous status (TODO)
                  onUpdateNode(node.id, { status: TaskStatus.TODO });
                } else {
                  // Mark as done
                  onUpdateNode(node.id, { status: TaskStatus.DONE });
                }
              }}
              className="flex-shrink-0 hover:scale-110 transition-transform"
            >
              {node.status === TaskStatus.DONE ? (
                <CheckSquare size={18} className="text-slate-400" />
              ) : (
                <Square size={18} className="text-slate-400" />
              )}
            </button>
          )}

          <div className="flex flex-col w-full min-w-0">
            {/* Auto-growing Input Container */}
            <div className="relative min-w-[80px]">
                {/* Invisible Span to determine width */}
                <span className="invisible whitespace-pre font-medium text-sm px-1">
                    {node.text || '输入任务...'}
                </span>

                {isEditing && !isLocked ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={node.text}
                        onChange={(e) => onUpdateNode(node.id, { text: e.target.value })}
                        onKeyDown={handleKeyDown}
                        onBlur={() => setIsEditing(false)}
                        onCompositionStart={() => setIsComposing(true)}
                        onCompositionEnd={() => setIsComposing(false)}
                        className={`absolute inset-0 w-full bg-transparent border-none outline-none font-medium text-sm p-0 m-0 text-inherit placeholder-slate-400/70 px-1 ${node.status === TaskStatus.DONE ? 'line-through' : ''}`}
                        placeholder="输入任务..."
                    />
                ) : (
                    <span className={`absolute inset-0 font-medium text-sm select-none px-1 overflow-hidden text-ellipsis whitespace-nowrap ${node.status === TaskStatus.DONE ? 'line-through' : ''}`}>
                        {node.text || ''}
                    </span>
                )}
            </div>

            {node.dueDate && (
              <span className="text-[10px] opacity-70 flex items-center gap-1 px-1 mt-0.5">
                📅 {node.dueDate}
              </span>
            )}
          </div>

          {/* Expander Toggle */}
          {node.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(node.id, !node.isExpanded);
              }}
              className="ml-2 p-1 hover:bg-black/10 rounded-full"
            >
              {node.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Children & Connectors */}
      {node.isExpanded && node.children.length > 0 && (() => {
        // Filter children based on hideUnmatched setting
        const visibleChildren = hideUnmatched && filterActive
          ? node.children.filter(child => filteredIds.has(child.id))
          : node.children;

        // Don't render connector container if no visible children
        if (visibleChildren.length === 0) return null;

        return (
          <div className="flex flex-row items-center">
             {/* 1. Horizontal Link leaving the parent node */}
             <div className="w-8 h-0.5 bg-slate-300"></div>

             {/* 2. Container for children */}
             <div className="flex flex-col">
               {visibleChildren.map((child, index) => {
                  const isFirst = index === 0;
                  const isLast = index === visibleChildren.length - 1;
                  const isSingle = visibleChildren.length === 1;

                  return (
                     <div key={child.id} className="flex flex-row items-center relative">
                         {/* Vertical Line Segment (The Spine) */}
                         {/* Only needed if more than 1 child to connect them vertically */}
                         {!isSingle && (
                            <div
                               className="absolute left-0 w-0.5 bg-slate-300"
                               style={{
                                  // First child: starts at center (50%), goes down.
                                  // Last child: starts at top (0), goes to center (50%).
                                  // Middle child: goes full height (0 to 100%).
                                  top: isFirst ? '50%' : '0',
                                  height: isFirst || isLast ? '50%' : '100%'
                               }}
                            />
                         )}

                         {/* Connector from Spine to Child */}
                         <div className="w-8 h-0.5 bg-slate-300"></div>

                         {/* Recursive Child Node */}
                         <TreeNode
                            node={child}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onToggleExpand={onToggleExpand}
                            filteredIds={filteredIds}
                            isFilteredMatch={filteredIds.has(child.id)}
                            filterActive={filterActive}
                            hideUnmatched={hideUnmatched}
                            onUpdateNode={onUpdateNode}
                            onAddSibling={onAddSibling}
                            onAddChild={onAddChild}
                            onDelete={onDelete}
                            onMove={onMove}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            onDragEnd={onDragEnd}
                            dragOverNodeId={dragOverNodeId}
                            draggedNodeId={draggedNodeId}
                            isRoot={false}
                            isLocked={isLocked}
                            onShowContextMenu={onShowContextMenu}
                            newlyCreatedNodeId={newlyCreatedNodeId}
                            onClearNewlyCreated={onClearNewlyCreated}
                         />
                     </div>
                  );
               })}
             </div>
          </div>
        );
      })()}
    </div>
  );
};

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({ root, selectedId, onSelect, onToggleExpand, filterMode, filteredIds, hideUnmatched, onUpdateNode, onAddSibling, onAddChild, onDelete, onMove, onNodeDrop, isLocked, newlyCreatedNodeId, onClearNewlyCreated, onResetViewRef, baseFilter, priorityFilters }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Use refs to store latest scale and position for handleResetView
  const scaleRef = useRef(scale);
  const positionRef = useRef(position);

  // Update refs whenever state changes
  useEffect(() => {
    scaleRef.current = scale;
    positionRef.current = position;
  }, [scale, position]);

  // Drag and drop state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const draggedElementRef = useRef<HTMLElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom directly with wheel, no ctrl key needed
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const s = Math.exp(-e.deltaY * 0.001);
    const newScale = Math.min(Math.max(0.2, scale * s), 3);

    // The content has a base offset of (50, 300)
    const baseOffsetX = 50;
    const baseOffsetY = 300;

    // Calculate the point in content space (before scale)
    const contentX = (mouseX - position.x - baseOffsetX) / scale;
    const contentY = (mouseY - position.y - baseOffsetY) / scale;

    // Calculate new position to keep the content point under the mouse
    const newX = mouseX - contentX * newScale - baseOffsetX;
    const newY = mouseY - contentY * newScale - baseOffsetY;

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
     // Check for Right Click (button 2) for dragging
     if (e.button === 2) {
         isDragging.current = true;
         lastPos.current = { x: e.clientX, y: e.clientY };
         if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
     }
     // Check for Left Click (button 0) on background to deselect
     // Check if click target is the container or the transformed content wrapper (not a node)
     else if (e.button === 0) {
         const target = e.target as HTMLElement;
         // If clicked on container or the transformed wrapper div, deselect
         if (target === containerRef.current || target.classList.contains('canvas-content-wrapper')) {
             onSelect(null);
         }
     }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (containerRef.current) containerRef.current.style.cursor = 'default';
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default context menu to allow right-click drag
  };

  // Drag and drop handlers
  const handleDragStart = (nodeId: string, e: React.DragEvent) => {
    setDraggedNodeId(nodeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nodeId);

    // Create a proper drag image that maintains size
    if (e.currentTarget instanceof HTMLElement) {
      const original = e.currentTarget;
      const dragImage = original.cloneNode(true) as HTMLElement;

      // Copy computed styles to maintain exact appearance
      const rect = original.getBoundingClientRect();
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-9999px';
      dragImage.style.left = '-9999px';
      dragImage.style.width = `${rect.width}px`;
      dragImage.style.height = `${rect.height}px`;
      dragImage.style.opacity = '0.7';
      dragImage.style.pointerEvents = 'none';

      document.body.appendChild(dragImage);

      // Set drag image with proper offset
      e.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2);

      // Clean up after drag starts
      setTimeout(() => {
        if (dragImage.parentNode) {
          document.body.removeChild(dragImage);
        }
      }, 0);
    }
  };

  const handleDragOver = (nodeId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedNodeId && draggedNodeId !== nodeId) {
      setDragOverNodeId(nodeId);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (targetNodeId: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceNodeId = e.dataTransfer.getData('text/plain') || draggedNodeId;

    if (sourceNodeId && sourceNodeId !== targetNodeId) {
      // Drop the node as a child of the target
      onNodeDrop(sourceNodeId, targetNodeId);
    }

    setDraggedNodeId(null);
    setDragOverNodeId(null);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
    setDragOverNodeId(null);
  };

  // Context menu handlers
  const handleShowContextMenu = (nodeId: string, x: number, y: number) => {
    setContextMenu({ nodeId, x, y });
    onSelect(nodeId);
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Reset view to center and fit all visible nodes in viewport
  const handleResetView = useCallback(() => {
    if (!containerRef.current || !contentWrapperRef.current) return;

    const container = containerRef.current;
    const contentWrapper = contentWrapperRef.current;
    const containerRect = container.getBoundingClientRect();

    // Get all tree node elements that are currently visible (not hidden by filter)
    const allTreeNodes = contentWrapper.querySelectorAll('.tree-node-container');

    // Filter to only visible nodes (ones that are not opacity-30 or hidden)
    const visibleNodes = Array.from(allTreeNodes).filter(node => {
      const computedStyle = window.getComputedStyle(node);
      const display = computedStyle.display;
      const visibility = computedStyle.visibility;
      const opacity = parseFloat(computedStyle.opacity);

      // If hideUnmatched is true and filterMode is active, only include nodes with full opacity
      if (hideUnmatched && filterMode) {
        return display !== 'none' && visibility !== 'hidden' && opacity > 0.5;
      }
      // Otherwise include all visible nodes
      return display !== 'none' && visibility !== 'hidden';
    });

    if (visibleNodes.length === 0) return;

    console.log('Resetting view, found', visibleNodes.length, 'visible nodes out of', allTreeNodes.length, 'total');

    // Calculate bounds in ORIGINAL (unscaled) space
    // We need to convert from screen coordinates back to original content coordinates
    const baseOffsetX = 50;
    const baseOffsetY = 300;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Get current scale and position from refs to ensure we always get the latest values
    // This avoids adding scale/position to the dependency array which would cause infinite loops
    const currentScale = scaleRef.current;
    const currentPosition = positionRef.current;

    visibleNodes.forEach(node => {
      const rect = node.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Get screen coordinates relative to container
      const screenX = rect.left - containerRect.left;
      const screenY = rect.top - containerRect.top;
      const screenRight = screenX + rect.width;
      const screenBottom = screenY + rect.height;

      // Convert from screen space back to ORIGINAL content space
      // Screen formula: screenPos = (contentPos * scale) + (position + baseOffset)
      // Reverse: contentPos = (screenPos - (position + baseOffset)) / scale
      const contentLeft = (screenX - currentPosition.x - baseOffsetX) / currentScale;
      const contentTop = (screenY - currentPosition.y - baseOffsetY) / currentScale;
      const contentRight = (screenRight - currentPosition.x - baseOffsetX) / currentScale;
      const contentBottom = (screenBottom - currentPosition.y - baseOffsetY) / currentScale;

      minX = Math.min(minX, contentLeft);
      minY = Math.min(minY, contentTop);
      maxX = Math.max(maxX, contentRight);
      maxY = Math.max(maxY, contentBottom);
    });

    // Calculate tree dimensions in ORIGINAL space
    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;
    const treeCenterX = minX + treeWidth / 2;
    const treeCenterY = minY + treeHeight / 2;

    // Calculate viewport dimensions with padding
    const viewportWidth = containerRect.width;
    const viewportHeight = containerRect.height;
    const padding = 60; // 60px padding on each side

    // Calculate required scale to fit tree in viewport
    // treeWidth * newScale should be <= viewportWidth - 2*padding
    const scaleX = (viewportWidth - padding * 2) / treeWidth;
    const scaleY = (viewportHeight - padding * 2) / treeHeight;
    let newScale = Math.min(scaleX, scaleY);

    // Clamp scale between reasonable limits (0.1x to 3x)
    newScale = Math.max(0.1, Math.min(3, newScale));

    // Calculate position to center the tree
    // We want: (treeCenterX * newScale) to be at viewport center
    // But remember the transform includes +50 and +300 offsets
    const viewportCenterX = viewportWidth / 2;
    const viewportCenterY = viewportHeight / 2;

    // The transform is: translate(x + 50, y + 300) scale(newScale)
    // For a point P in original space, its transformed position is:
    // P' = (P * newScale) + (x + 50, y + 300)
    // We want treeCenter to map to viewportCenter:
    // viewportCenter = (treeCenter * newScale) + (x + 50, y + 300)
    // So: x = viewportCenterX - 50 - treeCenterX * newScale
    //     y = viewportCenterY - 300 - treeCenterY * newScale
    const targetX = viewportCenterX - 50 - treeCenterX * newScale;
    const targetY = viewportCenterY - 300 - treeCenterY * newScale;

    // Log calculations for debugging
    console.log('Tree bounds:', { minX, minY, maxX, maxY, treeWidth, treeHeight });
    console.log('Viewport:', { viewportWidth, viewportHeight });
    console.log('Calculated scale:', newScale, 'target position:', { targetX, targetY });

    // Apply new scale and position
    setScale(newScale);
    setPosition({
      x: targetX,
      y: targetY
    });
  }, [hideUnmatched, filterMode]);

  // Expose handleResetView to parent component via ref
  useEffect(() => {
    if (onResetViewRef) {
      onResetViewRef.current = handleResetView;
    }
  }, [onResetViewRef, handleResetView]);

  // Create a stable string representation of priority filters for dependency tracking
  const priorityFiltersKey = priorityFilters ? Array.from(priorityFilters).sort().join(',') : '';

  // Auto-fit view when filter conditions change (not when nodes are added/deleted)
  useEffect(() => {
    // Trigger reset view when filters change
    // Wait a bit for DOM to update
    const timeoutId = setTimeout(() => {
      handleResetView();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filterMode, hideUnmatched, baseFilter, priorityFiltersKey, handleResetView]);

  return (
    <div
      className="flex-1 overflow-hidden bg-slate-50 relative select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      ref={containerRef}
    >

      <div
        style={{
          transform: `translate(${position.x + 50}px, ${position.y + 300}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: isDragging.current ? 'none' : 'transform 0.1s ease-out'
        }}
        className="absolute top-0 left-0 p-20 canvas-content-wrapper"
        ref={contentWrapperRef}
      >
        <TreeNode
          node={root}
          selectedId={selectedId}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          isFilteredMatch={filteredIds.has(root.id)}
          filterActive={filterMode}
          filteredIds={filteredIds}
          hideUnmatched={hideUnmatched}
          onUpdateNode={onUpdateNode}
          onAddSibling={onAddSibling}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onMove={onMove}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          dragOverNodeId={dragOverNodeId}
          draggedNodeId={draggedNodeId}
          isRoot={true}
          isLocked={isLocked}
          onShowContextMenu={handleShowContextMenu}
          newlyCreatedNodeId={newlyCreatedNodeId}
          onClearNewlyCreated={onClearNewlyCreated}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (() => {
        const node = root && findNode(root, contextMenu.nodeId);
        if (!node) return null;

        return (
          <ContextMenu
            node={node}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onClose={handleCloseContextMenu}
            onUpdate={(updates) => {
              onUpdateNode(contextMenu.nodeId, updates);
            }}
            onDelete={onDelete}
            onAddChild={onAddChild}
            onAddSibling={onAddSibling}
            onMove={onMove}
            isRoot={contextMenu.nodeId === root.id}
            isLocked={isLocked}
          />
        );
      })()}
    </div>
  );
};

// Helper function to find node
const findNode = (root: MindNode, nodeId: string): MindNode | null => {
  if (root.id === nodeId) return root;
  for (const child of root.children) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return null;
};
