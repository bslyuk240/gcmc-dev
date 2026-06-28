-- Ensure lab processing metadata columns exist on lab_tests (app-layer table).

ALTER TABLE public.lab_tests
  ADD COLUMN IF NOT EXISTS equipment_used TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at TEXT;
