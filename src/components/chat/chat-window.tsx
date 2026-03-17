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
  imageUrl?: string;
  status?: "sent" | "delivered" | "read";
};

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function TickIcon({ status }: { status?: "sent" | "delivered" | "read" }) {
  if (!status || status === "sent") {
    return (
      <svg className="h-3.5 w-3.5 text-white/60" fill="currentColor" viewBox="0 0 16 16">
        <path d="M12.354 4.354a.5.5 0 0 1 0 .707L6.5 10.914 3.646 8.06a.5.5 0 0 1 .708-.707L6.5 9.5l5.146-5.146a.5.5 0 0 1 .708 0z" />
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <svg className="h-3.5 w-3.5 text-white/60" fill="currentColor" viewBox="0 0 16 16">
        <path d="M12.354 4.354a.5.5 0 0 1 0 .707L6.5 10.914 3.646 8.06a.5.5 0 0 1 .708-.707L6.5 9.5l5.146-5.146a.5.5 0 0 1 .708 0zm-4 1a.5.5 0 0 1 0 .707L4.5 9.914 2.646 8.06a.5.5 0 0 1 .708-.707L4.5 8.5l3.146-3.146a.5.5 0 0 1 .708 0z" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5 text-sky-300" fill="currentColor" viewBox="0 0 16 16">
      <path d="M12.354 4.354a.5.5 0 0 1 0 .707L6.5 10.914 3.646 8.06a.5.5 0 0 1 .708-.707L6.5 9.5l5.146-5.146a.5.5 0 0 1 .708 0zm-4 1a.5.5 0 0 1 0 .707L4.5 9.914 2.646 8.06a.5.5 0 0 1 .708-.707L4.5 8.5l3.146-3.146a.5.5 0 0 1 .708 0z" />
    </svg>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ChatWindow({
  contactName,
  contactRole,
  contactStatus = "online",
  initialMessages,
  channelId,
  placeholder,
  myName = "You",
  mySubtitle,
  myAvatar,
}: {
  contactName: string;
  contactRole?: string;
  contactStatus?: "online" | "away" | "offline";
  initialMessages: ChatMessage[];
  channelId: string;
  placeholder?: string;
  myName?: string;
  mySubtitle?: string;
  myAvatar?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  void channelId;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  function handleImageFile(file: File) {
    setImageError(null);
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Please use JPEG, PNG, GIF, or WebP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image must be under 4 MB.");
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
    const sentBody = t;
    const sentImage = pendingImage ?? undefined;
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: myName,
        senderRole: mySubtitle,
        body: sentBody,
        time: now,
        isOwn: true,
        ...(sentImage && { imageUrl: sentImage }),
        status: "sent",
      },
    ]);
    setInput("");
    setPendingImage(null);
    setImageError(null);

    // Show typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(true);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 1500);

    const REPLIES: string[] = [
      "Thanks, I'll look into that right away.",
      "Received. I'll get back to you shortly.",
      "Noted. Is there anything else you need?",
      "Got it, thanks for letting us know.",
      "We're on it. Expect a resolution within the hour.",
      "I'll escalate this to the relevant team.",
    ];
    if (sentBody.toLowerCase().includes("?")) REPLIES.push("Let me check and confirm that for you.");
    if (sentImage) REPLIES.push("Image received, that helps a lot. Looking into it now.");

    if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    replyTimeoutRef.current = setTimeout(() => {
      replyTimeoutRef.current = null;
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}-reply`,
          sender: contactName,
          senderRole: contactRole,
          body: REPLIES[Math.floor(Math.random() * REPLIES.length)],
          time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          isOwn: false,
        },
      ]);
    }, 1800);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const item = e.clipboardData?.items?.[0];
    if (item?.kind === "file" && item.type.startsWith("image/")) {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) handleImageFile(file);
    }
  }

  const statusDot =
    contactStatus === "online"
      ? "bg-emerald-400"
      : contactStatus === "away"
        ? "bg-amber-400"
        : "bg-slate-300";

  const statusLabel =
    contactStatus === "online" ? "Online" : contactStatus === "away" ? "Away" : "Offline";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-[#f0f2f5] px-4 py-3">
        <div
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
            avatarColor(contactName),
          )}
        >
          {myAvatar ? (
            <img src={myAvatar} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            getInitials(contactName)
          )}
          <span
            className={cn(
              "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white",
              statusDot,
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{contactName}</p>
          <p className="text-xs text-slate-500">
            {contactRole ? `${contactRole} · ` : ""}
            {statusLabel}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            className="rounded-full p-2 text-slate-500 hover:bg-slate-200"
            title="Search"
            aria-label="Search in chat"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
          </button>
          <button
            className="rounded-full p-2 text-slate-500 hover:bg-slate-200"
            title="More options"
            aria-label="More options"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 space-y-1"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='40' cy='40' r='1' fill='%23c5c5c5' fill-opacity='0.3'/%3E%3C/svg%3E\")",
        }}
        aria-label="Messages"
      >
        {messages.map((m, i) => {
          const prevSender = i > 0 ? messages[i - 1].sender : null;
          const isFirst = prevSender !== m.sender;
          return (
            <div
              key={m.id}
              className={cn("flex w-full", m.isOwn ? "justify-end" : "justify-start")}
            >
              {!m.isOwn && (
                <div className={cn("flex max-w-[75%] gap-2", isFirst ? "mt-2" : "ml-11")}>
                  {isFirst ? (
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 self-end items-center justify-center rounded-full text-xs font-bold text-white",
                        avatarColor(m.sender),
                      )}
                    >
                      {getInitials(m.sender)}
                    </div>
                  ) : (
                    <div className="w-9 shrink-0" />
                  )}
                  <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                    {isFirst && (
                      <p className="mb-0.5 text-xs font-semibold" style={{ color: avatarColor(m.sender).replace("bg-", "") }}>
                        {m.sender}
                        {m.senderRole ? ` · ${m.senderRole}` : ""}
                      </p>
                    )}
                    {m.imageUrl && (
                      <div className="mb-1 overflow-hidden rounded-xl max-w-[260px]">
                        <img
                          src={m.imageUrl}
                          alt=""
                          className="block max-h-60 w-full object-contain bg-slate-100"
                        />
                      </div>
                    )}
                    {m.body && <p className="text-sm text-slate-900 leading-relaxed">{m.body}</p>}
                    <p className="mt-1 text-right text-[10px] text-slate-400">{m.time}</p>
                  </div>
                </div>
              )}
              {m.isOwn && (
                <div className="flex max-w-[75%] items-end gap-1.5">
                  <div className="rounded-2xl rounded-tr-sm bg-[var(--accent)] px-3 py-2 shadow-sm">
                    {isFirst && m.senderRole && (
                      <p className="mb-0.5 text-[10px] font-semibold text-white/70 text-right">
                        {m.senderRole}
                      </p>
                    )}
                    {m.imageUrl && (
                      <div className="mb-1 overflow-hidden rounded-xl max-w-[260px] bg-white/10">
                        <img
                          src={m.imageUrl}
                          alt=""
                          className="block max-h-60 w-full object-contain"
                        />
                      </div>
                    )}
                    {m.body && <p className="text-sm text-white leading-relaxed">{m.body}</p>}
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className="text-[10px] text-white/70">{m.time}</span>
                      <TickIcon status={m.status} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 mt-2">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                avatarColor(contactName),
              )}
            >
              {getInitials(contactName)}
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 bg-[#f0f2f5] px-3 py-2 border-t border-slate-200">
        {pendingImage && (
          <div className="mb-2 flex items-start gap-2 rounded-xl bg-white p-2 shadow-sm">
            <div className="relative inline-block overflow-hidden rounded-lg max-w-[100px] max-h-16 bg-slate-100">
              <img src={pendingImage} alt="" className="block max-h-16 w-auto object-contain" />
              <button
                type="button"
                onClick={() => {
                  setPendingImage(null);
                  setImageError(null);
                }}
                className="absolute right-0.5 top-0.5 rounded-full bg-slate-800/80 p-0.5 text-white hover:bg-slate-900"
                aria-label="Remove image"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth={2.5} strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Image ready to send</p>
            {imageError && <p className="text-xs text-red-600">{imageError}</p>}
          </div>
        )}
        {imageError && !pendingImage && <p className="mb-1 text-xs text-red-600">{imageError}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2"
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
            className="shrink-0 rounded-full bg-white p-2.5 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700"
            title="Attach image"
            aria-label="Attach image"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828L18 9.828A4 4 0 1012.343 4.343L5.757 10.93a6 6 0 008.486 8.485L20 13.657"
              />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            placeholder={placeholder ?? "Type a message..."}
            className="min-w-0 flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!input.trim() && !pendingImage}
            className="shrink-0 rounded-full bg-[var(--accent)] p-2.5 text-white shadow-sm hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none transition"
            aria-label="Send message"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
