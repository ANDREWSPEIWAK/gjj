# 202F Coffee Shop Operations

A comprehensive operations management system for the 202F specialty coffee shop in Yerevan.

## Features

- Dashboard with key metrics and recent incidents
- Opening and closing checklists for daily operations
- Shift handover management
- Sanitation schedule and tracking
- Weekly maintenance tasks
- Head barista audits and quality control
- Operational reports and analytics
- System settings and user management
- Role-based access control (Barista, Head Barista, Admin)
- Mobile-responsive design
- Supabase integration for data persistence
- Row Level Security for data protection

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Supabase (PostgreSQL database with real-time capabilities)
- Custom UI component library

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase URL and anon key
   ```

3. Apply database migrations:
   - Use the SQL files in `supabase/migrations/` to set up your Supabase database
   - First run `01_init_schema.sql` to create tables
   - Then run `02_rls_policies.sql` to enable Row Level Security

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3000 in your browser

## Database Schema

The application uses the following tables:
- profiles (users with roles: barista, head_barista, admin)
- organization_members
- shifts
- checklist_tables & checklist_items
- checklist_runs & quality_checks
- ingredient_batches
- temperature_logs
- handovers
- maintenance_tasks
- audit_results & corrective_actions
- reports
- settings

## Security

- Row Level Security (RLS) is enabled on all tables
- Policies restrict data access based on user roles
- Only anonymous/public key is used in frontend (no secret keys exposed)

## License

MIT
