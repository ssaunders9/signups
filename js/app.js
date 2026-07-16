/**
 * Club Calendar 101 — Main Application
 * ====================================
 * Manages DOM, event listing, form submissions, and tab switching.
 */

var app = (function () {
  'use strict';

  // ── DOM references ──────────────────────────────────────────────────────

  var $ = function (id) { return document.getElementById(id); };

  var dom = {};
  function cacheDom() {
    dom.tabStudent      = $('tab-student');
    dom.tabClub         = $('tab-club');
    dom.viewStudent     = $('view-student');
    dom.viewClub        = $('view-club');
    dom.eventList       = $('event-list');
    dom.loadingMsg      = $('loading-msg');
    dom.errorMsg        = $('error-msg');
    dom.signupPanel     = $('signup-panel');
    dom.signupForm      = $('signup-form');
    dom.signupEventId   = $('signup-event-id');
    dom.signupEventName = $('signup-event-name');
    dom.signupName      = $('signup-name');
    dom.signupEmail     = $('signup-email');
    dom.signupWSUID     = $('signup-wsuid');
    dom.signupFeedback  = $('signup-feedback');
    dom.clubForm        = $('club-form');
    dom.clubFeedback    = $('club-feedback');
    dom.clubName        = $('club-name');
    dom.eventName       = $('event-name');
    dom.eventDate       = $('event-date');
    dom.eventStartTime  = $('event-start-time');
    dom.eventEndTime    = $('event-end-time');
    dom.eventLocation   = $('event-location');
    dom.eventContact    = $('event-contact');
    dom.maxAttendance   = $('max-attendance');
    dom.notes           = $('event-notes');

    // Attendance modal
    dom.attendanceModal      = $('attendance-modal');
    dom.attendanceEventName  = $('attendance-event-name');
    dom.attendanceList       = $('attendance-list');
    dom.attendanceCount      = $('attendance-count');
    dom.attendanceMax        = $('attendance-max');
    dom.closeAttendanceModal = $('close-attendance-modal');
    dom.printAttendance      = $('print-attendance');
  }

  // ── State ───────────────────────────────────────────────────────────────

  var eventsCache = [];

  // ── Init ────────────────────────────────────────────────────────────────

  function init() {
    cacheDom();
    bindEvents();
    loadEvents();
  }

  function bindEvents() {
    dom.tabStudent.addEventListener('click', function () { switchTab('student'); });
    dom.tabClub.addEventListener('click', function () { switchTab('club'); });

    dom.signupForm.addEventListener('submit', handleSignup);
    dom.clubForm.addEventListener('submit', handleClubSubmit);
    dom.closeAttendanceModal.addEventListener('click', closeAttendanceModal);
    dom.printAttendance.addEventListener('click', printAttendance);

    // Close modal on backdrop click
    dom.attendanceModal.addEventListener('click', function (e) {
      if (e.target === dom.attendanceModal) closeAttendanceModal();
    });

    // Close modal on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAttendanceModal();
    });
  }

  // ── Tab switching ───────────────────────────────────────────────────────

  function switchTab(tab) {
    if (tab === 'student') {
      dom.tabStudent.classList.add('active');
      dom.tabClub.classList.remove('active');
      dom.viewStudent.classList.add('active');
      dom.viewClub.classList.remove('active');
    } else {
      dom.tabClub.classList.add('active');
      dom.tabStudent.classList.remove('active');
      dom.viewClub.classList.add('active');
      dom.viewStudent.classList.remove('active');
    }
  }

  // ── Load events ─────────────────────────────────────────────────────────

  function loadEvents() {
    dom.loadingMsg.style.display = 'block';
    dom.errorMsg.style.display = 'none';
    dom.eventList.innerHTML = '';

    api.getEvents().then(function (data) {
      dom.loadingMsg.style.display = 'none';

      if (data.error) {
        showError(data.error);
        return;
      }

      eventsCache = data.events || [];
      renderEvents(eventsCache, data.signupCounts || {});
    }).catch(function (err) {
      dom.loadingMsg.style.display = 'none';
      showError('Could not load events. Check your connection and try again.');
      console.error(err);
    });
  }

  function showError(msg) {
    dom.errorMsg.textContent = msg;
    dom.errorMsg.style.display = 'block';
  }

  // ── Render events ───────────────────────────────────────────────────────

  function renderEvents(events, signupCounts) {
    dom.eventList.innerHTML = '';

    if (events.length === 0) {
      dom.eventList.innerHTML = '<p class="empty-state">No events yet. Clubs, submit your first event!</p>';
      return;
    }

    // Sort by date ascending
    var sorted = events.slice().sort(function (a, b) {
      return (a.eventDate || '').localeCompare(b.eventDate || '');
    });

    sorted.forEach(function (ev) {
      var card = document.createElement('div');
      card.className = 'event-card';

      var count = signupCounts[ev.id] || 0;
      var max   = parseInt(ev.maxAttendance, 10) || 0;
      var spots = max - count;
      var full  = spots <= 0;

      var dateDisplay = formatDate(ev.eventDate);
      var timeDisplay = escHtml(ev.eventStartTime || '') +
                        (ev.eventEndTime ? ' – ' + escHtml(ev.eventEndTime) : '');

      card.innerHTML =
        '<div class="event-header">' +
          '<h3>' + escHtml(ev.eventName) + '</h3>' +
          '<span class="event-club">' + escHtml(ev.clubName) + '</span>' +
        '</div>' +
        '<div class="event-meta">' +
          '<span class="event-date">&#128197; ' + dateDisplay + '</span>' +
          '<span class="event-time">&#128338; ' + timeDisplay + '</span>' +
          (ev.location ? '<span class="event-location">&#128205; ' + escHtml(ev.location) + '</span>' : '') +
          (ev.contact ? '<span class="event-contact">&#9993; <a href="mailto:' + escHtml(ev.contact) + '">' + escHtml(ev.contact) + '</a></span>' : '') +
          '<span class="event-capacity ' + (full ? 'full' : '') + '">' +
            '&#128101; ' + count + ' / ' + max +
            (full ? ' (Full)' : ' (' + spots + ' spots left)') +
          '</span>' +
        '</div>' +
        (ev.notes ? '<p class="event-notes"><strong>Notes:</strong> ' + escHtml(ev.notes) + '</p>' : '') +
        '<div class="event-actions">' +
          (full
            ? '<button class="btn btn-full" disabled>Event Full</button>'
            : '<button class="btn btn-primary btn-signup" data-event-id="' + escHtml(ev.id) +
              '" data-event-name="' + escHtml(ev.eventName) + '">Sign Up</button>') +
          '<button class="btn btn-secondary btn-attendance" data-event-id="' + escHtml(ev.id) +
            '" data-event-name="' + escHtml(ev.eventName) + '">&#128196; Attendance</button>' +
        '</div>';

      dom.eventList.appendChild(card);
    });

    // Bind signup buttons
    dom.eventList.querySelectorAll('.btn-signup').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openSignup(btn.dataset.eventId, btn.dataset.eventName);
      });
    });

    // Bind attendance buttons
    dom.eventList.querySelectorAll('.btn-attendance').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openAttendance(btn.dataset.eventId, btn.dataset.eventName);
      });
    });
  }

  // ── Student signup ──────────────────────────────────────────────────────

  function openSignup(eventId, eventName) {
    dom.signupEventId.value = eventId;
    dom.signupEventName.textContent = eventName;
    dom.signupPanel.style.display = 'block';
    dom.signupFeedback.style.display = 'none';
    dom.signupFeedback.className = 'feedback';
    dom.signupPanel.scrollIntoView({ behavior: 'smooth' });
  }

  function handleSignup(e) {
    e.preventDefault();

    var data = {
      eventId: dom.signupEventId.value,
      studentName: dom.signupName.value.trim(),
      studentEmail: dom.signupEmail.value.trim(),
      studentWSUID: dom.signupWSUID.value.trim()
    };

    // Client-side validation
    if (!data.studentName || data.studentName.length > 150) {
      showSignupFeedback('Please enter a valid name.', 'error');
      return;
    }
    if (!data.studentEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.studentEmail)) {
      showSignupFeedback('Please enter a valid email address.', 'error');
      return;
    }
    if (!data.studentWSUID || !/^\d{8,9}$/.test(data.studentWSUID)) {
      showSignupFeedback('Please enter a valid WSU ID (8–9 digits).', 'error');
      return;
    }

    var btn = dom.signupForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    api.signup(data).then(function (resp) {
      btn.disabled = false;
      btn.textContent = 'Confirm Signup';

      if (resp.error) {
        showSignupFeedback(resp.error, 'error');
      } else {
        showSignupFeedback('Signed up successfully!', 'success');
        dom.signupForm.reset();
        dom.signupPanel.style.display = 'none';
        loadEvents(); // refresh counts
      }
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = 'Confirm Signup';
      showSignupFeedback('Network error. Try again.', 'error');
      console.error(err);
    });
  }

  function showSignupFeedback(msg, type) {
    dom.signupFeedback.textContent = msg;
    dom.signupFeedback.className = 'feedback feedback-' + type;
    dom.signupFeedback.style.display = 'block';
  }

  // ── Club event submission ───────────────────────────────────────────────

  function handleClubSubmit(e) {
    e.preventDefault();

    var data = {
      clubName: dom.clubName.value.trim(),
      eventName: dom.eventName.value.trim(),
      eventDate: dom.eventDate.value,
      eventStartTime: dom.eventStartTime.value,
      eventEndTime: dom.eventEndTime.value,
      location: dom.eventLocation.value.trim(),
      contact: dom.eventContact.value.trim(),
      maxAttendance: parseInt(dom.maxAttendance.value, 10),
      notes: dom.notes.value.trim()
    };

    // Client-side validation (mirrors server validation)
    if (!data.clubName || data.clubName.length > 100) {
      showClubFeedback('Please enter a valid club name (max 100 chars).', 'error');
      return;
    }
    if (!data.eventName || data.eventName.length > 200) {
      showClubFeedback('Please enter a valid event name (max 200 chars).', 'error');
      return;
    }
    if (!data.eventDate) {
      showClubFeedback('Please select a date.', 'error');
      return;
    }
    if (!data.eventStartTime) {
      showClubFeedback('Please select a start time.', 'error');
      return;
    }
    if (!data.eventEndTime) {
      showClubFeedback('Please select an end time.', 'error');
      return;
    }
    if (!data.location || data.location.length > 200) {
      showClubFeedback('Please enter a location (max 200 chars).', 'error');
      return;
    }
    if (isNaN(data.maxAttendance) || data.maxAttendance < 1 || data.maxAttendance > 10000) {
      showClubFeedback('Max attendance must be 1–10000.', 'error');
      return;
    }
    if (data.notes.length > 500) {
      showClubFeedback('Notes too long (max 500 chars).', 'error');
      return;
    }

    var btn = dom.clubForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    api.submitEvent(data).then(function (resp) {
      btn.disabled = false;
      btn.textContent = 'Submit Event';

      if (resp.error) {
        showClubFeedback(resp.error, 'error');
      } else {
        showClubFeedback('Event submitted successfully!', 'success');
        dom.clubForm.reset();
        loadEvents();
      }
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = 'Submit Event';
      showClubFeedback('Network error. Try again.', 'error');
      console.error(err);
    });
  }

  function showClubFeedback(msg, type) {
    dom.clubFeedback.textContent = msg;
    dom.clubFeedback.className = 'feedback feedback-' + type;
    dom.clubFeedback.style.display = 'block';
  }

  // ── Attendance modal ────────────────────────────────────────────────────

  function openAttendance(eventId, eventName) {
    dom.attendanceEventName.textContent = eventName;
    dom.attendanceList.innerHTML = '<p class="loading">Loading…</p>';
    dom.attendanceCount.textContent = '—';
    dom.attendanceMax.textContent = '—';
    dom.attendanceModal.style.display = 'flex';

    // Find max attendance from cache
    var ev = eventsCache.find(function (e) { return e.id === eventId; });
    if (ev) {
      dom.attendanceMax.textContent = ev.maxAttendance;
    }

    api.getSignups(eventId).then(function (data) {
      if (data.error) {
        dom.attendanceList.innerHTML = '<p class="error">Error: ' + escHtml(data.error) + '</p>';
        return;
      }

      var signups = data.signups || [];
      dom.attendanceCount.textContent = signups.length;

      if (signups.length === 0) {
        dom.attendanceList.innerHTML = '<p class="empty-state">No students signed up yet.</p>';
        return;
      }

      // Build printable table
      var html =
        '<table class="attendance-table">' +
          '<thead><tr>' +
            '<th>#</th><th>Name</th><th>Email</th><th>WSU ID</th>' +
          '</tr></thead><tbody>';

      signups.forEach(function (s, i) {
        html +=
          '<tr>' +
            '<td>' + (i + 1) + '</td>' +
            '<td>' + escHtml(s.studentName)  + '</td>' +
            '<td>' + escHtml(s.studentEmail) + '</td>' +
            '<td>' + escHtml(s.studentWSUID) + '</td>' +
          '</tr>';
      });
      html += '</tbody></table>';

      dom.attendanceList.innerHTML = html;
    }).catch(function (err) {
      dom.attendanceList.innerHTML = '<p class="error">Could not load signups.</p>';
      console.error(err);
    });
  }

  function closeAttendanceModal() {
    dom.attendanceModal.style.display = 'none';
  }

  function printAttendance() {
    var eventName = dom.attendanceEventName.textContent;
    var listHTML  = dom.attendanceList.innerHTML;
    var count     = dom.attendanceCount.textContent;
    var max       = dom.attendanceMax.textContent;

    var printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(
      '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"><title>Attendance — ' + escHtml(eventName) + '</title>' +
      '<style>' +
        'body { font-family: "Segoe UI", Arial, sans-serif; padding: 30px; }' +
        'h1 { margin-bottom: 5px; }' +
        '.subtitle { color: #666; margin-bottom: 20px; }' +
        '.attendance-table { width: 100%; border-collapse: collapse; }' +
        '.attendance-table th, .attendance-table td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }' +
        '.attendance-table th { background: #f5f5f5; }' +
        '.signature-line { margin-top: 30px; }' +
        '.signature-line span { display: inline-block; width: 250px; border-bottom: 1px solid #000; margin: 0 15px 15px 0; }' +
        '@media print { body { padding: 0; } }' +
      '</style></head><body>' +
      '<h1>' + escHtml(eventName) + '</h1>' +
      '<p class="subtitle">Attendance Sheet — ' + count + ' / ' + max + ' students signed up</p>' +
      '<p class="subtitle">Date: _______________ &nbsp;&nbsp; Printed: ' + new Date().toLocaleDateString() + '</p>' +
      listHTML +
      '<div class="signature-line"><p>Signatures:</p>' +
        Array(Math.max(parseInt(count, 10) || 0, 1)).fill('<span>&nbsp;</span>').join('<br>') +
      '</div>' +
      '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    setTimeout(function () { printWindow.print(); }, 300);
  }

  // ── Utilities ───────────────────────────────────────────────────────────

  function escHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    // Google Sheets may return a Date object instead of a string
    var d = (iso instanceof Date) ? iso : new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  // ── Public ──────────────────────────────────────────────────────────────

  return { init: init };
})();

// Boot
document.addEventListener('DOMContentLoaded', function () {
  app.init();
});
