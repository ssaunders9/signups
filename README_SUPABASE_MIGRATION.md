# Supabase migration

The active frontend now uses Supabase instead of Google Sheets/Apps Script.

## One-time database setup

1. Open the Supabase project dashboard.
2. Select **SQL Editor → New query**.
3. Paste the complete contents of `supabase/schema.sql`.
4. Run the query.
5. Confirm that `events` and `signups` appear under **Table Editor**.

The SQL creates server-side functions for:

- Public event listing and signup counts
- Event submission validation
- Atomic signup capacity and duplicate checks
- PIN-gated attendance retrieval

The frontend uses the Supabase project URL and publishable key in
`js/config.js`. Do not add the database password or service-role key to any
frontend file.

## Test before deployment

1. Insert one test row into `events` using the Supabase Table Editor.
2. Open the site through GitHub Pages or an HTTP server.
3. Confirm the event appears in Student View.
4. Submit a test event from Club View.
5. Confirm the new event appears in Supabase.
6. Sign up using a valid `@wsu.edu` address and 8–9 digit WSU ID.
7. Test a duplicate signup and a full event.
8. Open Attendance and test PIN `1010`.

## Legacy data

The former Google Sheet and Apps Script backend are no longer part of this
repository. Export any historical Sheet data before deleting that external
resource if it is still needed for records.
