import { verifyPassword } from "./password";

/** The password the seed used when SEED_ADMIN_PASSWORD was not set. It is public (README, CI, tests). */
export const PUBLIC_DEFAULT_PASSWORD = "Admin@12345";

/** Accounts the seed creates for demos. In production they must not stay usable with a known password. */
export const DEMO_USERNAMES = ["teacher", "student1", "parent1"];
export const ADMIN_USERNAME = "admin";

type SeedUser = { id: string; username: string; passwordHash: string; isActive: boolean; mustChangePassword: boolean };

export type CredentialStore = {
  findUsers(usernames: string[]): Promise<SeedUser[]>;
  update(id: string, data: { isActive?: boolean; mustChangePassword?: boolean }): Promise<unknown>;
};

/**
 * Closes the default-password hole on a running production database:
 * - demo accounts still on a known password are switched off;
 * - admin accounts still on a known password must change it at next sign-in (they are never
 *   switched off, so nobody is locked out).
 * "Known" is the public default plus, when set, SEED_ADMIN_PASSWORD (the seed gave it to every
 * demo account). Accounts whose password was changed are left alone. Returns what it changed.
 */
export async function hardenDefaultAccounts(store: CredentialStore, knownPasswords: string[]) {
  const known = [...new Set(knownPasswords.filter(Boolean))];
  const users = await store.findUsers([ADMIN_USERNAME, ...DEMO_USERNAMES]);
  const changed: Array<{ username: string; action: "disabled" | "must-change" }> = [];
  for (const user of users) {
    const isDemo = DEMO_USERNAMES.includes(user.username);
    if (isDemo ? !user.isActive : user.mustChangePassword || !user.isActive) continue;
    let matches = false;
    for (const password of known) {
      if (await verifyPassword(password, user.passwordHash)) { matches = true; break; }
    }
    if (!matches) continue;
    if (isDemo) {
      await store.update(user.id, { isActive: false });
      changed.push({ username: user.username, action: "disabled" });
    } else {
      await store.update(user.id, { mustChangePassword: true });
      changed.push({ username: user.username, action: "must-change" });
    }
  }
  return changed;
}

/** Production unless explicitly opted out (for a throwaway demo server). */
export function shouldHardenDefaults(env: Record<string, string | undefined>) {
  return env.NODE_ENV === "production" && env.ALLOW_DEFAULT_PASSWORDS !== "true";
}
