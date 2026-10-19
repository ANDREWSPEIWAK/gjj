-- 202F Coffee Shop Operations - Row Level Security Policies
-- Enable RLS on all tables and create policies for proper access control

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE temperature_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Organization members policies
-- Users can view their own organization member record
CREATE POLICY "Users can view own organization member" ON organization_members
FOR SELECT USING (auth.uid() = profile_id);

-- Admins can view all organization members
CREATE POLICY "Admins can view all organization members" ON organization_members
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Shifts policies
-- Users can view shifts they are assigned to (as shift lead) or that are active
CREATE POLICY "Users can view assigned shifts" ON shifts
FOR SELECT USING (
  shift_lead_id = auth.uid() OR 
  (start_time <= NOW() AND (end_time IS NULL OR end_time >= NOW()))
);

-- Admins can view all shifts
CREATE POLICY "Admins can view all shifts" ON shifts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Shift leads can create shifts
CREATE POLICY "Shift leads can create shifts" ON shifts
FOR INSERT WITH CHECK (
  auth.uid() = shift_lead_id OR
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Shift leads can update their own shifts
CREATE POLICY "Shift leads can update own shifts" ON shifts
FOR UPDATE USING (auth.uid() = shift_lead_id);

-- Checklist tables policies
-- Users can view checklist tables they created
CREATE POLICY "Users can view own checklist tables" ON checklist_tables
FOR SELECT USING (created_by = auth.uid());

-- Admins and head baristas can view all checklist tables
CREATE POLICY "Admins and head baristas can view all checklist tables" ON checklist_tables
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Users can create checklist tables
CREATE POLICY "Users can create checklist tables" ON checklist_tables
FOR INSERT WITH CHECK (created_by = auth.uid());

-- Checklist items policies
-- Users can view checklist items for checklists they can access
CREATE POLICY "Users can view accessible checklist items" ON checklist_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM checklist_tables WHERE id = checklist_id AND 
    (created_by = auth.uid() OR 
     EXISTS (
       SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
     ))
  )
);

-- Users can update checklist items for checklists they created
CREATE POLICY "Users can update own checklist items" ON checklist_items
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM checklist_tables WHERE id = checklist_id AND created_by = auth.uid()
  )
);

-- Checklist runs policies
-- Users can view checklist runs they performed
CREATE POLICY "Users can view own checklist runs" ON checklist_runs
FOR SELECT USING (performed_by = auth.uid());

-- Admins and head baristas can view all checklist runs
CREATE POLICY "Admins and head baristas can view all checklist runs" ON checklist_runs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Users can create checklist runs
CREATE POLICY "Users can create checklist runs" ON checklist_runs
FOR INSERT WITH CHECK (performed_by = auth.uid());

-- Quality checks policies
-- Users can view quality checks for checklists they can access
CREATE POLICY "Users can view accessible quality checks" ON quality_checks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM checklist_tables WHERE id = checklist_id AND 
    (created_by = auth.uid() OR 
     EXISTS (
       SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
     ))
  )
);

-- Users can create quality checks for checklists they can access
CREATE POLICY "Users can create accessible quality checks" ON quality_checks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM checklist_tables WHERE id = checklist_id AND 
    (created_by = auth.uid() OR 
     EXISTS (
       SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
     ))
  )
);

-- Users can update quality checks they verified
CREATE POLICY "Users can update own quality checks" ON quality_checks
FOR UPDATE USING (verified_by = auth.uid());

-- Ingredient batches policies
-- Everyone can view ingredient batches (read-only for most)
CREATE POLICY "Everyone can view ingredient batches" ON ingredient_batches
FOR SELECT USING (TRUE);

-- Only admins can manage ingredient batches
CREATE POLICY "Admins can manage ingredient batches" ON ingredient_batches
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Temperature logs policies
-- Everyone can view temperature logs
CREATE POLICY "Everyone can view temperature logs" ON temperature_logs
FOR SELECT USING (TRUE);

-- Only authorized users can insert temperature logs
CREATE POLICY "Authorized users can insert temperature logs" ON temperature_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('barista', 'head_barista', 'admin')
  )
);

-- Handovers policies
-- Users can view handovers they were involved in
CREATE POLICY "Users can view own handovers" ON handovers
FOR SELECT USING (
  from_shift_lead = auth.uid() OR to_shift_lead = auth.uid()
);

-- Admins and head baristas can view all handovers
CREATE POLICY "Admins and head baristas can view all handovers" ON handovers
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Users can create handovers (when ending their shift)
CREATE POLICY "Users can create handovers" ON handovers
FOR INSERT WITH CHECK (
  from_shift_lead = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Maintenance tasks policies
-- Users can view maintenance tasks
CREATE POLICY "Users can view maintenance tasks" ON maintenance_tasks
FOR SELECT USING (TRUE);

-- Users can update maintenance tasks they performed
CREATE POLICY "Users can update own maintenance tasks" ON maintenance_tasks
FOR UPDATE USING (performed_by = auth.uid());

-- Admins and head baristas can create maintenance tasks
CREATE POLICY "Admins and head baristas can create maintenance tasks" ON maintenance_tasks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Audit results policies
-- Users can view audit results they conducted
CREATE POLICY "Users can view own audit results" ON audit_results
FOR SELECT USING (audited_by = auth.uid());

-- Admins and head baristas can view all audit results
CREATE POLICY "Admins and head baristas can view all audit results" ON audit_results
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Head baristas and admins can create audit results
CREATE POLICY "Head baristas and admins can create audit results" ON audit_results
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Corrective actions policies
-- Users can view corrective actions they are assigned to
CREATE POLICY "Users can view assigned corrective actions" ON corrective_actions
FOR SELECT USING (assigned_to = auth.uid());

-- Admins and head baristas can view all corrective actions
CREATE POLICY "Admins and head baristas can view all corrective actions" ON corrective_actions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Head baristas and admins can create corrective actions
CREATE POLICY "Head baristas and admins can create corrective actions" ON corrective_actions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Users can update corrective actions they are assigned to
CREATE POLICY "Users can update assigned corrective actions" ON corrective_actions
FOR UPDATE USING (assigned_to = auth.uid());

-- Reports policies
-- Users can view reports they generated
CREATE POLICY "Users can view own reports" ON reports
FOR SELECT USING (generated_by = auth.uid());

-- Admins and head baristas can view all reports
CREATE POLICY "Admins and head baristas can view all reports" ON reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'head_barista')
  )
);

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
FOR INSERT WITH CHECK (generated_by = auth.uid());

-- Settings policies
-- Everyone can view settings (read-only)
CREATE POLICY "Everyone can view settings" ON settings
FOR SELECT USING (TRUE);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" ON settings
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);
