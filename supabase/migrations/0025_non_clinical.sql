-- Non-clinical staff permissions
-- Cleaners, security, maintenance, catering, housekeeping, porters, etc.
-- These staff have no clinical access — staff portal only.
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('non_clinical_staff', 'staff:profile:read'),
  ('non_clinical_staff', 'staff:payslips:read'),
  ('non_clinical_staff', 'staff:leave:read'),
  ('non_clinical_staff', 'staff:rota:read')
ON CONFLICT DO NOTHING;
