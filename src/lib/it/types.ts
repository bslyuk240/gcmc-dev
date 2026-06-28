export type ITTicketPriority = "Low" | "Medium" | "High" | "Critical" | "Normal" | "Urgent";
export type ITTicketStatus = "Open" | "In Progress" | "Resolved" | "Closed";
export type ITTicketCategory = "Network" | "Access" | "Software" | "Hardware" | "Email" | "System" | "Other";

export type ITTicket = {
  id: string;
  ticketRef: string;
  title: string;
  description: string;
  category: ITTicketCategory;
  department: string;
  priority: ITTicketPriority;
  status: ITTicketStatus;
  assignedTo: string;
  assignedToId: string | null;
  openedBy: string;
  openedById: string | null;
  openedAt: string;
  resolvedAt: string | null;
};

export type ITStaffRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: "Active" | "Inactive";
  isActive: boolean;
};
