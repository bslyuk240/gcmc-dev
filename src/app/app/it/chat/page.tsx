import { ChatManagement } from "@/components/chat/chat-management";
import { PageHeader } from "@/components/layout/page-header";

export default function ITChatPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Chat Inbox"
        description="All incoming support chats from departments across the hospital."
      />
      <ChatManagement
        targetDepartment="it"
        title="IT Inbox"
        subtitle="Incoming department chats"
      />
    </div>
  );
}
