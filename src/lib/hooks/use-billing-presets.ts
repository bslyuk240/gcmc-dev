"use client";

import { useEffect, useState } from "react";
import {
  fetchBillingPresets,
  upsertBillingPreset,
  deleteBillingPreset,
  type BillingPreset,
} from "@/lib/supabase/db";

// Module-level cache so all consumers share the same fetch
let _cache: BillingPreset[] | null = null;
let _promise: Promise<BillingPreset[]> | null = null;
const _listeners: Array<(presets: BillingPreset[]) => void> = [];

function notify(presets: BillingPreset[]) {
  _cache = presets;
  _listeners.forEach((fn) => fn(presets));
}

async function load(): Promise<BillingPreset[]> {
  if (_cache) return _cache;
  if (!_promise) _promise = fetchBillingPresets();
  const data = await _promise;
  _cache = data;
  return data;
}

export function invalidateBillingPresetsCache() {
  _cache = null;
  _promise = null;
}

export function useBillingPresets() {
  const [presets, setPresets] = useState<BillingPreset[]>(_cache ?? []);
  const [loading, setLoading]  = useState(!_cache);

  useEffect(() => {
    let cancelled = false;
    _listeners.push(setPresets);
    load().then((data) => {
      if (!cancelled) { setPresets(data); setLoading(false); }
    });
    return () => {
      const idx = _listeners.indexOf(setPresets);
      if (idx !== -1) _listeners.splice(idx, 1);
      cancelled = true;
    };
  }, []);

  /** All active presets for a given category, sorted by name */
  function getByCategory(category: string): BillingPreset[] {
    return presets.filter((p) => p.category === category && p.isActive);
  }

  /** Lookup the amount for a specific category+name, with optional fallback */
  function getAmount(category: string, name: string, fallback = 0): number {
    return (
      presets.find((p) => p.category === category && p.name === name && p.isActive)
        ?.amount ?? fallback
    );
  }

  /** Save (create or update) a preset, then refresh all consumers */
  async function savePreset(
    preset: Omit<BillingPreset, "id"> & { id?: string },
  ): Promise<BillingPreset | null> {
    const result = await upsertBillingPreset(preset);
    if (result) {
      // Patch the cache in-place so other pages update immediately
      const updated = _cache
        ? _cache.map((p) => (p.id === result.id ? result : p))
        : [result];
      if (_cache && !_cache.find((p) => p.id === result.id)) {
        updated.push(result);
      }
      notify(updated.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)));
    }
    return result;
  }

  /** Delete a preset by ID and refresh all consumers */
  async function removePreset(id: string): Promise<boolean> {
    const ok = await deleteBillingPreset(id);
    if (ok && _cache) {
      notify(_cache.filter((p) => p.id !== id));
    }
    return ok;
  }

  return { presets, loading, getByCategory, getAmount, savePreset, removePreset };
}
