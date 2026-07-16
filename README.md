# Club Calendar 101

**ENGR 101 — Club Events & Signups**

A static web app (GitHub Pages) for WSU clubs to post events and ENGR 101
students to sign up. Attendance sheets are printable.

## How It Works

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│  GitHub Pages │  ←→   │ Google Apps Script │  ←→   │ Google Sheets │
│  (HTML/JS)   │  GET   │  (backend/Code.gs) │  GET   │  (database)   │
└──────────────┘       └──────────────────┘       └──────────────┘
```

- **Frontend**: Static HTML/CSS/JS served from GitHub Pages.
- **Backend**: Google Apps Script web app that reads/writes a Google Sheet.
- **Database**: Two sheet tabs — `Events` and `Signups`.

## Setup (one-time, ~10 minutes)

### 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank
   spreadsheet.
2. You don't need to create any tabs — the script handles that on first run.

### 2. Deploy the Apps Script Backend

1. In the spreadsheet, go to **Extensions → Apps Script**.
2. Delete any placeholder code and paste in the entire contents of
   [`backend/Code.gs`](backend/Code.gs).
3. Set the `API_KEY` and `ATTENDANCE_PIN` near the top of the file to values
   of your choosing.
4. Click **Save**, then **Deploy → New Deployment**.
5. Choose type: **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorize, then **copy the web app URL**.

### 3. Configure the Frontend

1. Encode your API URL and key as base64:
   ```bash
   echo -n 'YOUR_API_URL' | base64
   echo -n 'YOUR_API_KEY'  | base64
   ```
2. Paste the encoded values into [`js/config.js`](js/config.js).

### 4. Deploy to GitHub Pages

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
│   ├── config.js       Configuration (base64-encoded)
│   ├── api.js          Backend communication layer
│   └── app.js          UI logic, event rendering, signups
├── backend/
│   ├── Code.gs         Google Apps Script (deploy to Google)
│   └── appsscript.json Apps Script manifest
└── README.md           This file
```

## Features

- **Student View**: Browse upcoming events, sign up with name/email/WSU ID,
  see capacity counts.
- **Club View**: Submit events with date, time, location, contact email,
  attendance cap, major restrictions, and notes.
- **Major Restrictions**: Events can be open to all or limited to specific
  engineering majors via a dropdown and checkbox grid.
- **Attendance Sheets**: PIN-gated printable sign-in sheets with student
  names, emails, WSU IDs, and signature lines.
- **Past Events**: Automatically sorted behind a collapsible toggle.
- **Capacity Tracking**: Cards show spots remaining; signup button disables
  when full. Duplicate email signups are prevented.

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
- **Changing the PIN or API key**: Update `Code.gs`, re-encode for
  `config.js`, and redeploy.
- **Rate limits**: Adjust `RATE_LIMIT_MAX` in `Code.gs` (default: 30/min).
- **Rebuilding the config**: Run the `echo -n | base64` commands above
  whenever the URL or key changes.

## Security

The application employs multiple layers of protection appropriate for a
static-site deployment. Backend endpoints validate all requests server-side
before any data is read or written. Frontend secrets are stored in a format
that deters casual inspection. A Content Security Policy restricts network
and script sources. Rate limiting prevents abuse. Sensitive views are
gated behind credentials validated exclusively on the server.

Students self-identify by WSU ID on the honor system — typical for
ENGR 101 club events and sufficient for the sensitivity of the data involved.
