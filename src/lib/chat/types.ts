import type { DBDepartmentKey } from "@/lib/constants/navigation";

export type ChatChannelType = "staff_hr" | "department_it";
export type ChatTargetDepartment = "hr" | "it";
export type ChatSenderPortal = "staff" | "management";

export type ChatThread = {
  id: string;
  channelType: ChatChannelType;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterRole: string;
  requesterAvatarUrl?: string;
  requesterDepartment: DBDepartmentKey;
  targetDepartment: ChatTargetDepartment;
  lastMessagePreview: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  sender: string;
  senderRole?: string;
  senderPortal: ChatSenderPortal;
  body: string;
  createdAt: string;
  time: string;
  isOwn: boolean;
};

export const CHAT_DEPARTMENT_LABELS: Record<DBDepartmentKey | ChatTargetDepartment, string> = {
  frontdesk: "Front Desk",
  doctors: "Doctors",
  nurses: "Nurses",
  pharmacy: "Pharmacy",
  lab: "Lab",
  accounts: "Accounts",
  store: "Store",
  admin: "Administration",
  hr: "HR",
  it: "IT",
};

export function formatRoleLabel(role: string) {
  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDepartmentLabel(department: DBDepartmentKey | ChatTargetDepartment | string) {
  return CHAT_DEPARTMENT_LABELS[department as keyof typeof CHAT_DEPARTMENT_LABELS] ?? formatRoleLabel(department);
}

export function formatChatMessageTime(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatChatListTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return formatChatMessageTime(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
