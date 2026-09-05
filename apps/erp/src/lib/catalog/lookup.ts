import { NAV } from "./nav";
import { SCREENS, type ScreenDef } from "./screens";

export function screenByHref(href: string): ScreenDef | undefined {
  const clean = href.replace(/\/+$/, "") || "/";
  return (
    SCREENS.find((s) => s.href === clean) ??
    SCREENS.find((s) => `/staff${s.route}` === clean)
  );
}

export function allHrefs(): string[] {
  const set = new Set<string>();
  for (const s of SCREENS) set.add(s.href);
  for (const g of NAV) {
    for (const item of g.items) set.add(item.href);
  }
  return [...set];
}
