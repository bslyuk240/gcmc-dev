"use client";

import { PageHeader } from "@/components/layout/page-header";
import { LiveSupportChat } from "@/components/chat/live-support-chat";

export function ChatToHR() {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-3">
      <PageHeader
        title="Chat to HR"
        description="Send messages to HR from your staff portal."
      />
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl shadow-sm">
        <LiveSupportChat
          channelType="staff_hr"
          targetDepartment="hr"
          targetName="HR Team"
          targetRole="Human Resources"
          placeholder="Type your message to HR..."
          senderPortal="staff"
          emptyStateDescription="Messages you send here will appear in the HR inbox."
        />
      </div>
    </div>
  );
}
