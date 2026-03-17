-- Seed role_permissions with the full permission set for each role.
-- Format: {department}:{resource}:{action}
-- Special: 'admin' receives a wildcard permission that app code treats as all-access.

-- ── admin ────────────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', '*:*:*');

-- ── hr_manager ───────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('hr_manager', 'hr:staff:read'),
  ('hr_manager', 'hr:staff:create'),
  ('hr_manager', 'hr:staff:update'),
  ('hr_manager', 'hr:leave:read'),
  ('hr_manager', 'hr:leave:approve'),
  ('hr_manager', 'hr:leave:reject'),
  ('hr_manager', 'hr:payroll:prepare'),
  ('hr_manager', 'hr:payroll:read'),
  ('hr_manager', 'hr:onboarding:create'),
  ('hr_manager', 'hr:onboarding:update'),
  ('hr_manager', 'hr:offboarding:create'),
  ('hr_manager', 'hr:offboarding:update'),
  ('hr_manager', 'hr:roles:read');

-- ── hod (head of department) ─────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('hod', 'rota:create'),
  ('hod', 'rota:edit'),
  ('hod', 'rota:read'),
  ('hod', 'leave:approve'),
  ('hod', 'leave:reject'),
  ('hod', 'department:reports:view'),
  ('hod', 'department:staff:view');

-- ── doctor ───────────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('doctor', 'patients:read'),
  ('doctor', 'patients:update'),
  ('doctor', 'consultations:create'),
  ('doctor', 'consultations:read'),
  ('doctor', 'consultations:update'),
  ('doctor', 'prescriptions:create'),
  ('doctor', 'prescriptions:read'),
  ('doctor', 'lab:tests:create'),
  ('doctor', 'lab:results:read'),
  ('doctor', 'nurses:admissions:create'),
  ('doctor', 'accounts:fees:read');

-- ── nurse ────────────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('nurse', 'patients:read'),
  ('nurse', 'patients:update'),
  ('nurse', 'vitals:create'),
  ('nurse', 'vitals:read'),
  ('nurse', 'medications:administer'),
  ('nurse', 'lab:samples:collect'),
  ('nurse', 'nursing:procedures:create'),
  ('nurse', 'nursing:handover:create'),
  ('nurse', 'nursing:observations:create');

-- ── pharmacist ───────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('pharmacist', 'pharmacy:prescriptions:read'),
  ('pharmacist', 'pharmacy:prescriptions:dispense'),
  ('pharmacist', 'pharmacy:inventory:read'),
  ('pharmacist', 'pharmacy:inventory:update'),
  ('pharmacist', 'pharmacy:restocking:create'),
  ('pharmacist', 'patients:read');

-- ── pharmacy_assistant ───────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('pharmacy_assistant', 'pharmacy:prescriptions:read'),
  ('pharmacy_assistant', 'pharmacy:inventory:read'),
  ('pharmacy_assistant', 'patients:read');

-- ── lab_scientist ────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('lab_scientist', 'lab:tests:read'),
  ('lab_scientist', 'lab:tests:process'),
  ('lab_scientist', 'lab:results:create'),
  ('lab_scientist', 'lab:results:update'),
  ('lab_scientist', 'lab:samples:receive'),
  ('lab_scientist', 'patients:read');

-- ── accountant ───────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('accountant', 'accounts:invoices:create'),
  ('accountant', 'accounts:invoices:read'),
  ('accountant', 'accounts:invoices:update'),
  ('accountant', 'accounts:payments:create'),
  ('accountant', 'accounts:payments:read'),
  ('accountant', 'accounts:payroll:process'),
  ('accountant', 'accounts:reports:read'),
  ('accountant', 'patients:read');

-- ── front_desk_staff ─────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('front_desk_staff', 'patients:create'),
  ('front_desk_staff', 'patients:read'),
  ('front_desk_staff', 'patients:update'),
  ('front_desk_staff', 'visits:create'),
  ('front_desk_staff', 'visits:read'),
  ('front_desk_staff', 'appointments:create'),
  ('front_desk_staff', 'appointments:read'),
  ('front_desk_staff', 'appointments:update');

-- ── store_keeper ─────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('store_keeper', 'store:inventory:read'),
  ('store_keeper', 'store:inventory:update'),
  ('store_keeper', 'store:requests:read'),
  ('store_keeper', 'store:requests:fulfill'),
  ('store_keeper', 'store:procurement:create');

-- ── it_staff ─────────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('it_staff', 'it:tickets:create'),
  ('it_staff', 'it:tickets:read'),
  ('it_staff', 'it:tickets:update'),
  ('it_staff', 'it:tickets:close'),
  ('it_staff', 'it:useraccess:read'),
  ('it_staff', 'it:useraccess:create'),
  ('it_staff', 'it:useraccess:revoke'),
  ('it_staff', 'it:system:read');

-- ── hr_staff (general HR, read-only) ─────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('hr_staff', 'hr:staff:read'),
  ('hr_staff', 'hr:leave:read'),
  ('hr_staff', 'hr:payroll:read');

-- ── viewer ───────────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
  ('viewer', 'patients:read'),
  ('viewer', 'accounts:reports:read');
