/**
 * ==============================================================================
 * STUDENT OPERATIONS & ACADEMIC ANALYTICS HUB
 * Google Sheets & Google Calendar 2-Way Synchronization Connector
 * Version: 3.1 (Multi-Calendar Support + Canvas Auto-Detection + Test Runner)
 * ==============================================================================
 */

const DEFAULT_HEADERS = {
  Courses: [
    "id", "code", "title", "credits", "semester",
    "weightInClass", "weightMidterm", "weightFinal",
    "scoreInClass", "scoreMidterm", "scoreFinal", "targetGrade"
  ],
  Deliverables: [
    "id", "projectId", "taskName", "milestonePhase",
    "ownerName", "internalBufferDeadline", "officialDueDate",
    "peerReviewer", "status", "artifactUrl"
  ],
  CalendarEvents: [
    "id", "title", "courseCode", "startDate", "endDate", "type", "location"
  ]
};

function getSpreadsheet() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    return SpreadsheetApp.openById(SpreadsheetApp.getActiveSpreadsheet().getId());
  }
}

/**
 * Handle GET requests from Web Hub.
 * Parameters:
 * - syncGCal=true: Fetches events across ALL Google Calendars (including Canvas/LMS)
 * - fetchFeed=<url>: Proxy fetches external WebCal feed
 */
function doGet(e) {
  try {
    // 1. Proxy fetch external LMS WebCal feed
    if (e && e.parameter && e.parameter.fetchFeed) {
      const feedUrl = e.parameter.fetchFeed;
      const resp = UrlFetchApp.fetch(feedUrl, { muteHttpExceptions: true });
      return ContentService.createTextOutput(resp.getContentText())
        .setMimeType(ContentService.MimeType.TEXT);
    }

    const ss = getSpreadsheet();
    let courses = getRowsAsObjects(ss.getSheetByName("Courses"));
    let deliverables = getRowsAsObjects(ss.getSheetByName("Deliverables"));
    let sheetEvents = getRowsAsObjects(ss.getSheetByName("CalendarEvents"));

    // 2. Multi-Calendar Fetch (Primary + Canvas + Subscribed Calendars)
    let gcalEvents = [];
    let calNames = [];
    let gcalError = null;

    if (e && e.parameter && e.parameter.syncGCal === "true") {
      try {
        const result = getGoogleCalendarEvents();
        gcalEvents = result.events;
        calNames = result.calendarNames;
      } catch (calErr) {
        gcalError = calErr.toString();
      }
    }

    // Merge events (dedupe by title and start date)
    const eventMap = new Map();
    sheetEvents.forEach(function(ev) {
      const key = (ev.title || "").trim().toLowerCase() + "_" + (ev.startDate || "").slice(0, 16);
      eventMap.set(key, ev);
    });

    gcalEvents.forEach(function(ev) {
      const key = (ev.title || "").trim().toLowerCase() + "_" + (ev.startDate || "").slice(0, 16);
      if (!eventMap.has(key)) {
        eventMap.set(key, ev);
      }
    });

    const mergedEvents = Array.from(eventMap.values());

    const data = {
      courses: courses,
      deliverables: deliverables,
      calendarEvents: mergedEvents,
      gcalCount: gcalEvents.length,
      calendarsScanned: calNames,
      gcalError: gcalError,
      lastSynced: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: data,
      lastSynced: data.lastSynced
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests from Project Lead Hub.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Missing request body"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(e.postData.contents);
    const ss = getSpreadsheet();

    let coursesCount = 0;
    let deliverablesCount = 0;
    let eventsCount = 0;
    let gcalSyncedCount = 0;

    if (payload.courses && Array.isArray(payload.courses)) {
      const sheet = getOrCreateSheet(ss, "Courses", DEFAULT_HEADERS.Courses);
      writeObjectsToSheet(sheet, payload.courses, DEFAULT_HEADERS.Courses);
      coursesCount = payload.courses.length;
    }

    if (payload.deliverables && Array.isArray(payload.deliverables)) {
      const sheet = getOrCreateSheet(ss, "Deliverables", DEFAULT_HEADERS.Deliverables);
      writeObjectsToSheet(sheet, payload.deliverables, DEFAULT_HEADERS.Deliverables);
      deliverablesCount = payload.deliverables.length;
    }

    if (payload.calendarEvents && Array.isArray(payload.calendarEvents)) {
      const sheet = getOrCreateSheet(ss, "CalendarEvents", DEFAULT_HEADERS.CalendarEvents);
      writeObjectsToSheet(sheet, payload.calendarEvents, DEFAULT_HEADERS.CalendarEvents);
      eventsCount = payload.calendarEvents.length;

      // 2-Way Sync to Google Calendar
      if (payload.syncToGCal === true || payload.syncToGCal === undefined) {
        gcalSyncedCount = syncEventsToGoogleCalendar(payload.calendarEvents);
      }
    }

    // Clean up empty default "Sheet1"
    const defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("Trang tính 1");
    if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
      try {
        ss.deleteSheet(defaultSheet);
      } catch (ignored) {}
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      message: `Updated Google Sheets (${coursesCount} courses, ${deliverablesCount} tasks, ${eventsCount} events). Synced ${gcalSyncedCount} events with Google Calendar.`
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 2-Way Read: Fetch upcoming and recent events from ALL Google Calendars
 * (Loops through Primary calendar AND all secondary/Canvas subscribed calendars)
 */
function getGoogleCalendarEvents() {
  const allEvents = [];
  const calendarNames = [];
  const now = new Date();

  // Wide window: 60 days in past to 200 days in future (covers full semester)
  const startDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000);

  // Get ALL calendars attached to the user's account
  const calendars = CalendarApp.getAllCalendars();

  for (let i = 0; i < calendars.length; i++) {
    const cal = calendars[i];
    try {
      const name = cal.getName();
      calendarNames.push(name);

      const events = cal.getEvents(startDate, endDate);
      for (let j = 0; j < events.length; j++) {
        const ev = events[j];
        const title = ev.getTitle() || "Untitled Event";
        let type = "LECTURE";
        const lower = title.toLowerCase();

        if (lower.includes("exam") || lower.includes("thi") || lower.includes("midterm") || lower.includes("final") || lower.includes("quiz")) {
          type = "EXAM";
        } else if (lower.includes("assignment") || lower.includes("due") || lower.includes("bài tập") || lower.includes("deadline") || lower.includes("submit") || lower.includes("hw")) {
          type = "ASSIGNMENT";
        } else if (lower.includes("lab") || lower.includes("thực hành")) {
          type = "LAB";
        }

        const match = title.match(/\b([A-Z]{2,4}\s?\d{3})\b/i);
        const courseCode = match ? match[1].replace(/\s+/, "").toUpperCase() : "";

        allEvents.push({
          id: "gcal-" + ev.getId(),
          title: title,
          courseCode: courseCode,
          startDate: ev.getStartTime().toISOString(),
          endDate: ev.getEndTime().toISOString(),
          type: type,
          location: ev.getLocation() || "",
          description: (ev.getDescription() || "") + " [Calendar: " + name + "]"
        });
      }
    } catch (calErr) {
      Logger.log("Error reading calendar: " + calErr.message);
    }
  }

  return {
    events: allEvents,
    calendarNames: calendarNames
  };
}

/**
 * 2-Way Write: Push & upsert events into Primary Google Calendar
 */
function syncEventsToGoogleCalendar(calendarEvents) {
  try {
    const cal = CalendarApp.getDefaultCalendar();
    if (!cal || !calendarEvents || !Array.isArray(calendarEvents)) return 0;

    let count = 0;
    calendarEvents.forEach(function(ev) {
      if (!ev.title || !ev.startDate) return;

      const start = new Date(ev.startDate);
      const end = ev.endDate ? new Date(ev.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      // Update existing Google Calendar event
      if (ev.id && ev.id.indexOf("gcal-") === 0) {
        const rawId = ev.id.substring(5);
        try {
          const existing = cal.getEventById(rawId);
          if (existing) {
            existing.setTitle(ev.title);
            existing.setTime(start, end);
            if (ev.location) existing.setLocation(ev.location);
            count++;
            return;
          }
        } catch (e) {}
      }

      // Check if duplicate exists within +/- 1 minute window
      const windowStart = new Date(start.getTime() - 60000);
      const windowEnd = new Date(start.getTime() + 60000);
      const existingList = cal.getEvents(windowStart, windowEnd);
      const match = existingList.find(function(ex) {
        return ex.getTitle().trim().toLowerCase() === ev.title.trim().toLowerCase();
      });

      if (!match) {
        cal.createEvent(ev.title, start, end, {
          location: ev.location || "",
          description: "Synced from Student Operations Hub (" + (ev.type || "ACADEMIC") + ")"
        });
        count++;
      }
    });

    return count;
  } catch (err) {
    return 0;
  }
}

/**
 * ==============================================================================
 * TEST RUNNER: Click "Run" on this function inside Apps Script to verify!
 * It will prompt for Calendar permissions and log found events immediately.
 * ==============================================================================
 */
function testCalendarSync() {
  const result = getGoogleCalendarEvents();
  Logger.log("==========================================");
  Logger.log("Calendars Scanned: " + result.calendarNames.join(", "));
  Logger.log("Total Events Found: " + result.events.length);
  Logger.log("==========================================");
  result.events.slice(0, 10).forEach(function(e, idx) {
    Logger.log("[" + (idx + 1) + "] " + e.title + " | " + e.startDate + " | " + e.description);
  });
}

function getOrCreateSheet(ss, sheetName, defaultHeaders) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
    sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight("bold");
    sheet.getRange(1, 1, 1, defaultHeaders.length).setBackground("#E2E8F0");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getRowsAsObjects(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(h => String(h).trim());
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      const val = values[i][j];
      row[headers[j]] = val;
      if (val !== "" && val !== null && val !== undefined) {
        hasData = true;
      }
    }
    if (hasData) {
      rows.push(row);
    }
  }
  return rows;
}

function writeObjectsToSheet(sheet, objects, fallbackHeaders) {
  if (!sheet) return;

  let lastCol = sheet.getLastColumn();
  let headers = [];

  if (lastCol > 0) {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
      .map(h => String(h).trim())
      .filter(h => h.length > 0);
  }

  if (headers.length === 0) {
    headers = fallbackHeaders || (objects.length > 0 ? Object.keys(objects[0]) : []);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.getRange(1, 1, 1, headers.length).setBackground("#E2E8F0");
      sheet.setFrozenRows(1);
      lastCol = headers.length;
    }
  }

  if (headers.length === 0) return;

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }

  if (!objects || objects.length === 0) return;

  const dataRows = objects.map(obj => {
    return headers.map(header => {
      const val = obj[header];
      return (val !== undefined && val !== null) ? val : "";
    });
  });

  if (dataRows.length > 0) {
    sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
  }
}
