"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { ChatWindow, type ChatMessage } from "./chat-window";

export type Conversation = {
  id: string;
  name: string;
  role?: string;
  department?: string;
  lastMessage: string;
  lastTime: string;
  unread?: number;
  status?: "online" | "away" | "offline";
  messages: ChatMessage[];
};

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-pink-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function ConversationItem({
  conv,
  active,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-100",
        active && "bg-slate-100",
      )}
    >
      <div
        className={cn(
          "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
          avatarColor(conv.name),
        )}
      >
        {getInitials(conv.name)}
        {conv.status === "online" && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold text-slate-900">{conv.name}</p>
          <span className="shrink-0 text-xs text-slate-400">{conv.lastTime}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm text-slate-500">{conv.lastMessage}</p>
          {conv.unread ? (
            <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
              {conv.unread}
            </span>
          ) : null}
        </div>
        {conv.department && (
          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
            {conv.department}
          </p>
        )}
      </div>
    </button>
  );
}

export function ChatManagement({
  title,
  subtitle,
  conversations: initialConversations,
  myName,
  myRole,
}: {
  title: string;
  subtitle?: string;
  conversations: Conversation[];
  myName: string;
  myRole?: string;
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversations[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");

  const filtered = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.department?.toLowerCase().includes(search.toLowerCase()),
  );

  const active = conversations.find((c) => c.id === activeId) ?? null;

  function handleSelectConversation(id: string) {
    setActiveId(id);
    // Mark as read
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[400px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:h-[calc(100vh-9rem)]">
      {/* Left: conversation list */}
      <div className="flex w-[320px] shrink-0 flex-col border-r border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-bold text-[var(--accent)]">
            {myName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
        </div>
        {/* Search */}
        <div className="px-3 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
            <svg
              className="h-4 w-4 shrink-0 text-slate-400"
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
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
        {/* Conversation list */}
        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No conversations found.</p>
          )}
          {filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeId}
              onClick={() => handleSelectConversation(conv.id)}
            />
          ))}
        </div>
      </div>

      {/* Right: chat window */}
      <div className="min-w-0 flex-1">
        {active ? (
          <ChatWindow
            contactName={active.name}
            contactRole={active.role ?? active.department}
            contactStatus={active.status ?? "online"}
            initialMessages={active.messages}
            channelId={active.id}
            placeholder={`Message ${active.name}...`}
            myName={`${myName}${myRole ? ` (${myRole})` : ""}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#f0f2f5]">
            <div className="text-center">
              <svg
                className="mx-auto h-16 w-16 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="mt-3 text-sm font-medium text-slate-500">Select a conversation</p>
              <p className="mt-1 text-xs text-slate-400">Choose from your inbox on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
