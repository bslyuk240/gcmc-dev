import { ChatManagement } from "@/components/chat/chat-management";
import type { Conversation } from "@/components/chat/chat-management";
import { PageHeader } from "@/components/layout/page-header";

const CONVERSATIONS: Conversation[] = [
  {
    id: "conv-amaka",
    name: "Dr. Amaka Osei",
    role: "Senior Doctor",
    department: "Doctors",
    lastMessage: "I've submitted the form already, please check.",
    lastTime: "10:55",
    unread: 2,
    status: "online",
    messages: [
      { id: "1", sender: "Dr. Amaka Osei", senderRole: "Senior Doctor", body: "Hi HR, I'd like to apply for annual leave for December 20–31.", time: "10:40", isOwn: false },
      { id: "2", sender: "HR", senderRole: "HR", body: "Hello Dr. Osei! Please fill in the leave request form in your profile and we'll process it within 24 hours.", time: "10:45", isOwn: true, status: "read" },
      { id: "3", sender: "Dr. Amaka Osei", senderRole: "Senior Doctor", body: "Done, submitted just now.", time: "10:50", isOwn: false },
      { id: "4", sender: "Dr. Amaka Osei", senderRole: "Senior Doctor", body: "I've submitted the form already, please check.", time: "10:55", isOwn: false },
    ],
  },
  {
    id: "conv-patricia",
    name: "Nurse Patricia",
    role: "Registered Nurse",
    department: "Nurses",
    lastMessage: "When does my contract expire exactly?",
    lastTime: "10:30",
    unread: 1,
    status: "online",
    messages: [
      { id: "1", sender: "Nurse Patricia", senderRole: "Registered Nurse", body: "Good morning! I received a notification about my contract renewal.", time: "10:20", isOwn: false },
      { id: "2", sender: "HR", senderRole: "HR", body: "Good morning Patricia! Yes, your contract is due for renewal on January 31st.", time: "10:25", isOwn: true, status: "read" },
      { id: "3", sender: "Nurse Patricia", senderRole: "Registered Nurse", body: "When does my contract expire exactly?", time: "10:30", isOwn: false },
    ],
  },
  {
    id: "conv-james",
    name: "James Adu",
    role: "Pharmacist",
    department: "Pharmacy",
    lastMessage: "I need payslips for the last 3 months for my loan application.",
    lastTime: "09:45",
    unread: 0,
    status: "away",
    messages: [
      { id: "1", sender: "James Adu", senderRole: "Pharmacist", body: "Hello HR, can I get printed payslips for the last 3 months? I need them for a mortgage application.", time: "09:40", isOwn: false },
      { id: "2", sender: "HR", senderRole: "HR", body: "Hi James! Your payslips are available in your profile under the Payroll section. You can download them directly.", time: "09:43", isOwn: true, status: "read" },
      { id: "3", sender: "James Adu", senderRole: "Pharmacist", body: "I need payslips for the last 3 months for my loan application.", time: "09:45", isOwn: false },
    ],
  },
  {
    id: "conv-sarah",
    name: "Sarah Mensah",
    role: "Accounts Officer",
    department: "Accounts",
    lastMessage: "Maternity leave form is ready for your review.",
    lastTime: "09:10",
    unread: 0,
    status: "offline",
    messages: [
      { id: "1", sender: "Sarah Mensah", senderRole: "Accounts Officer", body: "Hi, I'm planning to go on maternity leave starting February 1st.", time: "09:00", isOwn: false },
      { id: "2", sender: "HR", senderRole: "HR", body: "Congratulations Sarah! Please submit the maternity leave form at least 8 weeks before your due date.", time: "09:05", isOwn: true, status: "read" },
      { id: "3", sender: "Sarah Mensah", senderRole: "Accounts Officer", body: "Maternity leave form is ready for your review.", time: "09:10", isOwn: false },
    ],
  },
  {
    id: "conv-tom",
    name: "Tom Kwesi",
    role: "Receptionist",
    department: "Front Desk",
    lastMessage: "Could I switch to the morning shift permanently?",
    lastTime: "Yesterday",
    unread: 0,
    status: "offline",
    messages: [
      { id: "1", sender: "Tom Kwesi", senderRole: "Receptionist", body: "Hi HR, I'd like to request a permanent switch to the morning shift (7am–3pm) if possible.", time: "Yesterday 14:00", isOwn: false },
      { id: "2", sender: "HR", senderRole: "HR", body: "Hi Tom! We'll review available shifts and discuss with your supervisor. Expect a response by end of the week.", time: "Yesterday 14:30", isOwn: true, status: "read" },
      { id: "3", sender: "Tom Kwesi", senderRole: "Receptionist", body: "Could I switch to the morning shift permanently?", time: "Yesterday", isOwn: false },
    ],
  },
  {
    id: "conv-grace",
    name: "Grace Asante",
    role: "Store Keeper",
    department: "Store",
    lastMessage: "Onboarding documents sent. Please confirm receipt.",
    lastTime: "2 days ago",
    unread: 0,
    status: "offline",
    messages: [
      { id: "1", sender: "Grace Asante", senderRole: "Store Keeper", body: "Hello, I just started last week and still haven't received my official appointment letter.", time: "2 days ago 09:00", isOwn: false },
      { id: "2", sender: "HR", senderRole: "HR", body: "Welcome Grace! We'll resend your appointment letter and onboarding pack today.", time: "2 days ago 09:30", isOwn: true, status: "read" },
      { id: "3", sender: "Grace Asante", senderRole: "Store Keeper", body: "Onboarding documents sent. Please confirm receipt.", time: "2 days ago", isOwn: false },
    ],
  },
];

export default function HRChatPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Chat Inbox"
        description="Incoming messages from staff members across the hospital."
      />
      <ChatManagement
        title="HR Inbox"
        subtitle="Staff conversations"
        conversations={CONVERSATIONS}
        myName="HR Team"
        myRole="HR"
      />
    </div>
  );
}
