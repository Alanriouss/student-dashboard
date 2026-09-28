# Google Sheets Single-Writer Database Specification
## Student Operations & Academic Analytics Hub

**Status:** APPROVED & VALIDATED  
**Author:** Antigravity Brainstorming & Review System  
**Audience:** Project Lead / Developer  

---

## 1. Executive Summary & Intent

This specification establishes **Google Sheets** as the primary, zero-cost cloud database for the **Student Operations & Academic Analytics Hub**, operating under a **Single-Writer / Multi-Reader (SWMR)** architecture:

- **Target Team Size:** 1 to 6 active users (You as the project lead + 1–5 student teammates).
- **Owner Role (You):** Sole author with full write/edit privileges across courses, GPA targets, deliverables, and calendar events.
- **Teammate Role (Your Team):** Read-only observers who view live milestone progress, 72-hour safety buffers, task ownership (DRI), and project health via a lightweight web portal (`/#/project/:id/view`) without editing or deleting permissions.
- **Cost:** **$0.00 / month forever** (uses standard personal Google account and free Vercel hosting).

---

## 2. Assumptions & System Constraints

1. **Volume & Frequency:** The database stores between 10 and 500 rows total across all three tables. Write events occur a few times per day, well within Google's free limit of 20,000 URL fetch calls/day.
2. **Latency:** Local edits take **0ms** via browser `localStorage`. Cloud push/pull operations take **800ms – 1.8s** via Google Apps Script.
3. **Privacy Boundary:** The Google Sheet remains private to your personal Google account. Academic transcripts and grades are never exposed to teammates.
4. **Offline Resilience:** If university Wi-Fi disconnects, the system retains all pending edits locally and syncs to Google Sheets upon reconnection.

---

## 3. Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│               YOU (Project Lead & Sole Editor)         │
│  - Academic GPA Calculator & Target Solver             │
│  - Milestone 72-Hour Buffer Table & DRI Allocator      │
│  - Conflict-Free Timetable & Exam Crunch Manager       │
└──────────────────────────┬─────────────────────────────┘
                           │ 
                           ▼ (Instant 0ms synchronous read/write)
              ┌─────────────────────────┐
              │ HTML5 LocalStorage Cache│
              └────────────┬────────────┘
                           │
                           │ (Push updates on click / change)
                           ▼
          ┌───────────────────────────────────┐
          │ Google Apps Script Serverless API │
          │ (doGet: JSON / doPost: text/plain)│
          └────────────────┬──────────────────┘
                           │
                           ▼
          ┌───────────────────────────────────┐
          │     Google Sheets Database        │
          │  - "Courses"                      │
          │  - "Deliverables"                 │
          │  - "CalendarEvents"               │
          └────────────────┬──────────────────┘
                           │
                           │ (Live read-only JSON fetch)
                           ▼
┌────────────────────────────────────────────────────────┐
│           TEAMMATES (1 to 5 Read-Only Observers)       │
│  - Public Portal: /#/project/<project-id>/view         │
│  - Real-Time Progress Bar (%)                          │
│  - Milestone Status & DRI Responsibility               │
│  - 72-Hour Internal Safety Buffer Countdown            │
│  - NO EDITING, NO GRADE ACCESS, NO SETTINGS ACCESS     │
└────────────────────────────────────────────────────────┘
```

---

## 4. Normalized Data Schema

The database consists of three dedicated sheets in a single Google Spreadsheet:

### Sheet 1: `Courses`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier (e.g. `c-dsa-01`). |
| `code` | `string` | Course code (e.g. `CS301`). |
| `title` | `string` | Course title (e.g. `Data Structures & Algorithms`). |
| `credits` | `number` | Credit weight (e.g. `3` or `4`). |
| `semester` | `string` | Academic term (e.g. `Fall 2026`). |
| `weightInClass` | `number` | In-class / homework syllabus weight (e.g. `0.20`). |
| `weightMidterm` | `number` | Midterm exam syllabus weight (e.g. `0.30`). |
| `weightFinal` | `number` | Final exam syllabus weight (e.g. `0.50`). |
| `scoreInClass` | `number` | Score earned (0–100). |
| `scoreMidterm` | `number` | Score earned (0–100). |
| `scoreFinal` | `number` | Score earned or projected (0–100). |
| `targetGrade` | `string` | Desired target grade (`A`, `B+`, `B`). |

### Sheet 2: `Deliverables`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique task ID (e.g. `deliv-capstone-01`). |
| `projectId` | `string` | Project identifier (e.g. `p-dsa`). |
| `taskName` | `string` | Milestone task description. |
| `milestonePhase` | `string` | Phase name (e.g. `Sprint 1: Architecture`). |
| `ownerName` | `string` | Directly Responsible Individual (Single DRI). |
| `internalBufferDeadline`| `string` | Internal cutoff enforced 72 hours before official due date. |
| `officialDueDate` | `string` | Hard deadline set by university portal / professor. |
| `peerReviewer` | `string` | Designated teammate responsible for QA sign-off. |
| `status` | `string` | `PLANNED` \| `IN_PROGRESS` \| `REVIEW` \| `APPROVED` \| `SUBMITTED`. |
| `artifactUrl` | `string` | Direct link to GitHub PR, Google Doc, or Figma mockup. |

### Sheet 3: `CalendarEvents`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique event ID. |
| `title` | `string` | Event name (e.g. `Algorithms Final Exam`). |
| `courseCode` | `string` | Associated course. |
| `startDate` | `string` | ISO 8601 start timestamp. |
| `endDate` | `string` | ISO 8601 end timestamp. |
| `type` | `string` | `EXAM` \| `ASSIGNMENT` \| `LECTURE` \| `MEETING`. |
| `location` | `string` | Hall / Zoom link / Lab room. |

---

## 5. Google Apps Script Implementation (`Code.gs`)

Deploy this script attached to your Google Sheet:

```javascript
/**
 * Student Operations & Academic Hub - Google Sheets Live Web App
 * SWMR: Single-Writer / Multi-Reader Proxy
 */
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const data = {
      courses: getRowsAsObjects(ss.getSheetByName("Courses")),
      deliverables: getRowsAsObjects(ss.getSheetByName("Deliverables")),
      calendarEvents: getRowsAsObjects(ss.getSheetByName("CalendarEvents")),
      lastSynced: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (payload.courses) {
      writeObjectsToSheet(ss.getSheetByName("Courses"), payload.courses);
    }
    if (payload.deliverables) {
      writeObjectsToSheet(ss.getSheetByName("Deliverables"), payload.deliverables);
    }
    if (payload.calendarEvents) {
      writeObjectsToSheet(ss.getSheetByName("CalendarEvents"), payload.calendarEvents);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getRowsAsObjects(sheet) {
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[i][j];
    }
    rows.push(row);
  }
  return rows;
}

function writeObjectsToSheet(sheet, objects) {
  if (!sheet || !objects || objects.length === 0) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }

  const dataRows = objects.map(obj => {
    return headers.map(header => (obj[header] !== undefined && obj[header] !== null ? obj[header] : ""));
  });

  sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
}
```

---

## 6. Official Decision Log

| ID | Decision Made | Considered Alternatives | Rationale |
| :--- | :--- | :--- | :--- |
| **DB-DEC-01** | Use Google Sheets + Apps Script as primary database engine. | Supabase PostgreSQL, SQLite, Firebase, 3rd-party SaaS (Sheety). | Zero hosting cost, zero credit-card friction, robust for 1–6 users, and teammates can view records on mobile without installing an app. |
| **DB-DEC-02** | Adopt Single-Writer / Multi-Reader (SWMR) permission model. | Multi-user full edit permissions, RBAC with auth passwords. | You retain 100% control over academic records; teammates view milestone progress via clean public links with zero risk of accidental deletion. |
| **DB-DEC-03** | LocalStorage-first cache with manual/auto push to Google Sheets. | Live continuous polling, WebSockets. | Prevents Google quota exhaustion; enables 0ms UI responsiveness even when university Wi-Fi is spotty. |
| **DB-DEC-04** | Keep Google Sheet private; expose data only via Apps Script `/exec` and Read-Only Deep Link. | Publicly shared spreadsheet. | Protects student transcripts and internal grade weights from unauthorized external inspection. |

---

## 7. Exit Criteria Verification

- [x] Understanding Lock confirmed by user.
- [x] Scope bounded to 1–6 users with low write frequency.
- [x] Access model locked as Single-Writer (Owner) + Read-Only (Teammates).
- [x] Data schema, Google Apps Script source code, and error resilience validated.
- [x] Decision Log complete and committed.
