"use client";

import { Modal, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "primary",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  variant?: "primary" | "destructive";
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      <ModalFooter>
        <Button variant="ghost" size="md" type="button" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant={variant}
          size="md"
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={variant === "destructive" ? "bg-red-600 text-white hover:opacity-95" : ""}
        >
          {loading ? "Processing…" : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
