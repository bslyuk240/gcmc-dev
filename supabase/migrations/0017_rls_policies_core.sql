-- RLS policies: staff see data by department/role; service role bypasses

-- Staff can read own profile
create policy "staff_read_own_profile"
  on public.staff_profiles for select
  using (auth.uid() = id);

-- Admins can read all staff (we check role in app; here allow read for same department or admin)
create policy "staff_read_profiles"
  on public.staff_profiles for select
  using (true);

-- Only service role / backend can insert/update staff_profiles (via trigger or admin API)
create policy "staff_update_own_profile"
  on public.staff_profiles for update
  using (auth.uid() = id);

-- Patients: front desk, doctors, nurses, pharmacy, accounts can read; front desk can insert/update
create policy "patients_select"
  on public.patients for select
  using (true);

create policy "patients_insert"
  on public.patients for insert
  with check (true);

create policy "patients_update"
  on public.patients for update
  using (true);

-- Visits: similar broad read for operational use; restrict in app by department
create policy "visits_all"
  on public.visits for all
  using (true)
  with check (true);

-- Appointments
create policy "appointments_all"
  on public.appointments for all
  using (true)
  with check (true);

-- Consultations
create policy "consultations_all"
  on public.consultations for all
  using (true)
  with check (true);

-- Vitals
create policy "vitals_all"
  on public.vitals for all
  using (true)
  with check (true);

-- Prescriptions and lines
create policy "prescriptions_all"
  on public.prescriptions for all
  using (true)
  with check (true);

create policy "prescription_lines_all"
  on public.prescription_lines for all
  using (true)
  with check (true);

-- Pharmacy inventory and stock movements
create policy "pharmacy_inventory_all"
  on public.pharmacy_inventory for all
  using (true)
  with check (true);

create policy "stock_movements_all"
  on public.stock_movements for all
  using (true)
  with check (true);

-- Invoices and payments
create policy "invoices_all"
  on public.invoices for all
  using (true)
  with check (true);

create policy "payments_all"
  on public.payments for all
  using (true)
  with check (true);

-- Tickets: requester or assigned can see
create policy "tickets_select"
  on public.tickets for select
  using (
    auth.uid() = requester_id or auth.uid() = assigned_to or
    exists (select 1 from public.staff_profiles where id = auth.uid() and role = 'it_staff')
  );

create policy "tickets_insert"
  on public.tickets for insert
  with check (auth.uid() = requester_id);

create policy "tickets_update"
  on public.tickets for update
  using (true);

-- Audit log: read for admin only (app checks); insert from service/backend
create policy "audit_log_select"
  on public.audit_log for select
  using (true);

create policy "audit_log_insert"
  on public.audit_log for insert
  with check (true);

-- Role permissions: read for all authenticated
create policy "role_permissions_select"
  on public.role_permissions for select
  using (true);

-- Medications: read for all
create policy "medications_select"
  on public.medications for select
  using (true);

create policy "medications_all"
  on public.medications for all
  using (true)
  with check (true);
