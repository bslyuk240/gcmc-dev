"use client";

import { createClient } from "@/lib/supabase/client";
import type { DBDepartmentKey } from "@/lib/constants/navigation";
import type {
  ChatChannelType,
  ChatMessage,
  ChatSenderPortal,
  ChatTargetDepartment,
  ChatThread,
  ChatSendAttachment,
} from "@/lib/chat/types";
import {
  formatChatListTime,
  formatChatMessageTime,
} from "@/lib/chat/types";

type ChatThreadRow = {
  id: string;
  channel_type: ChatChannelType;
  requester_id: string;
  requester_name: string;
  requester_email: string | null;
  requester_role: string;
  requester_avatar_url: string | null;
  requester_department: DBDepartmentKey;
  target_department: ChatTargetDepartment;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string | null;
  sender_portal: ChatSenderPortal;
  body: string;
  attachment_url: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_mime_type: string | null;
  created_at: string;
};

const CHAT_MEDIA_BUCKET = "chat-media";

function getSupabase() {
  return createClient();
}

function buildAttachmentPreview(body: string, hasAttachment: boolean) {
  const text = body.trim() || (hasAttachment ? "[Image]" : "");
  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function mapThread(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    channelType: row.channel_type,
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    requesterEmail: row.requester_email ?? "",
    requesterRole: row.requester_role,
    requesterAvatarUrl: row.requester_avatar_url ?? undefined,
    requesterDepartment: row.requester_department,
    targetDepartment: row.target_department,
    lastMessagePreview: row.last_message_preview ?? "",
    lastMessageAt: row.last_message_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(
  row: ChatMessageRow,
  currentUserId?: string,
  sb = getSupabase(),
): ChatMessage {
  const attachmentUrl =
    row.attachment_url ??
    (row.attachment_path && sb
      ? sb.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(row.attachment_path).data.publicUrl
      : undefined);

  return {
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    sender: row.sender_name,
    senderRole: row.sender_role ?? undefined,
    senderPortal: row.sender_portal,
    body: row.body,
    attachmentUrl,
    attachmentPath: row.attachment_path ?? undefined,
    attachmentName: row.attachment_name ?? undefined,
    attachmentMimeType: row.attachment_mime_type ?? undefined,
    createdAt: row.created_at,
    time: formatChatMessageTime(row.created_at),
    isOwn: row.sender_id === currentUserId,
  };
}

export async function fetchChatThread(args: {
  channelType: ChatChannelType;
  requesterId: string;
  targetDepartment: ChatTargetDepartment;
}) {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from("chat_threads")
    .select("*")
    .eq("channel_type", args.channelType)
    .eq("requester_id", args.requesterId)
    .eq("target_department", args.targetDepartment)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapThread(data as ChatThreadRow) : null;
}

export async function createChatThread(args: {
  channelType: ChatChannelType;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  requesterAvatarUrl?: string;
  requesterDepartment: DBDepartmentKey;
  targetDepartment: ChatTargetDepartment;
}) {
  const sb = getSupabase();
  if (!sb) return null;

  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("chat_threads")
    .upsert(
      {
        channel_type: args.channelType,
        requester_id: args.requesterId,
        requester_name: args.requesterName,
        requester_email: args.requesterEmail,
        requester_role: args.requesterRole,
        requester_avatar_url: args.requesterAvatarUrl ?? null,
        requester_department: args.requesterDepartment,
        target_department: args.targetDepartment,
        updated_at: now,
      },
      {
        onConflict: "channel_type,requester_id,target_department",
      },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapThread(data as ChatThreadRow);
}

export async function fetchChatInboxThreads(targetDepartment: ChatTargetDepartment) {
  const sb = getSupabase();
  if (!sb) return [] as ChatThread[];

  const channelType: ChatChannelType =
    targetDepartment === "hr" ? "staff_hr" : "department_it";

  const { data, error } = await sb
    .from("chat_threads")
    .select("*")
    .eq("target_department", targetDepartment)
    .eq("channel_type", channelType)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapThread(row as ChatThreadRow));
}

export async function fetchChatMessages(threadId: string, currentUserId?: string) {
  const sb = getSupabase();
  if (!sb) return [] as ChatMessage[];

  const { data, error } = await sb
    .from("chat_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapMessage(row as ChatMessageRow, currentUserId, sb));
}

async function uploadChatAttachment(
  sb: NonNullable<ReturnType<typeof createClient>>,
  file: File,
  threadId: string,
  senderId: string,
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image";
  const path = `threads/${threadId}/${senderId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error } = await sb.storage.from(CHAT_MEDIA_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = sb.storage.from(CHAT_MEDIA_BUCKET).getPublicUrl(path);

  return {
    path,
    url: data.publicUrl,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function sendChatMessage(args: {
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderPortal: ChatSenderPortal;
  body: string;
  attachmentFile?: ChatSendAttachment;
}) {
  const sb = getSupabase();
  if (!sb) return null;

  const body = args.body.trim();
  const attachmentFile = args.attachmentFile ?? null;
  if (!body && !attachmentFile) {
    return null;
  }

  const now = new Date().toISOString();
  const attachment = attachmentFile
    ? await uploadChatAttachment(sb, attachmentFile, args.threadId, args.senderId)
    : null;

  const payload: Record<string, unknown> = {
    thread_id: args.threadId,
    sender_id: args.senderId,
    sender_name: args.senderName,
    sender_role: args.senderRole,
    sender_portal: args.senderPortal,
    body,
    created_at: now,
  };

  if (attachment) {
    payload.attachment_url = attachment.url;
    payload.attachment_path = attachment.path;
    payload.attachment_name = attachment.name;
    payload.attachment_mime_type = attachment.mimeType;
  }

  let data: ChatMessageRow | null = null;

  try {
    const response = await sb
      .from("chat_messages")
      .insert(payload)
      .select("*")
      .single();

    data = response.data as ChatMessageRow | null;

    if (response.error) {
      throw response.error;
    }
  } catch (error) {
    if (attachment) {
      await sb.storage.from(CHAT_MEDIA_BUCKET).remove([attachment.path]);
    }
    throw error;
  }

  const preview = buildAttachmentPreview(body, Boolean(attachment));
  const { error: threadError } = await sb
    .from("chat_threads")
    .update({
      last_message_preview: preview,
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", args.threadId);

  if (threadError) {
    throw threadError;
  }

  return mapMessage(data as ChatMessageRow, args.senderId, sb);
}

export function subscribeToChatThread(threadId: string, onChange: () => void) {
  const sb = getSupabase();
  if (!sb) return () => undefined;

  const channel = sb
    .channel(`chat-thread-${threadId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
        filter: `thread_id=eq.${threadId}`,
      },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_threads",
        filter: `id=eq.${threadId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
}

export function subscribeToChatInbox(
  targetDepartment: ChatTargetDepartment,
  onChange: () => void,
) {
  const sb = getSupabase();
  if (!sb) return () => undefined;

  const channel = sb
    .channel(`chat-inbox-${targetDepartment}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_threads",
      },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "chat_messages",
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
}

export { formatChatListTime };
