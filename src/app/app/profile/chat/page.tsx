import { ChatWindow } from "@/components/chat/chat-window";
import { PageHeader } from "@/components/layout/page-header";
import type { ChatMessage } from "@/components/chat/chat-window";

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    sender: "HR Team",
    senderRole: "HR",
    body: "Hello! How can we help you today? You can ask about leave, payroll, contracts, or any HR-related queries.",
    time: "09:00",
    isOwn: false,
  },
  {
    id: "2",
    sender: "HR Team",
    senderRole: "HR",
    body: "Your leave request for next week has been approved. Enjoy your time off!",
    time: "10:00",
    isOwn: false,
  },
  {
    id: "3",
    sender: "You",
    body: "Thanks. Can I get a copy of my contract for a mortgage application?",
    time: "10:05",
    isOwn: true,
    status: "read",
  },
  {
    id: "4",
    sender: "HR Team",
    senderRole: "HR",
    body: "Sure! We'll upload it to your Documents section by end of day. Is there anything else you need?",
    time: "10:12",
    isOwn: false,
  },
];

export default function ProfileChatPage() {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-3">
      <PageHeader
        title="Chat to HR"
        description="Get help with leave, payroll, contracts, and other HR queries."
      />
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl shadow-sm">
        <ChatWindow
          contactName="HR Team"
          contactRole="Human Resources"
          contactStatus="online"
          initialMessages={INITIAL_MESSAGES}
          channelId="staff-to-hr"
          placeholder="Ask HR a question..."
          myName="You"
        />
      </div>
    </div>
  );
}
