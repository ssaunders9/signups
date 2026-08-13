# Club Calendar 101/102 — Copilot Instructions

## Project Scope

This is an isolated repository for a small WSU ENGR 101/102 club-events application.
The public frontend is hosted on GitHub Pages. Supabase is the active database
and API layer. The former Google Apps Script/Google Sheet integration has been
removed and should not be restored.

Repository: `https://github.com/ssaunders9/signups`

## Architecture

- `index.html`: static page with Student View and Club View.
- `css/style.css`: responsive styling and print styles.
- `js/config.js`: Supabase URL and publishable-key configuration.
- `js/app.js`: UI behavior, validation, event rendering, signup flow, ICS export,
  past-event filtering, and attendance display.
- `supabase/schema.sql`: active Supabase schema, functions, grants, and policies.
- `js/supabase-api.js`: active Supabase API wrapper.
- `.nojekyll`: required so GitHub Pages serves the static site without Jekyll.

## Data Schema

The `events` table uses these columns:

```text
id, clubName, eventName, eventDate, eventStartTime, eventEndTime,
location, contact, maxAttendance, notes, allowedMajors, createdAt
```

The `signups` table uses:

```text
id, eventId, studentName, studentEmail, studentWSUID, createdAt
```

If the schema changes, update `supabase/schema.sql`, the RPC functions, and the
frontend mapping together. Do not change production tables without checking
existing Supabase data first.

## Security and Privacy

This is a limited-risk coordination tool, not a confidential records system.
Do not describe base64 encoding as encryption. The browser can access anything
needed by the frontend. Do not add sensitive student data beyond what is needed
for event attendance. Keep server-side validation even when matching client
validation exists.

Current protections include input sanitization, Content Security Policy,
Supabase function validation, WSU email validation, event-date validation,
capacity checks, duplicate-signup checks, and a server-side attendance PIN.

## Validation Rules

- Event dates must be today or later.
- Event start and end times use the controlled dropdown values.
- Location is required and limited to 200 characters.
- Contact email is optional and limited to 200 characters.
- Maximum attendance must be between 1 and 10,000.
- Notes and allowed-major lists are limited to 500 characters.
- Preferred-major selections are informational and do not block signups.
- Student email must use the `@wsu.edu` domain.
- WSU IDs must contain 8–9 digits.
- Duplicate student email signups for the same event are rejected.

## Supabase setup

Run `supabase/schema.sql` in the Supabase SQL Editor before testing the site.
The script creates the tables, indexes, security-definer functions, grants,
and row-level security configuration. Do not place a database password or
service-role key in frontend files.

## Deployment

### GitHub Pages

This repository is separate from the parent workspace repository. Run Git
commands from this directory:

```text
cd VCEA/Club_Calendar_101
git status
git add <specific-files>
git commit -m "Describe the change"
git push origin main
```

Do not commit unrelated parent-workspace files. GitHub Pages deploys the root
of `main`; retain `.nojekyll`.

## Development and Verification

For JavaScript changes, run:

```text
node --check js/app.js
node --check js/supabase-api.js
```

Also run:

```text
git diff --check
git status --short
```

For static frontend changes, test through an HTTP server rather than opening
`index.html` with `file://`:

```text
python3 -m http.server 8080
```

The Supabase SQL is run in the Supabase SQL Editor; it is not JavaScript and
should not be passed to Node.

## Editing Guidelines

- Use the canonical files in this repository, not archived copies in the parent
  workspace.
- Preserve the existing vanilla HTML/CSS/JavaScript approach unless a framework
  is explicitly requested.
- Escape user-provided values before inserting them into HTML.
- Keep frontend and backend field names synchronized.
- Avoid changing the public Apps Script URL unnecessarily.
- Do not claim a change is deployed until GitHub Pages and Apps Script have each
  been updated.
- When changing data columns, explain migration requirements before deployment.
- Prefer small, reviewable changes and test syntax before committing.
