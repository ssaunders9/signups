/**
 * Club Calendar 101 — Google Apps Script Backend
 * =============================================
 * Deploy this script as a web app (Execute as: "me", Who has access: "Anyone")
 * Copy the deployment URL into ../js/config.js as API_BASE_URL.
 *
 * Google Sheet setup:
 *   Sheet "Events" — columns: id, clubName, eventName, eventDate, eventTime,
 *     maxAttendance, notes, createdAt
 *   Sheet "Signups" — columns: id, eventId, studentName, studentEmail,
 *     studentWSUID, createdAt
 */

// ── Configuration ────────────────────────────────────────────────────────────

var API_KEY = 'CHANGE_ME_TO_A_RANDOM_STRING'; // shared secret — set this, then
                                               // put the same value in js/config.js

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
      sheet.appendRow(['id', 'clubName', 'eventName', 'eventDate', 'eventTime',
                       'maxAttendance', 'notes', 'createdAt']);
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
  if (typeof val !== 'string') return val;
  return val.replace(/[<>&"']/g, function (ch) {
    return ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[ch];
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function error_(msg, code) {
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
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  // CORS preflight-ish headers
  var output = null;

  if (method === 'GET') {
    output = handleGet_(e);
  } else if (method === 'POST') {
    if (!checkRateLimit_()) {
      return error_('Rate limit exceeded. Try again later.', 429);
    }
    output = handlePost_(e);
  } else {
    return error_('Method not allowed', 405);
  }

  // Attach CORS — allow GitHub Pages origin
  return output;
}

// ── GET / — list events ─────────────────────────────────────────────────────

function handleGet_(e) {
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
      obj[headers[j]] = row[j] !== undefined ? row[j] : '';
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

// ── POST — actions: submit-event | signup | get-signups ─────────────────────

function handlePost_(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return error_('Invalid JSON body', 400);
  }

  // Simple API-key check
  if (body.apiKey !== API_KEY) {
    return error_('Unauthorized — invalid API key', 403);
  }

  var action = body.action;

  if (action === 'submit-event') {
    return submitEvent_(body);
  } else if (action === 'signup') {
    return signup_(body);
  } else if (action === 'get-signups') {
    return getSignups_(body);
  } else {
    return error_('Unknown action: ' + (action || 'none'), 400);
  }
}

// ── Submit Event ─────────────────────────────────────────────────────────────

function submitEvent_(body) {
  var clubName  = sanitize_(body.clubName  || '');
  var eventName = sanitize_(body.eventName || '');
  var eventDate = sanitize_(body.eventDate || '');
  var eventTime = sanitize_(body.eventTime || '');
  var maxAtt    = parseInt(body.maxAttendance, 10);
  var notes     = sanitize_(body.notes || '');

  // Validate
  if (!clubName  || clubName.length  > 100)  return error_('Invalid club name', 400);
  if (!eventName || eventName.length > 200) return error_('Invalid event name', 400);
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return error_('Invalid date (use YYYY-MM-DD)', 400);
  if (!eventTime || eventTime.length > 50)   return error_('Invalid time', 400);
  if (isNaN(maxAtt) || maxAtt < 1 || maxAtt > 10000) return error_('Invalid max attendance (1–10000)', 400);
  if (notes.length > 500) return error_('Notes too long (max 500 chars)', 400);

  var id = generateId_();
  var sheet = getSheet_(SHEET_EVENTS);
  sheet.appendRow([id, clubName, eventName, eventDate, eventTime, maxAtt, notes,
                   new Date().toISOString()]);

  return json_({ success: true, eventId: id });
}

// ── Student Signup ───────────────────────────────────────────────────────────

function signup_(body) {
  var eventId      = sanitize_(body.eventId      || '');
  var studentName  = sanitize_(body.studentName  || '');
  var studentEmail = sanitize_(body.studentEmail || '');
  var studentWSUID = sanitize_(body.studentWSUID || '');

  // Validate
  if (!eventId)      return error_('Missing event ID', 400);
  if (!studentName  || studentName.length  > 150)  return error_('Invalid name', 400);
  if (!studentEmail || studentEmail.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail))
    return error_('Invalid email', 400);
  if (!studentWSUID || !/^\d{8,9}$/.test(studentWSUID))
    return error_('Invalid WSU ID (8–9 digits)', 400);

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
  if (!eventFound) return error_('Event not found', 404);

  // Check capacity
  var maxAtt = parseInt(eventFound[5], 10) || 9999;
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
  if (alreadySignedUp) return error_('You have already signed up for this event', 409);
  if (currentCount >= maxAtt) return error_('Event is full', 409);

  var id = generateId_();
  signupSheet.appendRow([id, eventId, studentName, studentEmail, studentWSUID,
                         new Date().toISOString()]);

  return json_({ success: true, signupId: id });
}

// ── Get Signups (for clubs to see attendees) ─────────────────────────────────

function getSignups_(body) {
  var eventId = sanitize_(body.eventId || '');
  if (!eventId) return error_('Missing event ID', 400);

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
