-- Staff profiles linked to Supabase Auth; department and role for RBAC

create table public.staff_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  department department_key not null,
  role role_key not null,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index idx_staff_profiles_department on public.staff_profiles(department);
create index idx_staff_profiles_role on public.staff_profiles(role);
create index idx_staff_profiles_email on public.staff_profiles(email);

-- Patients (front desk / registration)
create table public.patients (
  id uuid primary key default uuid_generate_v4(),
  hospital_number text unique,
  full_name text not null,
  date_of_birth date,
  gender text,
  phone text,
  email text,
  address text,
  next_of_kin_name text,
  next_of_kin_phone text,
  blood_group text,
  allergies text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index idx_patients_hospital_number on public.patients(hospital_number);
create index idx_patients_full_name on public.patients(full_name);
create index idx_patients_phone on public.patients(phone);

-- Visits (check-in per patient per day/session)
create table public.visits (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid not null references public.patients(id) on delete restrict,
  status visit_status not null default 'registered',
  department_target department_key,
  triage_priority triage_priority,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index idx_visits_patient on public.visits(patient_id);
create index idx_visits_status on public.visits(status);
create index idx_visits_check_in on public.visits(check_in_at desc);

-- Appointments (public booking + front desk)
create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.patients(id) on delete set null,
  patient_name text,
  patient_phone text,
  patient_email text,
  department department_key not null,
  scheduled_at timestamptz not null,
  status appointment_status not null default 'requested',
  notes text,
  visit_id uuid references public.visits(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_appointments_scheduled on public.appointments(scheduled_at);
create index idx_appointments_status on public.appointments(status);

-- Consultations (doctor encounters)
create table public.consultations (
  id uuid primary key default uuid_generate_v4(),
  visit_id uuid not null references public.visits(id) on delete restrict,
  doctor_id uuid not null references auth.users(id),
  status consultation_status not null default 'open',
  chief_complaint text,
  history_present_illness text,
  past_medical_history text,
  diagnosis text,
  notes text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index idx_consultations_visit on public.consultations(visit_id);
create index idx_consultations_doctor on public.consultations(doctor_id);
create index idx_consultations_status on public.consultations(status);

-- Vitals (nurse triage)
create table public.vitals (
  id uuid primary key default uuid_generate_v4(),
  visit_id uuid not null references public.visits(id) on delete restrict,
  recorded_by uuid not null references auth.users(id),
  temperature numeric(4,1),
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  heart_rate int,
  respiratory_rate int,
  oxygen_saturation int,
  weight_kg numeric(5,2),
  height_cm numeric(5,1),
  pain_level int,
  notes text,
  recorded_at timestamptz not null default now()
);

create index idx_vitals_visit on public.vitals(visit_id);

-- Medications catalog (structured list for prescribing)
create table public.medications (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  form_strength text,
  route text,
  created_at timestamptz not null default now()
);

-- Prescriptions (from doctor)
create table public.prescriptions (
  id uuid primary key default uuid_generate_v4(),
  consultation_id uuid not null references public.consultations(id) on delete restrict,
  status prescription_status not null default 'pending',
  dispensed_at timestamptz,
  dispensed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_prescriptions_consultation on public.prescriptions(consultation_id);
create index idx_prescriptions_status on public.prescriptions(status);

-- Prescription lines (structured: medication, form/strength, dosage, frequency, duration, route, quantity, instruction)
create table public.prescription_lines (
  id uuid primary key default uuid_generate_v4(),
  prescription_id uuid not null references public.prescriptions(id) on delete restrict,
  medication_id uuid references public.medications(id),
  medication_name text not null,
  form_strength text,
  dosage text not null,
  frequency text not null,
  duration text,
  route text,
  quantity int not null,
  instruction text,
  note text,
  created_at timestamptz not null default now()
);

create index idx_prescription_lines_prescription on public.prescription_lines(prescription_id);

-- Pharmacy inventory
create table public.pharmacy_inventory (
  id uuid primary key default uuid_generate_v4(),
  medication_id uuid references public.medications(id),
  product_name text not null,
  category text,
  quantity int not null default 0,
  unit text default 'units',
  price_per_unit numeric(12,2),
  expiry_date date,
  batch_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index idx_pharmacy_inventory_product on public.pharmacy_inventory(product_name);

-- Stock movements (reduce stock only on dispense)
create table public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  inventory_id uuid not null references public.pharmacy_inventory(id) on delete restrict,
  movement_type stock_movement_type not null,
  quantity int not null,
  reference_id uuid,
  source_destination text,
  ref_no text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_stock_movements_inventory on public.stock_movements(inventory_id);
create index idx_stock_movements_created on public.stock_movements(created_at desc);

-- Invoices (accounts)
create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  patient_id uuid references public.patients(id) on delete set null,
  visit_id uuid references public.visits(id),
  invoice_number text unique,
  amount_due numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  status invoice_status not null default 'draft',
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index idx_invoices_patient on public.invoices(patient_id);
create index idx_invoices_status on public.invoices(status);
create index idx_invoices_number on public.invoices(invoice_number);

-- Payments
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  amount numeric(12,2) not null,
  payment_method payment_method not null,
  paid_at timestamptz not null default now(),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_payments_invoice on public.payments(invoice_id);

-- IT tickets
create table public.tickets (
  id uuid primary key default uuid_generate_v4(),
  subject text not null,
  description text,
  status ticket_status not null default 'new',
  priority ticket_priority not null default 'medium',
  requester_id uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  department department_key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tickets_status on public.tickets(status);
create index idx_tickets_requester on public.tickets(requester_id);
create index idx_tickets_assigned on public.tickets(assigned_to);

-- Audit log for critical actions
create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  action text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  actor_id uuid references auth.users(id),
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_log_actor on public.audit_log(actor_id);
create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_created on public.audit_log(created_at desc);

-- Role permissions (permission string e.g. 'frontdesk:patients:read', 'pharmacy:dispense')
create table public.role_permissions (
  id uuid primary key default uuid_generate_v4(),
  role role_key not null,
  permission text not null,
  unique(role, permission)
);

create index idx_role_permissions_role on public.role_permissions(role);
