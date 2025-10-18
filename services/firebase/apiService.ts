import { ref, set, get, push, remove, update } from 'firebase/database';
import { database } from '@/config/firebase';

export interface ApiConfig {
  id: string;
  name: string;
  apiKey: string;
  model: string;
  endpoint: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  lastUsed?: string;
  failureCount?: number;
}

export async function getAllApis(): Promise<Record<string, ApiConfig>> {
  const apisRef = ref(database, 'apis');
  const snapshot = await get(apisRef);

  if (!snapshot.exists()) {
    return {};
  }

  return snapshot.val();
}

export async function getActiveApis(): Promise<ApiConfig[]> {
  const allApis = await getAllApis();

  const activeApis = Object.entries(allApis)
    .filter(([_, api]) => api.isActive)
    .map(([id, api]) => ({ ...api, id }))
    .sort((a, b) => a.priority - b.priority);

  return activeApis;
}

export async function addApi(api: Omit<ApiConfig, 'id' | 'createdAt'>): Promise<string> {
  const apisRef = ref(database, 'apis');
  const newApiRef = push(apisRef);

  const newApi: ApiConfig = {
    ...api,
    id: newApiRef.key!,
    createdAt: new Date().toISOString(),
    failureCount: 0,
  };

  await set(newApiRef, newApi);
  return newApi.id;
}

export async function updateApi(id: string, updates: Partial<ApiConfig>): Promise<void> {
  const apiRef = ref(database, `apis/${id}`);
  await update(apiRef, updates);
}

export async function deleteApi(id: string): Promise<void> {
  const apiRef = ref(database, `apis/${id}`);
  await remove(apiRef);
}

export async function markApiAsUsed(id: string): Promise<void> {
  const apiRef = ref(database, `apis/${id}`);
  await update(apiRef, {
    lastUsed: new Date().toISOString(),
  });
}

export async function incrementApiFailureCount(id: string): Promise<void> {
  const apiRef = ref(database, `apis/${id}`);
  const snapshot = await get(apiRef);

  if (snapshot.exists()) {
    const currentCount = snapshot.val().failureCount || 0;
    await update(apiRef, {
      failureCount: currentCount + 1,
    });
  }
}

export async function resetApiFailureCount(id: string): Promise<void> {
  const apiRef = ref(database, `apis/${id}`);
  await update(apiRef, {
    failureCount: 0,
  });
}
