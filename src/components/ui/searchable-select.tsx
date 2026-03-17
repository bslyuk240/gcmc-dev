"use client";

import { useState, useRef, useEffect, useId } from "react";
import { cn } from "@/lib/utils/cn";

export type SelectOption = {
  value: string;
  label: string;
  /** Optional sub-label shown in smaller text below label */
  sublabel?: string;
  /** Optional group for displaying optgroup-like headers */
  group?: string;
  disabled?: boolean;
};

type Props = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  /** Show group headings between grouped items */
  showGroups?: boolean;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search or select…",
  className,
  disabled,
  required,
  showGroups = true,
}: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Filter based on query
  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          (o.sublabel ?? "").toLowerCase().includes(query.toLowerCase()) ||
          (o.group ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  // Group items
  const groups: { group: string; items: SelectOption[] }[] = [];
  if (showGroups) {
    const seen = new Map<string, SelectOption[]>();
    for (const opt of filtered) {
      const g = opt.group ?? "";
      if (!seen.has(g)) seen.set(g, []);
      seen.get(g)!.push(opt);
    }
    seen.forEach((items, group) => groups.push({ group, items }));
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleSelect(opt: SelectOption) {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setOpen(false);
    setQuery("");
  }

  const baseInputCls = cn(
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition",
    "focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20",
    disabled && "cursor-not-allowed opacity-60",
    className,
  );

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition",
          "focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20",
          open && "border-violet-400 ring-2 ring-violet-400/20",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("truncate", !selectedOption && "text-slate-400")}>
          {selectedOption ? (
            <span className="flex items-center gap-1.5">
              <span className="font-medium">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-slate-400 text-xs">{selectedOption.sublabel}</span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {selectedOption && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === "Enter" && handleClear(e as unknown as React.MouseEvent)}
              className="rounded p-0.5 text-slate-400 hover:text-slate-700"
              aria-label="Clear selection"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg
            className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-300"
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setOpen(false); setQuery(""); }
                  if (e.key === "Enter" && filtered.length === 1 && !filtered[0].disabled) {
                    handleSelect(filtered[0]);
                  }
                }}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul
            role="listbox"
            className="max-h-60 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-slate-400">No results for &ldquo;{query}&rdquo;</li>
            ) : showGroups && groups.length > 0 ? (
              groups.map(({ group, items }) => (
                <li key={group}>
                  {group && (
                    <p className="sticky top-0 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {group}
                    </p>
                  )}
                  {items.map((opt) => (
                    <Option key={opt.value} opt={opt} selected={opt.value === value} onSelect={handleSelect} />
                  ))}
                </li>
              ))
            ) : (
              filtered.map((opt) => (
                <Option key={opt.value} opt={opt} selected={opt.value === value} onSelect={handleSelect} />
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Option({
  opt,
  selected,
  onSelect,
}: {
  opt: SelectOption;
  selected: boolean;
  onSelect: (opt: SelectOption) => void;
}) {
  return (
    <li
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(opt)}
      className={cn(
        "flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition",
        selected ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50 text-slate-800",
        opt.disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="min-w-0">
        <p className="font-medium truncate">{opt.label}</p>
        {opt.sublabel && <p className="text-xs text-slate-400 truncate">{opt.sublabel}</p>}
      </div>
      {selected && (
        <svg className="ml-2 h-4 w-4 shrink-0 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </li>
  );
}
