import React, { useRef, useEffect, useState } from 'react';
import { MindNode } from '../types';
import { STATUS_CONFIG, PRIORITY_BADGE_CONFIG } from '../constants';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';

interface MindMapCanvasProps {
  root: MindNode;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onToggleExpand: (id: string, expanded: boolean) => void;
  filterMode: boolean;
  filteredIds: Set<string>;
  onUpdateNode: (id: string, updates: Partial<MindNode>) => void;
  onAddSibling: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onNodeDrop: (draggedNodeId: string, targetNodeId: string, insertIndex?: number) => void;
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
  onUpdateNode: (id: string, updates: Partial<MindNode>) => void;
  onAddSibling: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onDragStart: (nodeId: string, e: React.DragEvent) => void;
  onDragOver: (nodeId: string, e: React.DragEvent) => void;
  onDrop: (nodeId: string, e: React.DragEvent) => void;
  onDragEnd: () => void;
  dragOverNodeId: string | null;
  isRoot: boolean;
  draggedNodeId: string | null;
}> = ({ node, selectedId, onSelect, onToggleExpand, isFilteredMatch, filterActive, filteredIds, onUpdateNode, onAddSibling, onAddChild, onDelete, onDragStart, onDragOver, onDrop, onDragEnd, dragOverNodeId, isRoot, draggedNodeId }) => {
  const isSelected = node.id === selectedId;
  const statusStyle = STATUS_CONFIG[node.status];
  const inputRef = useRef<HTMLInputElement>(null);
  const isDragOver = dragOverNodeId === node.id;
  const isDragging = draggedNodeId === node.id;

  const opacityClass = filterActive && !isFilteredMatch ? 'opacity-30 grayscale' : 'opacity-100';

  // Auto-focus input when selected
  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Shortcuts inside the edit input
    if (e.key === 'Enter') {
        e.preventDefault();
        onAddSibling();
    } else if (e.key === 'Tab') {
        e.preventDefault();
        onAddChild();
    } else if (e.key === 'Delete' && e.ctrlKey) {
        // Ctrl+Delete to delete node while editing
        e.preventDefault();
        onDelete();
    }
  };

  return (
    <div className={`flex flex-row items-center ${opacityClass} transition-all duration-300`}>
      {/* Node Content */}
      <div className="flex flex-col items-start relative z-10 group my-2">
        {/* Drag drop zone wrapper with larger hit area */}
        <div
          onDragOver={(e) => onDragOver(node.id, e)}
          onDrop={(e) => onDrop(node.id, e)}
          className="p-3 -m-3"
        >
          <div
            draggable={!isRoot}
            onDragStart={(e) => !isRoot && onDragStart(node.id, e)}
            onDragEnd={onDragEnd}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(node.id);
            }}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 shadow-sm cursor-pointer transition-all bg-white
              ${statusStyle.color}
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

          <div className="flex flex-col w-full min-w-0">
            {/* Auto-growing Input Container */}
            <div className="relative min-w-[80px]">
                {/* Invisible Span to determine width */}
                <span className="invisible whitespace-pre font-medium text-sm px-1">
                    {node.text || '输入任务...'}
                </span>

                {isSelected ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={node.text}
                        onChange={(e) => onUpdateNode(node.id, { text: e.target.value })}
                        onKeyDown={handleKeyDown}
                        className="absolute inset-0 w-full bg-transparent border-none outline-none font-medium text-sm p-0 m-0 text-inherit placeholder-slate-400/70 px-1"
                        placeholder="输入任务..."
                    />
                ) : (
                    <span className="absolute inset-0 font-medium text-sm select-none px-1 overflow-hidden text-ellipsis whitespace-nowrap">
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
      {node.isExpanded && node.children.length > 0 && (
        <div className="flex flex-row items-center">
           {/* 1. Horizontal Link leaving the parent node */}
           <div className="w-8 h-0.5 bg-slate-300"></div>

           {/* 2. Container for children */}
           <div className="flex flex-col">
             {node.children.map((child, index) => {
                const isFirst = index === 0;
                const isLast = index === node.children.length - 1;
                const isSingle = node.children.length === 1;

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
                          onUpdateNode={onUpdateNode}
                          onAddSibling={onAddSibling}
                          onAddChild={onAddChild}
                          onDelete={onDelete}
                          onDragStart={onDragStart}
                          onDragOver={onDragOver}
                          onDrop={onDrop}
                          onDragEnd={onDragEnd}
                          dragOverNodeId={dragOverNodeId}
                          draggedNodeId={draggedNodeId}
                          isRoot={false}
                       />
                   </div>
                );
             })}
           </div>
        </div>
      )}
    </div>
  );
};

export const MindMapCanvas: React.FC<MindMapCanvasProps> = ({ root, selectedId, onSelect, onToggleExpand, filterMode, filteredIds, onUpdateNode, onAddSibling, onAddChild, onDelete, onNodeDrop }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Drag and drop state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const draggedElementRef = useRef<HTMLElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());

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
        <div className="absolute top-4 left-4 z-50 bg-white/80 backdrop-blur p-2 rounded shadow text-xs text-slate-500 pointer-events-none select-none">
            滚轮缩放 • 右键拖拽平移 • 按住节点拖动移位
        </div>

      <div
        style={{
          transform: `translate(${position.x + 50}px, ${position.y + 300}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: isDragging.current ? 'none' : 'transform 0.1s ease-out'
        }}
        className="absolute top-0 left-0 p-20 canvas-content-wrapper"
      >
        <TreeNode
          node={root}
          selectedId={selectedId}
          onSelect={onSelect}
          onToggleExpand={onToggleExpand}
          isFilteredMatch={filteredIds.has(root.id)}
          filterActive={filterMode}
          filteredIds={filteredIds}
          onUpdateNode={onUpdateNode}
          onAddSibling={onAddSibling}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          dragOverNodeId={dragOverNodeId}
          draggedNodeId={draggedNodeId}
          isRoot={true}
        />
      </div>
    </div>
  );
};
