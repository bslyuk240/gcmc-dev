"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/chat/types";
import { cn } from "@/lib/utils/cn";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
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
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ChatAvatar({
  name,
  avatarUrl,
  small = false,
}: {
  name: string;
  avatarUrl?: string;
  small?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
        small ? "h-9 w-9" : "h-10 w-10",
        avatarColor(name),
      )}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}

export function ChatWindow({
  contactName,
  contactRole,
  contactAvatarUrl,
  messages,
  placeholder,
  myName = "You",
  onSend,
  isLoading = false,
  isSending = false,
  emptyStateTitle = "No messages yet",
  emptyStateDescription = "Start the conversation when you are ready.",
}: {
  contactName: string;
  contactRole?: string;
  contactAvatarUrl?: string;
  messages: ChatMessage[];
  placeholder?: string;
  myName?: string;
  onSend: (body: string) => Promise<void> | void;
  isLoading?: boolean;
  isSending?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = input.trim();
    if (!body || isSending) return;

    try {
      setError(null);
      await onSend(body);
      setInput("");
    } catch {
      setError("Could not send message. Please try again.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f0f2f5]">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-[#f0f2f5] px-4 py-3">
        <ChatAvatar name={contactName} avatarUrl={contactAvatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{contactName}</p>
          {contactRole ? (
            <p className="text-xs text-slate-500">{contactRole}</p>
          ) : null}
        </div>
      </div>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ccircle cx='40' cy='40' r='1' fill='%23c5c5c5' fill-opacity='0.3'/%3E%3C/svg%3E\")",
        }}
        aria-label="Messages"
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--accent)]" />
          </div>
        ) : null}

        {!isLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-900">{emptyStateTitle}</p>
              <p className="mt-1 text-xs text-slate-500">{emptyStateDescription}</p>
            </div>
          </div>
        ) : null}

        {!isLoading &&
          messages.map((message, index) => {
            const previousSender = index > 0 ? messages[index - 1].senderId : null;
            const isFirstFromSender = previousSender !== message.senderId;

            return (
              <div
                key={message.id}
                className={cn(
                  "flex w-full",
                  message.isOwn ? "justify-end" : "justify-start",
                )}
              >
                {!message.isOwn ? (
                  <div className={cn("flex max-w-[75%] gap-2", isFirstFromSender ? "mt-2" : "ml-11")}>
                    {isFirstFromSender ? (
                      <ChatAvatar name={message.sender} small />
                    ) : (
                      <div className="w-9 shrink-0" />
                    )}
                    <div className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                      {isFirstFromSender ? (
                        <p className="mb-0.5 text-xs font-semibold text-slate-700">
                          {message.sender}
                          {message.senderRole ? ` · ${message.senderRole}` : ""}
                        </p>
                      ) : null}
                      <p className="text-sm leading-relaxed text-slate-900">{message.body}</p>
                      <p className="mt-1 text-right text-[10px] text-slate-400">{message.time}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex max-w-[75%] items-end gap-1.5">
                    <div className="rounded-2xl rounded-tr-sm bg-[var(--accent)] px-3 py-2 shadow-sm">
                      {isFirstFromSender && message.senderRole ? (
                        <p className="mb-0.5 text-right text-[10px] font-semibold text-white/70">
                          {message.senderRole}
                        </p>
                      ) : null}
                      <p className="text-sm leading-relaxed text-white">{message.body}</p>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <span className="text-[10px] text-white/70">{message.time}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-[#f0f2f5] px-3 py-2">
        {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={placeholder ?? "Type a message..."}
            className="min-w-0 flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            aria-label="Message input"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending}
            className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
        <p className="mt-1 px-2 text-[10px] text-slate-400">
          Signed in as {myName}
        </p>
      </div>
    </div>
  );
}
