"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import {
  fetchChatInboxThreads,
  fetchChatMessages,
  formatChatListTime,
  sendChatMessage,
  subscribeToChatInbox,
  subscribeToChatThread,
} from "@/lib/chat/db";
import {
  formatDepartmentLabel,
  formatRoleLabel,
  type ChatMessage,
  type ChatTargetDepartment,
  type ChatThread,
} from "@/lib/chat/types";
import { useHMSSession } from "@/modules/rbac/hooks";
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
  "bg-indigo-500",
  "bg-pink-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ConversationItem({
  thread,
  active,
  onClick,
}: {
  thread: ChatThread;
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
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
          avatarColor(thread.requesterName),
        )}
      >
        {thread.requesterAvatarUrl ? (
          <img
            src={thread.requesterAvatarUrl}
            alt=""
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          getInitials(thread.requesterName)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold text-slate-900">{thread.requesterName}</p>
          <span className="shrink-0 text-xs text-slate-400">
            {formatChatListTime(thread.lastMessageAt)}
          </span>
        </div>
        <p className="truncate text-sm text-slate-500">
          {thread.lastMessagePreview || "No messages yet"}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
          {formatDepartmentLabel(thread.requesterDepartment)} · {thread.requesterRole}
        </p>
      </div>
    </button>
  );
}

export function ChatManagement({
  targetDepartment,
  title,
  subtitle,
}: {
  targetDepartment: ChatTargetDepartment;
  title: string;
  subtitle?: string;
}) {
  const session = useHMSSession();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState("");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const loadThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const nextThreads = await fetchChatInboxThreads(targetDepartment);
      setThreads(nextThreads);
      setActiveId((currentId) => {
        if (currentId && nextThreads.some((thread) => thread.id === currentId)) {
          return currentId;
        }
        return nextThreads[0]?.id ?? null;
      });
    } finally {
      setLoadingThreads(false);
    }
  }, [targetDepartment]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      if (!session) return;
      setLoadingMessages(true);
      try {
        const nextMessages = await fetchChatMessages(threadId, session.staff_id);
        setMessages(nextMessages);
      } finally {
        setLoadingMessages(false);
      }
    },
    [session],
  );

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => subscribeToChatInbox(targetDepartment, () => {
    void loadThreads();
  }), [loadThreads, targetDepartment]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }

    void loadMessages(activeId);
  }, [activeId, loadMessages]);

  useEffect(() => {
    if (!activeId) return;
    return subscribeToChatThread(activeId, () => {
      void loadThreads();
      void loadMessages(activeId);
    });
  }, [activeId, loadMessages, loadThreads]);

  const filteredThreads = useMemo(
    () =>
      threads.filter((thread) => {
        const value = search.toLowerCase();
        return (
          thread.requesterName.toLowerCase().includes(value) ||
          thread.requesterEmail.toLowerCase().includes(value) ||
          thread.requesterRole.toLowerCase().includes(value) ||
          formatDepartmentLabel(thread.requesterDepartment).toLowerCase().includes(value)
        );
      }),
    [search, threads],
  );

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeId) ?? null,
    [activeId, threads],
  );

  async function handleSend(body: string, attachmentFile: File | null = null) {
    if (!session || !activeThread) return;

    setSending(true);
    try {
      await sendChatMessage({
        threadId: activeThread.id,
        senderId: session.staff_id,
        senderName: session.full_name,
        senderRole: formatRoleLabel(session.role),
        senderPortal: "management",
        body,
        attachmentFile,
      });
      await Promise.all([loadThreads(), loadMessages(activeThread.id)]);
    } finally {
      setSending(false);
    }
  }

  const myInitials = session
    ? getInitials(session.full_name)
    : targetDepartment.toUpperCase();

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[400px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:h-[calc(100vh-9rem)]">
      <div
        className={cn(
          "flex-col border-r border-slate-200 bg-white",
          "w-full md:w-[320px] md:shrink-0",
          mobileView === "chat" ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-bold text-[var(--accent)]">
            {myInitials}
          </div>
        </div>

        <div className="border-b border-slate-100 px-3 py-2">
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations..."
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingThreads ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">Loading conversations...</p>
          ) : null}

          {!loadingThreads && filteredThreads.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              No conversations found in Supabase.
            </p>
          ) : null}

          {!loadingThreads &&
            filteredThreads.map((thread) => (
              <ConversationItem
                key={thread.id}
                thread={thread}
                active={thread.id === activeId}
                onClick={() => {
                  setActiveId(thread.id);
                  setMobileView("chat");
                }}
              />
            ))}
        </div>
      </div>

      <div
        className={cn(
          "min-w-0 flex-col",
          "md:flex md:flex-1",
          mobileView === "list" ? "hidden md:flex" : "flex flex-1",
        )}
      >
        {/* Back button — mobile only */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--accent)]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
        </div>

        {activeThread ? (
          <ChatWindow
            contactName={activeThread.requesterName}
            contactRole={`${activeThread.requesterRole} · ${formatDepartmentLabel(activeThread.requesterDepartment)}`}
            contactAvatarUrl={activeThread.requesterAvatarUrl}
            messages={messages}
            placeholder={`Message ${activeThread.requesterName}...`}
            myName={session?.full_name ?? title}
            onSend={handleSend}
            isLoading={loadingMessages}
            isSending={sending}
            emptyStateTitle="No messages in this thread yet"
            emptyStateDescription="The conversation has been created, but nobody has sent a message yet."
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
              <p className="mt-3 text-sm font-medium text-slate-500">No live conversations yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Threads will appear here once staff or departments send a message.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
