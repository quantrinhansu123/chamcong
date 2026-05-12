<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5b5a09a2-2700-4150-956a-7291b96c5a2c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Supabase attendance backend

1. Create a Supabase project.
2. Open Supabase SQL Editor and run [supabase/schema.sql](supabase/schema.sql).
3. Copy `.env.example` to `.env.local`, then set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_EMPLOYEE_ID`
   - `VITE_EMPLOYEE_NAME`
4. Restart `npm run dev`.

The attendance screen writes to `attendance_records`:
- `CHECK-IN` saves `check_in_at`, `check_in_lat`, `check_in_lng`.
- `CHECK-OUT` saves `check_out_at`, `check_out_lat`, `check_out_lng`.
- `GPS` saves `last_lat`, `last_lng`, `location_accuracy_m`, `location_captured_at`.
