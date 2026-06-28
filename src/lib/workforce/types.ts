export type WorkforceTaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "overdue";
export type WorkforceTaskPriority = "routine" | "urgent" | "stat";
export type WorkforceTaskCategory =
  | "general"
  | "transport_trip"
  | "security_post"
  | "cleaning_zone"
  | "store_task"
  | "maintenance";

export type WorkforceTask = {
  id: string;
  hospitalId: string;
  department: string;
  unitName: string;
  title: string;
  description?: string;
  category: WorkforceTaskCategory;
  assigneeId?: string;
  assigneeName?: string;
  assignedBy?: string;
  status: WorkforceTaskStatus;
  priority: WorkforceTaskPriority;
  dueAt?: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WorkforceMetrics = {
  onDutyToday: number;
  absentToday: number;
  onLeave: number;
  pendingLeave: number;
  assignedTasks: number;
  completedTasksToday: number;
  overdueTasks: number;
  unitStaffTotal: number;
  unitStaffActive: number;
};

export type WorkforceUnitOverview = {
  unitName: string;
  totalStaff: number;
  activeStaff: number;
  onLeave: number;
  absentToday: number;
  attendanceRate: number;
  pendingTasks: number;
};

export type PlatformHospitalWorkforceSummary = {
  hospitalId: string;
  hospitalName: string;
  hospitalSlug: string;
  hospitalStatus: string;
  metrics: WorkforceMetrics;
  units: WorkforceUnitOverview[];
};
