-- Add missing enum values needed by the application
-- department_key was missing 'lab' (used in navigation and lab module)
-- role_key was missing several roles required by RBAC model

ALTER TYPE department_key ADD VALUE IF NOT EXISTS 'lab';

ALTER TYPE role_key ADD VALUE IF NOT EXISTS 'hr_manager';
ALTER TYPE role_key ADD VALUE IF NOT EXISTS 'hod';
ALTER TYPE role_key ADD VALUE IF NOT EXISTS 'lab_scientist';
ALTER TYPE role_key ADD VALUE IF NOT EXISTS 'pharmacy_assistant';

-- Commit required before new enum values can be used in subsequent statements
-- (Postgres requires a transaction boundary after ADD VALUE)
