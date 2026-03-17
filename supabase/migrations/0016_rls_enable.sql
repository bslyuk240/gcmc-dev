-- Enable RLS on all sensitive tables

alter table public.staff_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.appointments enable row level security;
alter table public.consultations enable row level security;
alter table public.vitals enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_lines enable row level security;
alter table public.pharmacy_inventory enable row level security;
alter table public.stock_movements enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.tickets enable row level security;
alter table public.audit_log enable row level security;
alter table public.role_permissions enable row level security;
alter table public.medications enable row level security;
