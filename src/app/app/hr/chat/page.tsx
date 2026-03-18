import { ChatManagement } from "@/components/chat/chat-management";
import { PageHeader } from "@/components/layout/page-header";

export default function HRChatPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Chat Inbox"
        description="Incoming messages from staff members across the hospital."
      />
      <ChatManagement
        targetDepartment="hr"
        title="HR Inbox"
        subtitle="Staff conversations"
      />
    </div>
  );
}
