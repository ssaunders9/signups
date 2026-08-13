/**
 * Club Calendar 101/102 — Supabase API
 * Public reads and writes go through database security-definer functions.
 */

var supabaseApi = (function () {
  'use strict';

  var client = window.supabase.createClient(
    SUPABASE_CONFIG.URL,
    SUPABASE_CONFIG.PUBLISHABLE_KEY
  );

  function unwrap(result) {
    if (result.error) throw result.error;
    return result.data;
  }

  function mapEvent(row) {
    return {
      id: row.id,
      clubName: row.club_name,
      eventName: row.event_name,
      eventDate: row.event_date,
      eventStartTime: row.start_time,
      eventEndTime: row.end_time,
      location: row.location,
      contact: row.contact_email,
      maxAttendance: row.max_attendance,
      notes: row.notes,
      allowedMajors: row.preferred_majors,
      status: row.status
    };
  }

  function mapSignup(row) {
    return {
      id: row.id,
      eventId: row.event_id,
      studentName: row.student_name,
      studentEmail: row.student_email,
      studentWSUID: row.student_wsuid,
      createdAt: row.created_at
    };
  }

  function getEvents() {
    return client.rpc('get_public_events').then(unwrap).then(function (data) {
      return {
        events: (data.events || []).map(mapEvent),
        signupCounts: data.signupCounts || {}
      };
    });
  }

  function submitEvent(data) {
    return client.rpc('submit_event', { p: {
      clubName: data.clubName,
      eventName: data.eventName,
      eventDate: data.eventDate,
      eventStartTime: data.eventStartTime,
      eventEndTime: data.eventEndTime,
      location: data.location,
      contact: data.contact || '',
      maxAttendance: data.maxAttendance,
      notes: data.notes || '',
      allowedMajors: data.allowedMajors || ''
    }}).then(unwrap).catch(asAppError);
  }

  function signup(data) {
    return client.rpc('create_signup', { p: {
      eventId: data.eventId,
      studentName: data.studentName,
      studentEmail: data.studentEmail,
      studentWSUID: data.studentWSUID
    }}).then(unwrap).catch(asAppError);
  }

  function getSignups(eventId, pin) {
    return client.rpc('get_attendance', {
      p_event_id: eventId,
      p_pin: pin
    }).then(unwrap).then(function (data) {
      if (data.error) return data;
      return { signups: (data.signups || []).map(mapSignup) };
    }).catch(asAppError);
  }

  function asAppError(error) {
    return { error: error.message || 'Supabase request failed.' };
  }

  return {
    getEvents: getEvents,
    submitEvent: submitEvent,
    signup: signup,
    getSignups: getSignups
  };
})();

// Preserve the existing app.js interface.
var api = supabaseApi;
