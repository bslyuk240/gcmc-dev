"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatWindow } from "@/components/chat/chat-window";
import {
  createChatThread,
  fetchChatMessages,
  fetchChatThread,
  sendChatMessage,
  subscribeToChatThread,
} from "@/lib/chat/db";
import type {
  ChatChannelType,
  ChatMessage,
  ChatSenderPortal,
  ChatTargetDepartment,
  ChatThread,
} from "@/lib/chat/types";
import { formatRoleLabel } from "@/lib/chat/types";
import { useHMSSession } from "@/modules/rbac/hooks";
import type { DBDepartmentKey } from "@/lib/constants/navigation";

export function LiveSupportChat({
  channelType,
  targetDepartment,
  targetName,
  targetRole,
  placeholder,
  senderPortal,
  emptyStateDescription,
}: {
  channelType: ChatChannelType;
  targetDepartment: ChatTargetDepartment;
  targetName: string;
  targetRole: string;
  placeholder: string;
  senderPortal: ChatSenderPortal;
  emptyStateDescription: string;
}) {
  const session = useHMSSession();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadThread = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    try {
      const nextThread = await fetchChatThread({
        channelType,
        requesterId: session.staff_id,
        targetDepartment,
      });

      setThread(nextThread);

      if (nextThread) {
        const nextMessages = await fetchChatMessages(nextThread.id, session.staff_id);
        setMessages(nextMessages);
      } else {
        setMessages([]);
      }
    } finally {
      setLoading(false);
    }
  }, [channelType, session, targetDepartment]);

  useEffect(() => {
    void loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (!thread?.id) return;
    return subscribeToChatThread(thread.id, () => {
      void loadThread();
    });
  }, [loadThread, thread?.id]);

  async function handleSend(body: string, attachmentFile: File | null = null) {
    if (!session) return;

    setSending(true);
    try {
      let currentThread = thread;

      if (!currentThread) {
        currentThread = await createChatThread({
          channelType,
          requesterId: session.staff_id,
          requesterName: session.full_name,
          requesterEmail: session.email,
          requesterRole: formatRoleLabel(session.role),
          requesterDepartment: session.department as DBDepartmentKey,
          targetDepartment,
        });
        setThread(currentThread);
      }

      if (!currentThread) return;

      await sendChatMessage({
        threadId: currentThread.id,
        senderId: session.staff_id,
        senderName: session.full_name,
        senderRole: formatRoleLabel(session.role),
        senderPortal,
        body,
        attachmentFile,
      });

      const nextMessages = await fetchChatMessages(currentThread.id, session.staff_id);
      setMessages(nextMessages);
    } finally {
      setSending(false);
    }
  }

  return (
    <ChatWindow
      contactName={targetName}
      contactRole={targetRole}
      messages={messages}
      placeholder={placeholder}
      myName={session?.full_name ?? "You"}
      onSend={handleSend}
      isLoading={loading}
      isSending={sending}
      emptyStateTitle="No messages yet"
      emptyStateDescription={emptyStateDescription}
    />
  );
}
