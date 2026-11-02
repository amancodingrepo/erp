"use client";

import { useMemo } from "react";
import { screenByHref } from "@/lib/catalog/lookup";
import type { ScreenDef } from "@/lib/catalog/screens";
import { SpecialScreen } from "./special-screens";
import CatalogRecordOps from "./catalog-record-ops";
import PhaseBScreen from "./phase-b";

function synthetic(href: string): ScreenDef {
  const route = href.replace(/^\/staff/, "") || "/";
  const title =
    route.split("/").filter(Boolean).slice(-1)[0]?.replaceAll("-", " ") ??
    "Screen";
  return {
    module: "system",
    priority: "core",
    title: title.replace(/\b\w/g, (c) => c.toUpperCase()),
    route,
    source: "",
    href,
    kind: "list",
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "code", label: "Code", type: "text" },
      { key: "notes", label: "Notes", type: "text" },
    ],
  };
}

export function Workbench({ href }: { href: string }) {
  const screen = useMemo(
    () => screenByHref(href) ?? synthetic(href),
    [href],
  );
  const live = SpecialScreen({ href, screen });
  if (live) return live;
  if (href.includes("updater")) {
    return <PhaseBScreen title={screen.title} />;
  }
  return <CatalogRecordOps screen={screen} />;
}
