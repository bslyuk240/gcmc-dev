-- Core enum types for roles, departments, and workflow states

create type department_key as enum (
  'frontdesk', 'doctors', 'nurses', 'pharmacy', 'accounts', 'store', 'admin', 'hr', 'it'
);

create type role_key as enum (
  'admin', 'front_desk_staff', 'doctor', 'nurse', 'pharmacist', 'accountant', 'store_keeper', 'hr_staff', 'it_staff', 'viewer'
);

create type visit_status as enum (
  'registered', 'triaged', 'in_consultation', 'awaiting_labs', 'awaiting_pharmacy', 'billing', 'completed', 'cancelled'
);

create type appointment_status as enum (
  'requested', 'confirmed', 'cancelled', 'completed', 'no_show'
);

create type triage_priority as enum (
  'critical', 'urgent', 'high', 'medium', 'low'
);

create type consultation_status as enum (
  'open', 'in_progress', 'completed', 'cancelled'
);

create type invoice_status as enum (
  'draft', 'issued', 'part_paid', 'paid', 'overdue', 'cancelled'
);

create type payment_method as enum (
  'cash', 'card', 'transfer', 'mobile', 'other'
);

create type ticket_status as enum (
  'new', 'in_progress', 'pending', 'resolved', 'closed'
);

create type ticket_priority as enum (
  'low', 'medium', 'high', 'critical'
);

create type stock_movement_type as enum (
  'in', 'out', 'transfer', 'adjustment', 'dispense', 'return'
);

create type prescription_status as enum (
  'pending', 'dispensed', 'partial', 'cancelled'
);
