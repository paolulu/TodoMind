import { MindNode } from './types';
import { flattenTree } from './utils';

const DB_NAME = 'TodoMindVersionDB';
const DB_VERSION = 1;
const STORE_NAME = 'versions';
const MAX_VERSIONS = 20;
const DEVICE_ID_KEY = 'device-id';

// 版本快照接口
export interface VersionSnapshot {
  id: string;
  timestamp: number;
  data: MindNode;
  fileName?: string;
  deviceId: string;
  deviceName: string;
  nodeCount: number;
  changeSummary: ChangeSummary;
  saveType: 'manual' | 'auto' | 'conflict-local' | 'conflict-remote';
}

// 变更摘要接口
export interface ChangeSummary {
  nodesAdded: number;
  nodesDeleted: number;
  nodesModified: number;
  totalNodes: number;
  majorChanges: string[]; // 主要变更描述
}

// 初始化或获取设备ID
const getDeviceId = (): string => {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return `device-${Date.now()}`;
  }
};

// 获取设备名称（用户友好的名称）
const getDeviceName = (): string => {
  try {
    const platform = navigator.platform || 'Unknown';
    const userAgent = navigator.userAgent;

    // 尝试提取操作系统信息
    let os = 'Unknown OS';
    if (platform.includes('Win')) os = 'Windows';
    else if (platform.includes('Mac')) os = 'macOS';
    else if (platform.includes('Linux')) os = 'Linux';
    else if (/iPhone|iPad|iPod/.test(userAgent)) os = 'iOS';
    else if (/Android/.test(userAgent)) os = 'Android';

    // 尝试提取浏览器信息
    let browser = 'Unknown Browser';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) browser = 'Chrome';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edg')) browser = 'Edge';

    return `${os} - ${browser}`;
  } catch {
    return 'Unknown Device';
  }
};

// 打开 IndexedDB 数据库
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建对象存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // 创建索引以便按时间戳排序
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('deviceId', 'deviceId', { unique: false });
      }
    };
  });
};

// 计算两个数据树的差异
const calculateChanges = (oldData: MindNode | null, newData: MindNode): ChangeSummary => {
  const newNodes = flattenTree(newData);
  const newNodesMap = new Map(newNodes.map(n => [n.id, n]));

  if (!oldData) {
    // 第一个版本
    return {
      nodesAdded: newNodes.length,
      nodesDeleted: 0,
      nodesModified: 0,
      totalNodes: newNodes.length,
      majorChanges: ['初始版本']
    };
  }

  const oldNodes = flattenTree(oldData);
  const oldNodesMap = new Map(oldNodes.map(n => [n.id, n]));

  let nodesAdded = 0;
  let nodesDeleted = 0;
  let nodesModified = 0;
  const majorChanges: string[] = [];

  // 检查新增和修改的节点
  newNodes.forEach(newNode => {
    const oldNode = oldNodesMap.get(newNode.id);
    if (!oldNode) {
      nodesAdded++;
    } else {
      // 检查是否有实质性修改
      if (
        oldNode.text !== newNode.text ||
        oldNode.status !== newNode.status ||
        oldNode.isImportant !== newNode.isImportant ||
        oldNode.isUrgent !== newNode.isUrgent ||
        oldNode.dueDate !== newNode.dueDate ||
        oldNode.note !== newNode.note
      ) {
        nodesModified++;
      }
    }
  });

  // 检查删除的节点
  oldNodes.forEach(oldNode => {
    if (!newNodesMap.has(oldNode.id)) {
      nodesDeleted++;
    }
  });

  // 生成主要变更描述
  if (nodesAdded > 0) majorChanges.push(`新增 ${nodesAdded} 个节点`);
  if (nodesDeleted > 0) majorChanges.push(`删除 ${nodesDeleted} 个节点`);
  if (nodesModified > 0) majorChanges.push(`修改 ${nodesModified} 个节点`);
  if (majorChanges.length === 0) majorChanges.push('无变更');

  return {
    nodesAdded,
    nodesDeleted,
    nodesModified,
    totalNodes: newNodes.length,
    majorChanges
  };
};

// 保存版本快照
export const saveVersion = async (
  data: MindNode,
  fileName?: string,
  saveType: 'manual' | 'auto' | 'conflict-local' | 'conflict-remote' = 'manual'
): Promise<void> => {
  try {
    const db = await openDB();

    // 获取上一个版本以计算差异
    const lastVersion = await getLatestVersion();
    const changeSummary = calculateChanges(lastVersion?.data || null, data);

    const snapshot: VersionSnapshot = {
      id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data)), // 深拷贝
      fileName,
      deviceId: getDeviceId(),
      deviceName: getDeviceName(),
      nodeCount: flattenTree(data).length,
      changeSummary,
      saveType
    };

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.add(snapshot);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 清理旧版本，只保留最近 MAX_VERSIONS 个
    await cleanupOldVersions();

    console.log('✅ 版本快照已保存:', {
      id: snapshot.id,
      timestamp: new Date(snapshot.timestamp).toLocaleString(),
      saveType,
      changeSummary
    });

    db.close();
  } catch (error) {
    console.error('❌ 保存版本失败:', error);
    throw error;
  }
};

// 获取所有版本（按时间倒序）
export const getAllVersions = async (): Promise<VersionSnapshot[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // 倒序
      const versions: VersionSnapshot[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          versions.push(cursor.value);
          cursor.continue();
        } else {
          db.close();
          resolve(versions);
        }
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ 获取版本列表失败:', error);
    return [];
  }
};

// 获取最新版本
export const getLatestVersion = async (): Promise<VersionSnapshot | null> => {
  const versions = await getAllVersions();
  return versions.length > 0 ? versions[0] : null;
};

// 获取指定版本
export const getVersion = async (versionId: string): Promise<VersionSnapshot | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(versionId);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('❌ 获取版本失败:', error);
    return null;
  }
};

// 删除指定版本
export const deleteVersion = async (versionId: string): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(versionId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    console.log('✅ 版本已删除:', versionId);
  } catch (error) {
    console.error('❌ 删除版本失败:', error);
    throw error;
  }
};

// 清理旧版本，只保留最近的 MAX_VERSIONS 个
const cleanupOldVersions = async (): Promise<void> => {
  try {
    const versions = await getAllVersions();

    if (versions.length > MAX_VERSIONS) {
      const versionsToDelete = versions.slice(MAX_VERSIONS);

      for (const version of versionsToDelete) {
        await deleteVersion(version.id);
      }

      console.log(`🧹 清理了 ${versionsToDelete.length} 个旧版本`);
    }
  } catch (error) {
    console.error('❌ 清理旧版本失败:', error);
  }
};

// 清空所有版本
export const clearAllVersions = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
    console.log('🧹 所有版本已清空');
  } catch (error) {
    console.error('❌ 清空版本失败:', error);
    throw error;
  }
};

// 导出版本为 JSON 文件
export const exportVersion = (version: VersionSnapshot): void => {
  try {
    const exportData = {
      version: {
        timestamp: version.timestamp,
        date: new Date(version.timestamp).toLocaleString('zh-CN'),
        deviceName: version.deviceName,
        fileName: version.fileName,
        saveType: version.saveType,
        nodeCount: version.nodeCount,
        changeSummary: version.changeSummary
      },
      data: version.data
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `version-${new Date(version.timestamp).toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log('✅ 版本已导出');
  } catch (error) {
    console.error('❌ 导出版本失败:', error);
    throw error;
  }
};
