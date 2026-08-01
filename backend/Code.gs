/**
 * Club Calendar 101 — Google Apps Script Backend
 * =============================================
 * Deploy this script as a web app (Execute as: "me", Who has access: "Anyone")
 * Copy the deployment URL into ../js/config.js as API_BASE_URL.
 *
 * Google Sheet setup:
 *   Sheet "Events" — columns: id, clubName, eventName, eventDate,
 *     eventStartTime, eventEndTime, location, contact, maxAttendance,
 *     notes, allowedMajors, createdAt
 *   Sheet "Signups" — columns: id, eventId, studentName, studentEmail,
 *     studentWSUID, createdAt
 */

// ── Configuration ────────────────────────────────────────────────────────────

var API_KEY = 'cC7xKp9vR2mN4wL8jF3hQ6tY1bA5dG0e'; // shared secret — must match js/config.js
var ATTENDANCE_PIN = '1010';            // PIN clubs use to view attendance sheets

var RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
var RATE_LIMIT_MAX          = 30;   // max requests per window

var SHEET_EVENTS = 'Events';
var SHEET_SIGNUPS = 'Signups';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_EVENTS) {
      sheet.appendRow(['id', 'clubName', 'eventName', 'eventDate',
                       'eventStartTime', 'eventEndTime', 'location',
                       'contact', 'maxAttendance', 'notes', 'allowedMajors',
                       'createdAt']);
      // Force time columns to plain text so "4:00 PM" stays a string
      sheet.getRange('E:F').setNumberFormat('@');
    } else if (name === SHEET_SIGNUPS) {
      sheet.appendRow(['id', 'eventId', 'studentName', 'studentEmail',
                       'studentWSUID', 'createdAt']);
    }
  }
  return sheet;
}

function generateId_() {
  return Utilities.getUuid();
}

function sanitize_(val) {
  // Strip dangerous characters; client-side escHtml handles display encoding.
  // We only strip here to keep data clean — no HTML entity conversion.
  if (typeof val !== 'string') return val;
  return val.replace(/[<>]/g, '');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function error_(msg) {
  // second param (HTTP status) ignored — kept for caller compatibility
  return ContentService.createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Rate Limiting ────────────────────────────────────────────────────────────

function checkRateLimit_() {
  var cache = CacheService.getScriptCache();
  var ip = 'anonymous'; // Apps Script doesn't expose caller IP reliably
  var key = 'rl_' + ip;
  var data = cache.get(key);
  var now = Date.now();

  if (data) {
    var record = JSON.parse(data);
    if (now - record.windowStart < RATE_LIMIT_WINDOW_MS) {
      if (record.count >= RATE_LIMIT_MAX) {
        return false;
      }
      record.count += 1;
    } else {
      record = { windowStart: now, count: 1 };
    }
  } else {
    record = { windowStart: now, count: 1 };
  }
  cache.put(key, JSON.stringify(record), 120);
  return true;
}

// ── Entry Points ─────────────────────────────────────────────────────────────

function doGet(e) {
  if (!checkRateLimit_()) {
    return error_('Rate limit exceeded. Try again later.');
  }
  return handleAction_(e);
}

function doPost(e) {
  if (!checkRateLimit_()) {
    return error_('Rate limit exceeded. Try again later.');
  }

  var body;
  try {
    body = JSON.parse(e.postData.contents || '{}');
  } catch (err) {
    return error_('Invalid JSON body');
  }
  return handlePayload_(body);
}

// ── Action Router ────────────────────────────────────────────────────────────

function handleAction_(e) {
  var p = e.parameter; // query-string parameters
  return handlePayload_(p);
}

function handlePayload_(p) {
  var action = p.action;

  // API-key check
  if (p.apiKey !== API_KEY) {
    return error_('Unauthorized — invalid API key');
  }

  if (action === 'list-events') {
    return listEvents_();
  } else if (action === 'submit-event') {
    return submitEvent_(p);
  } else if (action === 'signup') {
    return signup_(p);
  } else if (action === 'get-signups') {
    return getSignups_(p);
  } else {
    return error_('Unknown action: ' + (action || 'none'));
  }
}

// ── List Events ──────────────────────────────────────────────────────────────

function listEvents_() {
  var sheet = getSheet_(SHEET_EVENTS);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return json_({ events: [], signups: {} });
  }

  var headers = data[0];
  var events = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j] !== undefined ? row[j] : '';
      // Google Sheets may convert time strings like "4:00 PM" to Date objects;
      // convert them back to readable time strings.
      if (val instanceof Date && (headers[j] === 'eventStartTime' || headers[j] === 'eventEndTime' || headers[j] === 'eventTime')) {
        val = val.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      }
      obj[headers[j]] = val;
    }
    events.push(obj);
  }

  // Also return signup counts per event
  var signupSheet = getSheet_(SHEET_SIGNUPS);
  var signupData = signupSheet.getDataRange().getValues();
  var signupCounts = {};
  for (var k = 1; k < signupData.length; k++) {
    var evId = signupData[k][1]; // eventId column
    if (evId) {
      signupCounts[evId] = (signupCounts[evId] || 0) + 1;
    }
  }

  return json_({ events: events, signupCounts: signupCounts });
}

// ── Submit Event ─────────────────────────────────────────────────────────────

function submitEvent_(p) {
  var clubName       = sanitize_(p.clubName        || '');
  var eventName      = sanitize_(p.eventName       || '');
  var eventDate      = sanitize_(p.eventDate       || '');
  var eventStartTime = sanitize_(p.eventStartTime  || '');
  var eventEndTime   = sanitize_(p.eventEndTime    || '');
  var location       = sanitize_(p.location        || '');
  var contact        = sanitize_(p.contact         || '');
  var maxAtt         = parseInt(p.maxAttendance, 10);
  var notes          = sanitize_(p.notes           || '');
  var allowedMajors  = sanitize_(p.allowedMajors   || '');

  // Validate
  if (!clubName       || clubName.length       > 100) return error_('Invalid club name');
  if (!eventName      || eventName.length      > 200) return error_('Invalid event name');
  if (!eventDate      || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return error_('Invalid date');
  var submittedDate = new Date(eventDate + 'T00:00:00');
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(submittedDate.getTime()) || submittedDate < today) return error_('Event date must be today or in the future');
  if (!eventStartTime || eventStartTime.length > 10)  return error_('Invalid start time');
  if (!eventEndTime   || eventEndTime.length   > 10)  return error_('Invalid end time');
  if (!location       || location.length       > 200) return error_('Invalid location');
  if (contact.length > 200) return error_('Contact too long (max 200 chars)');
  if (isNaN(maxAtt)   || maxAtt < 1 || maxAtt > 10000) return error_('Invalid max attendance (1–10000)');
  if (notes.length > 500) return error_('Notes too long (max 500 chars)');
  if (allowedMajors.length > 500) return error_('Allowed majors too long');

  var id = generateId_();
  var sheet = getSheet_(SHEET_EVENTS);
  sheet.appendRow([id, clubName, eventName, eventDate, eventStartTime,
                   eventEndTime, location, contact, maxAtt, notes,
                   allowedMajors, new Date().toISOString()]);

  return json_({ success: true, eventId: id });
}

// ── Student Signup ───────────────────────────────────────────────────────────

function signup_(p) {
  var eventId      = sanitize_(p.eventId      || '');
  var studentName  = sanitize_(p.studentName  || '');
  var studentEmail = sanitize_(p.studentEmail || '');
  var studentWSUID = sanitize_(p.studentWSUID || '');

  // Validate
  if (!eventId)      return error_('Missing event ID');
  if (!studentName  || studentName.length  > 150)  return error_('Invalid name');
  if (!studentEmail || studentEmail.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail))
    return error_('Invalid email');
  if (!/@wsu\.edu$/i.test(studentEmail)) return error_('Use a WSU email address (@wsu.edu)');
  if (!studentWSUID || !/^\d{8,9}$/.test(studentWSUID))
    return error_('Invalid WSU ID (8–9 digits)');

  // Check event exists
  var eventsSheet = getSheet_(SHEET_EVENTS);
  var eventsData = eventsSheet.getDataRange().getValues();
  var eventFound = null;
  for (var i = 1; i < eventsData.length; i++) {
    if (eventsData[i][0] === eventId) {
      eventFound = eventsData[i];
      break;
    }
  }
  if (!eventFound) return error_('Event not found');

  // Check capacity
  // Events columns: id, clubName, eventName, eventDate, start, end,
  // location, contact, maxAttendance, notes, allowedMajors, createdAt.
  var maxAtt = parseInt(eventFound[8], 10) || 9999;
  var signupSheet = getSheet_(SHEET_SIGNUPS);
  var signupData = signupSheet.getDataRange().getValues();
  var currentCount = 0;
  var alreadySignedUp = false;
  for (var j = 1; j < signupData.length; j++) {
    if (signupData[j][1] === eventId) {
      currentCount++;
      if (signupData[j][3] === studentEmail) {
        alreadySignedUp = true;
      }
    }
  }
  if (alreadySignedUp) return error_('You have already signed up for this event');
  if (currentCount >= maxAtt) return error_('Event is full');

  var id = generateId_();
  signupSheet.appendRow([id, eventId, studentName, studentEmail, studentWSUID,
                         new Date().toISOString()]);

  return json_({ success: true, signupId: id });
}

// ── Get Signups (for clubs to see attendees) ─────────────────────────────────

function getSignups_(p) {
  var eventId = sanitize_(p.eventId || '');
  if (!eventId) return error_('Missing event ID');

  // Validate attendance PIN
  if (p.pin !== ATTENDANCE_PIN) return error_('Incorrect PIN');

  var sheet = getSheet_(SHEET_SIGNUPS);
  var data = sheet.getDataRange().getValues();
  var signups = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === eventId) {
      signups.push({
        id:           data[i][0],
        eventId:      data[i][1],
        studentName:  data[i][2],
        studentEmail: data[i][3],
        studentWSUID: data[i][4],
        createdAt:    data[i][5]
      });
    }
  }
  return json_({ signups: signups });
}
