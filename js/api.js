/**
 * Club Calendar 101 — API Layer
 * =============================
 * All communication with the Google Apps Script backend goes through here.
 * Uses GET exclusively — no POST, no preflight, no CORS issues.
 */

var api = (function () {
  'use strict';

  /**
   * Build a GET URL with the action + data + apiKey as query params.
   * The payload is JSON-stringified and passed as the "data" parameter.
   */
  function _get(action, data) {
    var payload = Object.assign({}, data, { action: action, apiKey: CONFIG.API_KEY });
    var params = Object.keys(payload).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(payload[k]);
    }).join('&');
    var url = CONFIG.API_BASE_URL + '?' + params;

    return fetch(url, { method: 'GET', cache: 'no-cache' })
      .then(function (r) { return r.json(); });
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Get all events + signup counts */
  function getEvents() {
    return _get('list-events', {});
  }

  /** Club submits a new event */
  function submitEvent(data) {
    return _get('submit-event', {
      clubName: data.clubName,
      eventName: data.eventName,
      eventDate: data.eventDate,
      eventStartTime: data.eventStartTime,
      eventEndTime: data.eventEndTime,
      location: data.location || '',
      contact: data.contact || '',
      maxAttendance: data.maxAttendance,
      notes: data.notes || '',
      allowedMajors: data.allowedMajors || ''
    });
  }

  /** Student signs up for an event */
  function signup(data) {
    return _get('signup', {
      eventId: data.eventId,
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      studentWSUID: data.studentWSUID
    });
  }

  /** Club fetches signup list for one event (requires attendance PIN) */
  function getSignups(eventId, pin) {
    return _get('get-signups', { eventId: eventId, pin: pin });
  }

  return {
    getEvents: getEvents,
    submitEvent: submitEvent,
    signup: signup,
    getSignups: getSignups
  };
})();
