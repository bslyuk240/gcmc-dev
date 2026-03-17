export type AuditEntry = {
  action: string;
  module: string;
  recordId: string;
  actorUserId?: string;
  departmentId?: string;
  reason?: string;
  requestId?: string;
  before?: unknown;
  after?: unknown;
  createdAt: string;
};

export function buildAuditEntry(
  entry: Omit<AuditEntry, "createdAt">,
): AuditEntry {
  return {
    ...entry,
    createdAt: new Date().toISOString(),
  };
}
