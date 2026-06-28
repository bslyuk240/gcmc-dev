"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchStoreItems } from "@/lib/store/client";
import type { StoreItem } from "@/modules/store/types";

type Props = {
  value: StoreItem | null;
  onChange: (item: StoreItem | null) => void;
  disabled?: boolean;
};

export function StoreCatalogPicker({ value, onChange, disabled }: Props) {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items
      .filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [items, query]);

  function pick(item: StoreItem) {
    onChange(item);
    setQuery(item.name);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        disabled={disabled || loading}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={loading ? "Loading catalog…" : "Search store catalog…"}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
      />
      {value && (
        <p className="mt-1 text-xs text-slate-500">
          {value.id} · {value.currentStock} {value.unit} on hand · {value.status}
        </p>
      )}
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => pick(item)}
              >
                <span className="font-medium text-slate-900">{item.name}</span>
                <span className="text-xs text-slate-500">
                  {item.category} · {item.currentStock} {item.unit} · {item.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
