import { prisma } from "./db";
import { OPTIONAL_MODULES } from "./catalog/nav-permissions";

export { OPTIONAL_MODULES };

export function moduleSettingKey(id: string) {
  return `module.${id}.enabled`;
}

export function parseModuleFlag(value: unknown): boolean {
  return value === true || value === "true";
}

export async function loadModuleFlags(
  campusId: string,
): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};
  for (const id of OPTIONAL_MODULES) flags[id] = false;
  const rows = await prisma.setting.findMany({
    where: { campusId, key: { startsWith: "module." } },
  });
  for (const row of rows) {
    const match = /^module\.(.+)\.enabled$/.exec(row.key);
    if (!match) continue;
    flags[match[1]] = parseModuleFlag(row.value);
  }
  return flags;
}

export async function setModuleFlag(
  campusId: string,
  id: string,
  enabled: boolean,
) {
  const key = moduleSettingKey(id);
  return prisma.setting.upsert({
    where: { campusId_key: { campusId, key } },
    update: { value: enabled },
    create: { campusId, key, value: enabled },
  });
}
