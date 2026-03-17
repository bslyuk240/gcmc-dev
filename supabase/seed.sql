-- Seed roles/permissions and sample data (run after migrations)

-- Role permissions: grant department access by role
insert into public.role_permissions (role, permission) values
  ('admin', 'admin:*'),
  ('admin', 'frontdesk:*'),
  ('admin', 'doctors:*'),
  ('admin', 'nurses:*'),
  ('admin', 'pharmacy:*'),
  ('admin', 'accounts:*'),
  ('admin', 'store:*'),
  ('admin', 'hr:*'),
  ('admin', 'it:*'),
  ('front_desk_staff', 'frontdesk:*'),
  ('doctor', 'doctors:*'),
  ('doctor', 'frontdesk:patients:read'),
  ('nurse', 'nurses:*'),
  ('nurse', 'frontdesk:patients:read'),
  ('pharmacist', 'pharmacy:*'),
  ('pharmacist', 'doctors:prescriptions:read'),
  ('accountant', 'accounts:*'),
  ('accountant', 'frontdesk:patients:read'),
  ('store_keeper', 'store:*'),
  ('hr_staff', 'hr:*'),
  ('it_staff', 'it:*'),
  ('it_staff', 'support:*'),
  ('viewer', 'frontdesk:read'),
  ('viewer', 'doctors:read'),
  ('viewer', 'nurses:read'),
  ('viewer', 'pharmacy:read'),
  ('viewer', 'accounts:read')
on conflict (role, permission) do nothing;

-- Sample medications for prescription builder
insert into public.medications (name, form_strength, route) values
  ('Paracetamol', '500mg tablet', 'oral'),
  ('Amoxicillin', '500mg capsule', 'oral'),
  ('Ibuprofen', '400mg tablet', 'oral'),
  ('Omeprazole', '20mg capsule', 'oral'),
  ('Chlorpheniramine', '4mg tablet', 'oral'),
  ('Metformin', '500mg tablet', 'oral'),
  ('Lisinopril', '10mg tablet', 'oral'),
  ('Amlodipine', '5mg tablet', 'oral');
