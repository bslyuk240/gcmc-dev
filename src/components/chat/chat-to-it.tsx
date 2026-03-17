"use client";

import { ChatWindow } from "./chat-window";
import { PageHeader } from "@/components/layout/page-header";
import type { ChatMessage } from "./chat-window";

const SEED_MESSAGES: ChatMessage[] = [
  {
    id: "seed-1",
    sender: "IT Support",
    senderRole: "IT",
    body: "Hello! How can we help you today? Please describe your issue and we'll assist as soon as possible.",
    time: "09:00",
    isOwn: false,
  },
];

/**
 * Reusable page body used by every department's /chat route.
 * dept        – URL segment, e.g. "pharmacy"
 * deptLabel   – Display name shown to IT, e.g. "Pharmacy"
 * staffName   – Current user's name (mock)
 * staffRole   – Current user's role (mock)
 */
export function ChatToIT({
  deptLabel,
  staffName,
  staffRole,
}: {
  dept: string;
  deptLabel: string;
  staffName: string;
  staffRole: string;
}) {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-3">
      <PageHeader
        title="Chat to IT"
        description={`${deptLabel} · Get technical support from the IT team.`}
      />
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl shadow-sm">
        <ChatWindow
          contactName="IT Support"
          contactRole="IT Department"
          contactStatus="online"
          initialMessages={SEED_MESSAGES}
          channelId={`chat-to-it`}
          placeholder="Describe your issue…"
          myName={staffName}
          mySubtitle={`${staffRole} · ${deptLabel}`}
        />
      </div>
    </div>
  );
}
