import { MindNode, TaskStatus, FilterType } from './types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const createNode = (text: string = ''): MindNode => ({
  id: generateId(),
  text,
  status: TaskStatus.IDEA,
  isImportant: false,
  isUrgent: false,
  children: [],
  isExpanded: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  history: [],
});

// Recursive function to find a node by ID
export const findNode = (root: MindNode, id: string): MindNode | null => {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
};

// Recursive function to find a parent of a node
export const findParent = (root: MindNode, childId: string): MindNode | null => {
  if (root.children.some((c) => c.id === childId)) return root;
  for (const child of root.children) {
    const found = findParent(child, childId);
    if (found) return found;
  }
  return null;
};

// Update a node in the tree immutably
export const updateNodeInTree = (root: MindNode, nodeId: string, updates: Partial<MindNode>): MindNode => {
  if (root.id === nodeId) {
    return { ...root, ...updates };
  }
  return {
    ...root,
    children: root.children.map((child) => updateNodeInTree(child, nodeId, updates)),
  };
};

// Add a child node
export const addChildNode = (root: MindNode, parentId: string, newNode: MindNode): MindNode => {
  if (root.id === parentId) {
    return {
      ...root,
      isExpanded: true,
      children: [...root.children, newNode],
    };
  }
  return {
    ...root,
    children: root.children.map((child) => addChildNode(child, parentId, newNode)),
  };
};

// Add a sibling node
export const addSiblingNode = (root: MindNode, referenceId: string, newNode: MindNode): MindNode => {
  // If root is reference, we can't add sibling to root in this data structure, 
  // but usually we check for parent.
  if (root.children.some(c => c.id === referenceId)) {
    const index = root.children.findIndex(c => c.id === referenceId);
    const newChildren = [...root.children];
    newChildren.splice(index + 1, 0, newNode);
    return { ...root, children: newChildren };
  }
  return {
    ...root,
    children: root.children.map(child => addSiblingNode(child, referenceId, newNode))
  };
};

// Delete a node
export const deleteNodeFromTree = (root: MindNode, nodeId: string): MindNode => {
  if (root.id === nodeId) return root; // Cannot delete root this way usually

  // Check if direct child
  if (root.children.some(c => c.id === nodeId)) {
    return { ...root, children: root.children.filter(c => c.id !== nodeId) };
  }

  return {
    ...root,
    children: root.children.map(child => deleteNodeFromTree(child, nodeId))
  };
};

// Move Node (Up/Down)
export const moveNodeInTree = (root: MindNode, nodeId: string, direction: 'up' | 'down'): MindNode => {
  if (root.children.some(c => c.id === nodeId)) {
    const index = root.children.findIndex(c => c.id === nodeId);
    if (direction === 'up' && index > 0) {
      const newChildren = [...root.children];
      [newChildren[index - 1], newChildren[index]] = [newChildren[index], newChildren[index - 1]];
      return { ...root, children: newChildren };
    }
    if (direction === 'down' && index < root.children.length - 1) {
      const newChildren = [...root.children];
      [newChildren[index], newChildren[index + 1]] = [newChildren[index + 1], newChildren[index]];
      return { ...root, children: newChildren };
    }
    return root;
  }
  return {
    ...root,
    children: root.children.map(child => moveNodeInTree(child, nodeId, direction))
  };
};

// Flatten tree for searching/filtering
export const flattenTree = (root: MindNode): MindNode[] => {
  let list = [root];
  root.children.forEach(child => {
    list = [...list, ...flattenTree(child)];
  });
  return list;
};

// Check if a node matches filter
export const matchesFilter = (node: MindNode, filter: FilterType): boolean => {
  if (filter === 'all') return true;
  if (filter === 'today') {
    if (!node.dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    return node.dueDate === today;
  }
  if (filter === 'important') {
    return node.isImportant;
  }
  if (filter === 'urgent') {
    return node.isUrgent;
  }
  // Otherwise, check TaskStatus
  return node.status === filter;
};

// Check if a node matches the new filter state (supports multiple priority filters)
export const matchesFilterState = (
  node: MindNode,
  baseFilter: 'all' | 'today' | 'overdue' | 'planned' | TaskStatus,
  priorityFilters: Set<'important' | 'urgent' | 'both'>
): boolean => {
  // First check base filter
  let baseMatch = true;
  if (baseFilter === 'today') {
    if (!node.dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    baseMatch = node.dueDate === today;
  } else if (baseFilter === 'overdue') {
    // Check if node has a due date and it's before today
    if (!node.dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    baseMatch = node.dueDate < today && node.status !== TaskStatus.DONE;
  } else if (baseFilter === 'planned') {
    // Check if node has a due date and it's after today
    if (!node.dueDate) return false;
    const today = new Date().toISOString().split('T')[0];
    baseMatch = node.dueDate > today;
  } else if (baseFilter !== 'all') {
    // It's a TaskStatus
    baseMatch = node.status === baseFilter;
  }

  if (!baseMatch) return false;

  // Then check priority filters (OR logic for multiple selections)
  if (priorityFilters.size === 0) return true;

  // Check each priority filter - if ANY matches, return true (OR logic)
  for (const priority of priorityFilters) {
    if (priority === 'important' && node.isImportant) return true;
    if (priority === 'urgent' && node.isUrgent) return true;
    if (priority === 'both' && node.isImportant && node.isUrgent) return true;
  }

  // No priority filter matched
  return false;
};

// Move a node to a new parent (for drag and drop)
export const moveNodeToNewParent = (
  root: MindNode,
  nodeId: string,
  newParentId: string,
  insertIndex?: number
): MindNode => {
  // Cannot move root or move to self
  if (nodeId === root.id || nodeId === newParentId) return root;

  // Cannot move a node to be a child of itself or its descendants
  const nodeToMove = findNode(root, nodeId);
  if (!nodeToMove) return root;

  const isDescendant = (parent: MindNode, childId: string): boolean => {
    if (parent.id === childId) return true;
    return parent.children.some(child => isDescendant(child, childId));
  };

  if (isDescendant(nodeToMove, newParentId)) return root;

  // Step 1: Remove node from its current parent
  const removedTree = deleteNodeFromTree(root, nodeId);

  // Step 2: Add node to new parent at specified index
  const addNodeToParent = (tree: MindNode, parentId: string, node: MindNode, index?: number): MindNode => {
    if (tree.id === parentId) {
      const newChildren = [...tree.children];
      if (index !== undefined && index >= 0 && index <= newChildren.length) {
        newChildren.splice(index, 0, node);
      } else {
        newChildren.push(node);
      }
      return {
        ...tree,
        isExpanded: true,
        children: newChildren,
      };
    }
    return {
      ...tree,
      children: tree.children.map(child => addNodeToParent(child, parentId, node, index)),
    };
  };

  return addNodeToParent(removedTree, newParentId, nodeToMove, insertIndex);
};