/**
 * ==============================================================================
 * STUDENT OPERATIONS & ACADEMIC ANALYTICS HUB
 * Google Sheets Serverless Database Connector (SWMR: Single-Writer / Multi-Reader)
 * ==============================================================================
 *
 * HOW TO DEPLOY:
 * 1. Open Google Sheets (https://sheets.new)
 * 2. Rename spreadsheet (e.g., "Student Hub Database")
 * 3. Create 3 tabs with Row 1 headers:
 *    - "Courses": id, code, title, credits, semester, weightInClass, weightMidterm, weightFinal, scoreInClass, scoreMidterm, scoreFinal, targetGrade
 *    - "Deliverables": id, projectId, taskName, milestonePhase, ownerName, internalBufferDeadline, officialDueDate, peerReviewer, status, artifactUrl
 *    - "CalendarEvents": id, title, courseCode, startDate, endDate, type, location
 * 4. Go to Extensions > Apps Script
 * 5. Paste this entire file into Code.gs
 * 6. Click Deploy > New deployment > Select type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy the Web App URL (ends in /exec) and paste into the Hub Cloud Sync modal!
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

/**
 * Handle GET requests from the Web Hub or Teammate Portal.
 * Returns a complete JSON snapshot of Courses, Deliverables, and CalendarEvents.
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const data = {
      courses: getRowsAsObjects(ss.getSheetByName("Courses")),
      deliverables: getRowsAsObjects(ss.getSheetByName("Deliverables")),
      calendarEvents: getRowsAsObjects(ss.getSheetByName("CalendarEvents")),
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
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests from the Project Lead Hub.
 * Updates Courses, Deliverables, and CalendarEvents sheets with latest state.
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
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (payload.courses && Array.isArray(payload.courses)) {
      writeObjectsToSheet(ss.getSheetByName("Courses"), payload.courses);
    }
    if (payload.deliverables && Array.isArray(payload.deliverables)) {
      writeObjectsToSheet(ss.getSheetByName("Deliverables"), payload.deliverables);
    }
    if (payload.calendarEvents && Array.isArray(payload.calendarEvents)) {
      writeObjectsToSheet(ss.getSheetByName("CalendarEvents"), payload.calendarEvents);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Google Sheets updated successfully"
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Read sheet rows and convert to array of objects using Row 1 as keys.
 */
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

/**
 * Clear existing sheet rows (preserving Row 1 headers) and write object rows.
 */
function writeObjectsToSheet(sheet, objects) {
  if (!sheet) return;
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());

  // Clear existing data rows
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }

  if (!objects || objects.length === 0) return;

  const dataRows = objects.map(obj => {
    return headers.map(header => {
      const val = obj[header];
      return val !== undefined && val !== null ? val : "";
    });
  });

  sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
}
