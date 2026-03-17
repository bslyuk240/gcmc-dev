import { ChatManagement } from "@/components/chat/chat-management";
import type { Conversation } from "@/components/chat/chat-management";
import { PageHeader } from "@/components/layout/page-header";

const CONVERSATIONS: Conversation[] = [
  {
    id: "conv-frontdesk",
    name: "Front Desk",
    role: "Front Desk",
    department: "Front Desk",
    lastMessage: "Printer in registration area is not working.",
    lastTime: "10:42",
    unread: 2,
    status: "online",
    messages: [
      { id: "1", sender: "Front Desk", senderRole: "Front Desk", body: "Good morning! The printer in the registration area has stopped working.", time: "10:35", isOwn: false },
      { id: "2", sender: "Front Desk", senderRole: "Front Desk", body: "Patients are queuing and we can't print admission forms.", time: "10:36", isOwn: false },
      { id: "3", sender: "IT Support", senderRole: "IT", body: "Thanks for letting us know. Is the printer showing any error lights?", time: "10:38", isOwn: true, status: "read" },
      { id: "4", sender: "Front Desk", senderRole: "Front Desk", body: "Yes, there's a red light flashing on the left side.", time: "10:40", isOwn: false },
      { id: "5", sender: "Front Desk", senderRole: "Front Desk", body: "Printer in registration area is not working.", time: "10:42", isOwn: false },
    ],
  },
  {
    id: "conv-nurses",
    name: "Ward 3 Nurses",
    role: "Nursing",
    department: "Nurses",
    lastMessage: "The terminal in Bay 3 is completely offline.",
    lastTime: "10:15",
    unread: 3,
    status: "online",
    messages: [
      { id: "1", sender: "Nurse Patricia", senderRole: "Nurses", body: "Hi IT, the computer terminal in Ward 3, Bay 3 has been offline since this morning.", time: "09:50", isOwn: false },
      { id: "2", sender: "Nurse Patricia", senderRole: "Nurses", body: "We can't access patient records or log MAR entries.", time: "09:51", isOwn: false },
      { id: "3", sender: "IT Support", senderRole: "IT", body: "Acknowledged. We'll dispatch someone shortly. In the meantime, use the nurses' station terminal.", time: "10:00", isOwn: true, status: "read" },
      { id: "4", sender: "Nurse Patricia", senderRole: "Nurses", body: "Understood, thanks.", time: "10:02", isOwn: false },
      { id: "5", sender: "Nurse Patricia", senderRole: "Nurses", body: "Just to update — it's been 15 minutes and still offline.", time: "10:10", isOwn: false },
      { id: "6", sender: "Nurse Patricia", senderRole: "Nurses", body: "The terminal in Bay 3 is completely offline.", time: "10:15", isOwn: false },
    ],
  },
  {
    id: "conv-admin",
    name: "Admin Office",
    role: "Administration",
    department: "Admin",
    lastMessage: "Audit export for last month ready?",
    lastTime: "09:24",
    unread: 0,
    status: "away",
    messages: [
      { id: "1", sender: "Admin", senderRole: "Management", body: "Can we get the audit export for last month by EOD?", time: "09:22", isOwn: false },
      { id: "2", sender: "IT Support", senderRole: "IT", body: "Yes, I'll run it after the backup finishes. Should be ready by 11.", time: "09:24", isOwn: true, status: "read" },
      { id: "3", sender: "Admin", senderRole: "Management", body: "Audit export for last month ready?", time: "09:24", isOwn: false },
    ],
  },
  {
    id: "conv-pharmacy",
    name: "Pharmacy",
    role: "Pharmacy",
    department: "Pharmacy",
    lastMessage: "System has been slow since the update yesterday.",
    lastTime: "08:55",
    unread: 1,
    status: "online",
    messages: [
      { id: "1", sender: "Pharmacy", senderRole: "Pharmacy", body: "After yesterday's system update, the dispensing module is running very slowly.", time: "08:50", isOwn: false },
      { id: "2", sender: "IT Support", senderRole: "IT", body: "Thanks for flagging. We're aware of the performance issue and are investigating.", time: "08:53", isOwn: true, status: "delivered" },
      { id: "3", sender: "Pharmacy", senderRole: "Pharmacy", body: "System has been slow since the update yesterday.", time: "08:55", isOwn: false },
    ],
  },
  {
    id: "conv-doctors",
    name: "Doctors",
    role: "Medical",
    department: "Doctors",
    lastMessage: "Dr. Chen needs access to the new EMR module.",
    lastTime: "Yesterday",
    unread: 0,
    status: "offline",
    messages: [
      { id: "1", sender: "Dr. Osei", senderRole: "Doctors", body: "Dr. Chen has joined the department and needs access to the EMR consultation module.", time: "Yesterday 14:20", isOwn: false },
      { id: "2", sender: "IT Support", senderRole: "IT", body: "Noted. We'll need her staff ID and role confirmation from HR before provisioning access.", time: "Yesterday 14:35", isOwn: true, status: "read" },
      { id: "3", sender: "Dr. Osei", senderRole: "Doctors", body: "Staff ID is D-2847. HR confirmation was sent over email.", time: "Yesterday 14:40", isOwn: false },
      { id: "4", sender: "IT Support", senderRole: "IT", body: "Received. Access has been provisioned. Dr. Chen can now log in.", time: "Yesterday 15:10", isOwn: true, status: "read" },
      { id: "5", sender: "Dr. Osei", senderRole: "Doctors", body: "Dr. Chen needs access to the new EMR module.", time: "Yesterday", isOwn: false },
    ],
  },
  {
    id: "conv-accounts",
    name: "Accounts",
    role: "Finance",
    department: "Accounts",
    lastMessage: "Need the billing module export access.",
    lastTime: "Yesterday",
    unread: 0,
    status: "offline",
    messages: [
      { id: "1", sender: "Accounts", senderRole: "Finance", body: "Hello, can we get export access for the billing module? We need to run monthly reports.", time: "Yesterday 11:00", isOwn: false },
      { id: "2", sender: "IT Support", senderRole: "IT", body: "Sure. Who specifically needs this? We'll update the role permissions.", time: "Yesterday 11:15", isOwn: true, status: "read" },
      { id: "3", sender: "Accounts", senderRole: "Finance", body: "Need the billing module export access.", time: "Yesterday", isOwn: false },
    ],
  },
];

export default function ITChatPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Chat Inbox"
        description="All incoming support chats from departments across the hospital."
      />
      <ChatManagement
        title="IT Inbox"
        subtitle="Incoming department chats"
        conversations={CONVERSATIONS}
        myName="IT Support"
        myRole="IT"
      />
    </div>
  );
}
