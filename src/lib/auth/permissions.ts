export const permissionCatalog = [
  "patients.create",
  "patients.read",
  "patients.update",
  "visits.create",
  "encounters.write",
  "prescriptions.create",
  "pharmacy.dispense",
  "inventory.adjust",
  "invoice.create",
  "payment.receive",
  "refund.approve",
  "staff.manage",
  "audit.view",
  "tickets.respond",
] as const;

export type Permission = (typeof permissionCatalog)[number];

export const routePermissions: Array<{
  prefix: string;
  anyOf: Permission[];
}> = [
  { prefix: "/frontdesk", anyOf: ["patients.create", "visits.create"] },
  { prefix: "/doctors", anyOf: ["patients.read", "encounters.write"] },
  { prefix: "/nurses", anyOf: ["patients.read", "encounters.write"] },
  { prefix: "/pharmacy", anyOf: ["patients.read", "pharmacy.dispense"] },
  { prefix: "/accounts", anyOf: ["invoice.create", "payment.receive"] },
  { prefix: "/admin", anyOf: ["audit.view", "refund.approve"] },
  { prefix: "/hr", anyOf: ["staff.manage"] },
  { prefix: "/it", anyOf: ["tickets.respond"] },
];

export function canAccessPath(pathname: string, permissions: Permission[]) {
  const rule = routePermissions.find((entry) => pathname.startsWith(entry.prefix));

  if (!rule) {
    return true;
  }

  return rule.anyOf.some((permission) => permissions.includes(permission));
}
