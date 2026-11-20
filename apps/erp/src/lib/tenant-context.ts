import { AsyncLocalStorage } from "async_hooks";

export type TenantScope = {
  orgId: string;
  campusIds: string[];
  actorId: string;
  platform: boolean;
};

const storage = new AsyncLocalStorage<TenantScope>();

export function currentTenant() {
  const scope = storage.getStore();
  if (!scope?.orgId) return null;
  return scope;
}

export function enterTenant(scope: TenantScope) {
  storage.enterWith(scope);
}

export function clearTenant() {
  storage.enterWith({ orgId: "", campusIds: [], actorId: "", platform: false });
}
