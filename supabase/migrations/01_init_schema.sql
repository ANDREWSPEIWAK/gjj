-- 202F Coffee Shop Operations - Database Schema
-- This migration creates all necessary tables for the application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'barista' CHECK (role IN ('barista', 'head_barista', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members (for extended profile info)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_lead_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist tables (different types of checklists)
CREATE TABLE IF NOT EXISTS checklist_tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_title TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist items (tasks within checklists)
CREATE TABLE IF NOT EXISTS checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID REFERENCES checklist_tables(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  estimated_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklist runs (instances of checklists being performed)
CREATE TABLE IF NOT EXISTS checklist_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID REFERENCES checklist_tables(id) ON DELETE CASCADE,
  run_date DATE NOT NULL,
  results JSONB,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quality checks (verification of checklist completion)
CREATE TABLE IF NOT EXISTS quality_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID REFERENCES checklist_tables(id) ON DELETE CASCADE,
  checked BOOLEAN NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredient batches (for inventory tracking)
CREATE TABLE IF NOT EXISTS ingredient_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  unit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Temperature logs (for equipment monitoring)
CREATE TABLE IF NOT EXISTS temperature_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  record_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  value FLOAT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'C',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Handovers (shift transitions)
CREATE TABLE IF NOT EXISTS handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_shift_lead UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_shift_lead UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance tasks
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_description TEXT NOT NULL,
  scheduled_for DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit results (Head Barista audits)
CREATE TABLE IF NOT EXISTS audit_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_type TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  comments TEXT,
  passed BOOLEAN NOT NULL,
  audited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  audited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Corrective actions (from audits)
CREATE TABLE IF NOT EXISTS corrective_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID REFERENCES audit_results(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date DATE NOT NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports (generated reports)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_type TEXT NOT NULL,
  period TEXT NOT NULL,
  key_metrics JSONB,
  value FLOAT,
  trend TEXT CHECK (trend IN ('increasing', 'decreasing', 'stable', 'improving', 'worsening')),
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings (application configuration)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_name TEXT UNIQUE NOT NULL,
  current_value TEXT NOT NULL,
  setting_type TEXT NOT NULL CHECK (setting_type IN ('boolean', 'string', 'number', 'json')),
  description TEXT,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO settings (setting_name, current_value, setting_type, description) VALUES
  ('enable_analytics_reporting', 'true', 'boolean', 'Enable analytics reporting features'),
  ('send_daily_summaries_via_email', 'true', 'boolean', 'Send daily summaries via email'),
  ('allow_remote_access_to_dashboard', 'false', 'boolean', 'Allow remote access to dashboard'),
  ('enable_two_factor_authentication', 'true', 'boolean', 'Enable two-factor authentication')
ON CONFLICT (setting_name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_shift_lead ON shifts(shift_lead_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_runs_date ON checklist_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_temperature_logs_timestamp ON temperature_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_handovers_dates ON handovers(started_at, completed_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_scheduled ON maintenance_tasks(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_audit_results_type ON audit_results(audit_type);
CREATE INDEX IF NOT EXISTS idx_reports_type_period ON reports(report_type, period);
