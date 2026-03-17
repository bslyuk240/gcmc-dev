"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { SimpleChat, type ChatMessage } from "@/components/chat/simple-chat";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

const CHANNELS = [
  { id: "it" as const, label: "Chat to IT", description: "Management → IT" },
  { id: "staff-hr" as const, label: "Chat to HR", description: "Staff profile → HR" },
];

const IT_MESSAGES: ChatMessage[] = [
  { id: "1", sender: "IT", senderRole: "IT", body: "Access reset for Front Desk completed. They can log in again.", time: "09:15", isOwn: false },
  { id: "2", sender: "Admin", senderRole: "Management", body: "Can we get the audit export for last month by EOD?", time: "09:22", isOwn: false },
  { id: "3", sender: "IT", senderRole: "IT", body: "Yes, I'll run it after the backup finishes.", time: "09:24", isOwn: false },
];

const HR_MESSAGES: ChatMessage[] = [
  { id: "1", sender: "HR", senderRole: "HR", body: "Your leave request for next week has been approved.", time: "10:00", isOwn: false },
  { id: "2", sender: "You", body: "Thanks. Can I get a copy of my contract for the mortgage application?", time: "10:05", isOwn: true },
  { id: "3", sender: "HR", senderRole: "HR", body: "Sure, we'll upload it to your Documents by end of day.", time: "10:12", isOwn: false },
];

type ChannelId = "it" | "staff-hr";

export function ChatPageClient() {
  const router = useRouter();
  const search = useSearchParams();
  const channelParam = search?.get("channel");
  const channel: ChannelId = channelParam === "staff-hr" ? "staff-hr" : "it";

  const setChannel = useCallback(
    (id: ChannelId) => {
      const url = id === "staff-hr" ? `${INTERNAL_PREFIX}/chat?channel=staff-hr` : `${INTERNAL_PREFIX}/chat`;
      router.push(url);
    },
    [router],
  );

  const config = useMemo(() => {
    if (channel === "staff-hr") {
      return {
        title: "Chat to HR",
        placeholder: "Type a message or paste image...",
        initialMessages: HR_MESSAGES,
        channelId: "staff-hr",
        otherPartyName: "HR",
        otherPartyRole: "HR",
      };
    }
    return {
      title: "Chat to IT",
      placeholder: "Type a message or paste image...",
      initialMessages: IT_MESSAGES,
      channelId: "it-management",
      otherPartyName: "IT",
      otherPartyRole: "IT",
    };
  }, [channel]);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-slate-50 p-1">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChannel(c.id)}
            className={cn(
              "flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition",
              channel === c.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <SimpleChat
        title={config.title}
        placeholder={config.placeholder}
        initialMessages={config.initialMessages}
        channelId={config.channelId}
        otherPartyName={config.otherPartyName}
        otherPartyRole={config.otherPartyRole}
      />
    </div>
  );
}
