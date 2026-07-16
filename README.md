# Club Calendar 101

**ENGR 101 — Club Events & Signups**

A static web app (GitHub Pages) that lets WSU clubs submit events and ENGR 101
students sign up to attend. Attendance sheets are printable.

## How It Works

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│  GitHub Pages │  ←→   │ Google Apps Script │  ←→   │ Google Sheets │
│  (HTML/JS)   │  POST  │  (backend/Code.gs) │  GET   │  (database)   │
└──────────────┘       └──────────────────┘       └──────────────┘
```

- **Frontend**: Static HTML/CSS/JS served from GitHub Pages.
- **Backend**: Google Apps Script web app that reads/writes a Google Sheet.
- **Database**: Two sheet tabs — `Events` and `Signups`.

## Setup (one-time, ~10 minutes)

### 1. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank
   spreadsheet.
2. Rename the first sheet tab to **`Events`**.
3. Add a second sheet tab named **`Signups`** (click the **+** in the bottom-left).
4. Note the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit`

### 2. Deploy the Apps Script Backend

1. In the spreadsheet, go to **Extensions → Apps Script**.
2. Delete any placeholder code and paste in the entire contents of
   [`backend/Code.gs`](backend/Code.gs).
3. Change the `API_KEY` on line 14 to a random string:
   ```js
   var API_KEY = 'some-long-random-string-here';
   ```
4. Click **Save** (💾), then **Deploy → New Deployment**.
5. Choose type: **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorize the permissions, then **copy the web app URL**.
   It will look like:
   ```
   https://script.google.com/macros/s/XXXXX/exec
   ```

### 3. Configure the Frontend

1. Open [`js/config.js`](js/config.js).
2. Paste the Apps Script URL into `API_BASE_URL`:
   ```js
   API_BASE_URL: 'https://script.google.com/macros/s/XXXXX/exec',
   ```
3. Set the same random string you used in `Code.gs`:
   ```js
   API_KEY: 'some-long-random-string-here',
   ```

### 4. Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to `main` branch, root folder (`/`).
4. Click **Save**. Your site will be live at `https://<username>.github.io/<repo>/`.

## Project Structure

```
Club_Calendar_101/
├── index.html          Main page (student + club tabs)
├── css/
│   └── style.css       All styling
├── js/
│   ├── config.js       API URL + shared key (EDIT THESE)
│   ├── api.js          Backend communication layer
│   └── app.js          UI logic, event rendering, signups
├── backend/
│   ├── Code.gs         Google Apps Script (deploy this to Google)
│   └── appsscript.json Apps Script manifest
└── README.md           This file
```

## Security

- **No secrets in client code**: The `API_KEY` in `config.js` is a shared secret
  that could be extracted. However, the Google Sheet is owned by your WSU account
  and the Apps Script runs as you, so malicious writes are limited to event/signup
  spam. For stronger security, restrict the Apps Script deployment to specific
  Google accounts.
- **Input sanitization**: All inputs are sanitized both client-side (JS) and
  server-side (Apps Script) — no raw HTML is ever rendered.
- **CSP**: A Content-Security-Policy meta tag restricts script and connection
  sources to this origin and `script.google.com`.
- **Rate limiting**: The Apps Script backend limits requests to 30/minute per
  IP (configurable in `Code.gs`).
- **No authentication**: Students self-identify by WSU ID. This is not
  cryptographically verified — it relies on the honor system, which is typical
  for ENGR 101 club events.

## Usage

### Students
1. Open the page — the **Student View** tab shows all upcoming events.
2. Click **Sign Up** on an event, enter name, WSU email, and WSU ID.
3. You'll see a confirmation. The event card updates with the new count.

### Clubs
1. Switch to the **Club View** tab.
2. Fill in the event form and submit.
3. Your event appears in Student View immediately.
4. Click **📆 Attendance** on any event card to see who signed up.
5. Click **🖨 Print Attendance Sheet** for a paper sign-in sheet with
   signature lines.

## Maintenance

- To add/remove columns, edit both the Apps Script `getSheet_()` header rows
  and the frontend rendering in `app.js`.
- To change rate limits, edit `RATE_LIMIT_MAX` in `Code.gs`.
- If you change the API key, update it in **both** `Code.gs` and `config.js`.
