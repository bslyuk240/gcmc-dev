"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { ChatMessage, ChatSendAttachment } from "@/lib/chat/types";
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

function MessageAttachment({
  url,
  name,
  mimeType,
}: {
  url: string;
  name?: string;
  mimeType?: string;
}) {
  if (mimeType && !mimeType.startsWith("image/")) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="block rounded-xl border border-white/20 bg-black/10 px-3 py-2 text-xs font-medium text-current underline-offset-2 hover:underline"
      >
        {name ?? "Open attachment"}
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl">
      <img
        src={url}
        alt={name ?? "Chat attachment"}
        className="max-h-60 w-full rounded-xl object-cover"
        loading="lazy"
      />
    </a>
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
  onSend: (body: string, attachment?: ChatSendAttachment) => Promise<void> | void;
  isLoading?: boolean;
  isSending?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ file: File; previewUrl: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, [attachment?.previewUrl]);

  function clearAttachment() {
    setAttachment((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_CHAT_IMAGE_BYTES) {
      setError("Image must be 5 MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    clearAttachment();
    setAttachment({
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = input.trim();
    if ((!body && !attachment) || isSending) return;

    try {
      setError(null);
      await onSend(body, attachment?.file ?? null);
      setInput("");
      clearAttachment();
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
                      <div className="space-y-2">
                        {message.body ? (
                          <p className="text-sm leading-relaxed text-slate-900">{message.body}</p>
                        ) : null}
                        {message.attachmentUrl ? (
                          <MessageAttachment
                            url={message.attachmentUrl}
                            name={message.attachmentName}
                            mimeType={message.attachmentMimeType}
                          />
                        ) : null}
                      </div>
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
                      <div className="space-y-2">
                        {message.body ? (
                          <p className="text-sm leading-relaxed text-white">{message.body}</p>
                        ) : null}
                        {message.attachmentUrl ? (
                          <MessageAttachment
                            url={message.attachmentUrl}
                            name={message.attachmentName}
                            mimeType={message.attachmentMimeType}
                          />
                        ) : null}
                      </div>
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
        {attachment ? (
          <div className="mb-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex items-start gap-3">
              <img
                src={attachment.previewUrl}
                alt={attachment.file.name}
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {attachment.file.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {(attachment.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={clearAttachment}
                className="rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Remove
              </button>
            </div>
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-50"
            aria-label="Add image attachment"
            title="Add image"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21.44 11.05 12 20.49a5.5 5.5 0 1 1-7.78-7.78l9.44-9.44a3.5 3.5 0 0 1 4.95 4.95l-9.19 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.49" />
            </svg>
          </button>
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
            disabled={(!input.trim() && !attachment) || isSending}
            className="shrink-0 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </form>
        <p className="mt-1 px-2 text-[10px] text-slate-400">
          Signed in as {myName}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAttachmentChange}
        />
      </div>
    </div>
  );
}
