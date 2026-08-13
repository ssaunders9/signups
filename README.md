# Club Calendar 101/102

**ENGR 101 & ENGR 102 — Club Events & Signups**

A static web app (GitHub Pages) for WSU clubs to post events and ENGR 101/102
students to sign up. Attendance sheets are printable.

## How It Works

```
┌──────────────┐       ┌──────────────────────────┐
│  GitHub Pages │  ←→   │ Supabase Postgres + RPCs │
│  (HTML/JS)   │ HTTPS  │  (database/API layer)   │
└──────────────┘       └──────────────────────────┘
```

- **Frontend**: Static HTML/CSS/JS served from GitHub Pages.
- **Backend/database**: Supabase Postgres with security-definer functions and
   database constraints.

## Setup (one-time, ~10 minutes)

### 1. Configure Supabase

1. Open the Supabase project dashboard.
2. Select **SQL Editor → New query**.
3. Paste and run [`supabase/schema.sql`](supabase/schema.sql).
4. Confirm that `events` and `signups` appear in **Table Editor**.
5. Do not put the database password or service-role key in frontend files.

### 2. Configure the Frontend

`js/config.js` contains the Supabase project URL and publishable key. The
publishable key is intended for browser use; security comes from the SQL
functions and policies in `supabase/schema.sql`.

### 3. Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages** → deploy from `main` branch, root folder.
3. Your site is live at `https://<username>.github.io/<repo>/`.

## Project Structure

```
Club_Calendar_101/
├── index.html          Main page (student + club tabs)
├── .nojekyll           Tells GitHub Pages to skip Jekyll
├── css/
│   └── style.css       All styling
├── js/
│   ├── config.js       Supabase URL + publishable key
│   ├── supabase-api.js Supabase RPC integration
│   ├── api.js          Legacy Apps Script API wrapper
│   └── app.js          UI logic, event rendering, signups
├── supabase/
│   └── schema.sql      Tables, functions, grants, and RLS setup
├── supabase/
│   └── schema.sql      Tables, functions, grants, and RLS setup
└── README.md           This file
```

## Features

- **Student View**: Browse upcoming events, sign up with name/email/WSU ID,
  see capacity counts.
- **Club View**: Submit events with date, time, location, contact email,
   attendance cap, preferred-major information, and notes.
- **Major Information**: Clubs can identify preferred majors via a dropdown
   and checkbox grid. This is informational only and does not block signups.
- **Attendance Sheets**: PIN-gated printable sign-in sheets with student
  names, emails, WSU IDs, and signature lines.
- **Past Events**: Automatically sorted behind a collapsible toggle.
- **Capacity Tracking**: Cards show spots remaining; signup button disables
  when full. Duplicate email signups are prevented.
- **Scope**: This application is intended for routine ENGR 101/102 event
   coordination. It is not designed for confidential records or high-risk
   authentication. Student identity is self-reported and event data is stored
   in the connected Supabase project.

## Usage

### Students
1. Open the page — the **Student View** tab shows all upcoming events.
2. Click **Sign Up** on an event, enter name, WSU email, and WSU ID.
3. You'll see a confirmation and the count updates immediately.

### Clubs
1. Switch to the **Club View** tab.
2. Fill in the event form and submit.
3. Your event appears in Student View immediately.
4. Click **Attendance** on any event card and enter the club PIN to view
   the signup list.
5. Click **Print Attendance Sheet** for a paper sign-in sheet with
   signature lines.

## Maintenance

- **Adding new columns**: Edit the header row in `Code.gs`'s `getSheet_()`,
  update `submitEvent_`, and update the frontend rendering in `app.js`.
- **Changing the attendance PIN**: Update the `get_attendance` function in
   `supabase/schema.sql` and rerun the function definition in Supabase SQL
   Editor. A future version should move this to authenticated club accounts.
- **Database changes**: Update `supabase/schema.sql` and test in Supabase
   before deploying frontend changes.

## Security

The application uses Supabase database functions, constraints, and access
policies as its active server-side boundary. The publishable frontend key is
not a secret. A Content Security Policy restricts network and script sources,
and the attendance function does not expose signup rows through direct table
access.

Students self-identify by WSU ID on the honor system — typical for
ENGR 101/102 club events. WSU email validation is applied to student signups, but
email-domain validation does not independently verify identity.
