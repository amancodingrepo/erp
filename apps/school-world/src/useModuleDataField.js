import { useEffect, useState } from "react";
import { apiGet, apiPut } from "./api.js";

/**
 * Persist a single feature-owned field inside the existing per-module JSON store.
 * Each module can own its state without duplicating the API load/save lifecycle.
 */
export default function useModuleDataField(moduleName, fieldName, initialValue) {
  const moduleKey = String(moduleName || "module")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const [value, setValue] = useState(initialValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    async function load() {
      try {
        const result = await apiGet("/module-data/" + encodeURIComponent(moduleKey));
        const stored = result?.data?.[fieldName];
        if (!cancelled && stored !== undefined && stored !== null) setValue(stored);
      } catch (error) {
        console.warn("Module data could not be loaded for " + moduleName + ":", error.message);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [moduleKey, fieldName]);

  useEffect(() => {
    if (!loaded) return undefined;
    const timer = window.setTimeout(() => {
      apiPut("/module-data/" + encodeURIComponent(moduleKey), { data: { [fieldName]: value } })
        .catch(error => console.warn("Module data save failed for " + moduleName + ":", error.message));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loaded, moduleKey, fieldName, value]);

  return [value, setValue, loaded];
}
