"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

export type ChatMessage = {
  id: string;
  sender: string;
  senderRole?: string;
  body: string;
  time: string;
  isOwn?: boolean;
  /** Data URL or URL for image (end-to-end client-side for now) */
  imageUrl?: string;
};

const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/** Optional: name and role for the other party (e.g. "IT", "HR") so simulated replies show correctly. */
export function SimpleChat({
  title,
  placeholder,
  initialMessages,
  channelId,
  otherPartyName,
  otherPartyRole,
}: {
  title: string;
  placeholder?: string;
  initialMessages: ChatMessage[];
  channelId: string;
  otherPartyName?: string;
  otherPartyRole?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    };
  }, []);

  function handleImageFile(file: File) {
    setImageError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Please use JPEG, PNG, GIF, or WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image must be under 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.onerror = () => setImageError("Could not read image.");
    reader.readAsDataURL(file);
  }

  function send() {
    const t = input.trim();
    if (!t && !pendingImage) return;
    const sentBody = t || "";
    const sentImage = pendingImage ?? undefined;
    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: "You",
        body: sentBody,
        time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        isOwn: true,
        ...(sentImage && { imageUrl: sentImage }),
      },
    ]);
    setInput("");
    setPendingImage(null);
    setImageError(null);

    // Simulated reply so chat feels two-way (sender + receiver)
    const name = otherPartyName ?? "Support";
    const role = otherPartyRole ?? "";
    if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    replyTimeoutRef.current = setTimeout(() => {
      replyTimeoutRef.current = null;
      const replies: string[] = [
        "Thanks, we’ll look into it.",
        "Received. I’ll get back to you shortly.",
        "Noted. Anything else?",
        "Got it, thanks.",
      ];
      if (sentBody.toLowerCase().includes("?")) {
        replies.push("I’ll confirm and reply soon.");
      }
      if (sentImage) {
        replies.push("Image received, thanks.");
      }
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}-reply`,
          sender: name,
          senderRole: role,
          body: reply,
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          isOwn: false,
        },
      ]);
    }, 1200);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const item = e.clipboardData?.items?.[0];
    if (item?.kind === "file" && item.type.startsWith("image/")) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) handleImageFile(file);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[320px] flex-col rounded-xl border border-[var(--border)] bg-white shadow-sm xl:h-[calc(100vh-10rem)]">
      <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">Chat with image upload — paste or attach images</p>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3"
        aria-label="Messages"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex w-full gap-2",
              m.isOwn ? "justify-end" : "justify-start",
            )}
          >
            {/* Receiver (them): left side */}
            {!m.isOwn && (
              <>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-700">
                  {m.sender.slice(0, 2).toUpperCase()}
                </div>
                <div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-2.5 text-sm shadow-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{m.sender}</span>
                    {m.senderRole && (
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">{m.senderRole}</span>
                    )}
                    <span className="text-xs text-slate-500">{m.time}</span>
                  </div>
                  {m.imageUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden max-w-[280px]">
                      <img src={m.imageUrl} alt="" className="block max-h-64 w-full object-contain bg-black/5" />
                    </div>
                  )}
                  {m.body ? <p className="mt-1 text-slate-900">{m.body}</p> : null}
                </div>
                <div className="w-9 shrink-0" />
              </>
            )}
            {/* Sender (you): right side */}
            {m.isOwn && (
              <>
                <div className="w-9 shrink-0" />
                <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-[var(--accent)] px-4 py-2.5 text-sm text-white shadow-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">You</span>
                    <span className="text-xs text-white/90">{m.time}</span>
                  </div>
                  {m.imageUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden max-w-[280px] bg-white/10">
                      <img src={m.imageUrl} alt="" className="block max-h-64 w-full object-contain" />
                    </div>
                  )}
                  {m.body ? <p className="mt-1">{m.body}</p> : null}
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/30 text-xs font-bold text-[var(--accent-foreground)]">
                  You
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-[var(--border)] p-3">
        {pendingImage && (
          <div className="mb-2 flex items-start gap-2">
            <div className="relative inline-block rounded-lg overflow-hidden max-w-[120px] max-h-20 bg-slate-100">
              <img src={pendingImage} alt="" className="block max-h-20 w-auto object-contain" />
              <button
                type="button"
                onClick={() => { setPendingImage(null); setImageError(null); }}
                className="absolute right-1 top-1 rounded-full bg-slate-800/80 p-1 text-white hover:bg-slate-800"
                aria-label="Remove image"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {imageError && <p className="text-xs text-red-600">{imageError}</p>}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2 items-end"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-lg border border-[var(--border)] bg-white p-2.5 text-slate-600 hover:bg-slate-50"
            title="Upload image"
            aria-label="Upload image"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder ?? "Type a message or paste image..."}
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
            aria-label="Message"
          />
          <button
            type="submit"
            disabled={!input.trim() && !pendingImage}
            className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
