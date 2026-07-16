/**
 * Club Calendar 101 — API Layer
 * =============================
 * All communication with the Google Apps Script backend goes through here.
 */

var api = (function () {
  'use strict';

  /**
   * Send a GET or POST to the backend.
   * All POST bodies automatically include the shared API key.
   */
  function _request(method, body) {
    var url = CONFIG.API_BASE_URL;

    if (method === 'GET') {
      return fetch(url, { method: 'GET', cache: 'no-cache' })
        .then(function (r) { return r.json(); });
    }

    // POST — attach API key to every payload
    var payload = Object.assign({}, body, { apiKey: CONFIG.API_KEY });
    return fetch(url, {
      method: 'POST',
      cache: 'no-cache',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Get all events + signup counts */
  function getEvents() {
    return _request('GET');
  }

  /** Club submits a new event */
  function submitEvent(data) {
    return _request('POST', {
      action: 'submit-event',
      clubName: data.clubName,
      eventName: data.eventName,
      eventDate: data.eventDate,
      eventTime: data.eventTime,
      maxAttendance: data.maxAttendance,
      notes: data.notes
    });
  }

  /** Student signs up for an event */
  function signup(data) {
    return _request('POST', {
      action: 'signup',
      eventId: data.eventId,
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      studentWSUID: data.studentWSUID
    });
  }

  /** Club fetches signup list for one event */
  function getSignups(eventId) {
    return _request('POST', {
      action: 'get-signups',
      eventId: eventId
    });
  }

  return {
    getEvents: getEvents,
    submitEvent: submitEvent,
    signup: signup,
    getSignups: getSignups
  };
})();
