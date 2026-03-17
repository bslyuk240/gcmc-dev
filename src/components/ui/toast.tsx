"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils/cn";

export type ToastData = { message: string; type: "success" | "error" | "info" };

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      className={cn(
        "fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg xl:bottom-6",
        toast.type === "success" && "bg-emerald-600 text-white",
        toast.type === "error" && "bg-red-600 text-white",
        toast.type === "info" && "bg-slate-800 text-white",
      )}
    >
      {toast.type === "success" && (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {toast.type === "error" && (
        <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {toast.message}
      <button type="button" onClick={onDismiss} className="ml-2 opacity-70 hover:opacity-100">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  return (setter: React.Dispatch<React.SetStateAction<ToastData | null>>) => ({
    success: (message: string) => setter({ message, type: "success" }),
    error: (message: string) => setter({ message, type: "error" }),
    info: (message: string) => setter({ message, type: "info" }),
  });
}
