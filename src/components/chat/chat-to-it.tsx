"use client";

import { PageHeader } from "@/components/layout/page-header";
import { LiveSupportChat } from "@/components/chat/live-support-chat";
import { useHMSSession } from "@/modules/rbac/hooks";
import { formatDepartmentLabel } from "@/lib/chat/types";

export function ChatToIT() {
  const session = useHMSSession();
  const deptLabel = session ? formatDepartmentLabel(session.department) : "Department";

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-3">
      <PageHeader
        title="Chat to IT"
        description={`${deptLabel} · Get technical support from the IT team.`}
      />
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl shadow-sm">
        <LiveSupportChat
          channelType="department_it"
          targetDepartment="it"
          targetName="IT Support"
          targetRole="IT Department"
          placeholder="Describe your issue..."
          senderPortal="management"
          emptyStateDescription="Messages you send here will appear in the IT inbox."
        />
      </div>
    </div>
  );
}
