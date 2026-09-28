# Student Operations & Academic Analytics Hub
## Production Deployment & Essential Component Connection Guide

This guide provides end-to-end instructions for deploying the **Student Operations & Academic Analytics Hub** and connecting all essential external components:
1. **Edge Web Deployment** (Vercel, Netlify, or GitHub Pages)
2. **Google Sheets Two-Way Live Connector** (Free Google Apps Script Web App with Visual Diff)
3. **Supabase Cloud PostgreSQL** (Optional persistent database alternative)
4. **University LMS & Calendar Feeds** (Canvas, Blackboard, Google Calendar WebCal / `.ics`)
5. **GitHub CI/CD & Repository Tracker** (Commits, Pull Requests, Build status)
6. **Teammate Public Read-Only Portal** (Deep links `/#/project/:id/view`)
7. **Audit Reporting & Data Backup** (One-click JSON & Markdown/PDF)

---

## Architecture Diagram

```
+-----------------------------------------------------------------------------------------+
|                                    EDGE BROWSER CLIENT                                  |
|   React 19 + TypeScript + Vite + Tailwind CSS v4                                        |
|   - Academic Grade Solver & Semester GPA Optimizer                                      |
|   - Milestone Buffer Table (72h Safety Buffer & Single DRI Gates)                       |
|   - Visual Schedule Timetable (Month / Week / Agenda + Conflict Detector)               |
|   - Visual Two-Way Diff Drawer (Cherry-pick merge additions & modifications)            |
|   - LocalStorage Fast Cache (Zero-latency offline work)                                 |
+-----------------------------------------------------------------------------------------+
          |                        |                        |                       |
          | (1) WebCal Feed        | (2) GitHub REST        | (3) Google Sheets     | (4) Supabase
          v                        v                        v                       v
+--------------------+   +--------------------+   +--------------------+   +--------------------+
| Google Calendar /  |   | GitHub API         |   | Google Apps Script |   | Supabase REST /    |
| Canvas LMS /       |   | (Public Commits &  |   | Web App            |   | PostgREST          |
| Blackboard (.ics)  |   |  Pull Requests)    |   | (doGet / doPost)   |   | (PostgreSQL RLS)   |
+--------------------+   +--------------------+   +--------------------+   +--------------------+
```

---

## 1. Web Application Deployment

### Option A: Vercel (Recommended - 1-Click Fast Edge Deploy)
Vercel hosts the application with global CDN caching and free HTTPS at `https://your-app.vercel.app`.

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "feat: complete academic hub with google sheets diff and calendar engine"
   git remote add origin https://github.com/<your-username>/student-dashboard.git
   git branch -M main
   git push -u origin main
   ```
2. **Import into Vercel:**
   * Go to [vercel.com](https://vercel.com) and log in.
   * Click **Add New...** &rarr; **Project** &rarr; select `student-dashboard`.
   * **Framework Preset:** Vite
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
   * **Install Command:** `npm install`
   * Click **Deploy**.
3. **Client-Side Routing Support:**
   The included `vercel.json` automatically rewrites all paths to `index.html`, ensuring deep links (like `/#/project/p-dsa/view`) reload without 404 errors:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

### Option B: Local Production Server
To preview or host on a local network/server:
```bash
npm run build
npm run preview
# Serves dist/ on http://localhost:4173
```

---

## 2. Google Sheets Two-Way Live Connector

This connection enables real-time collaboration with teammates who work directly in Google Sheets without requiring Google Cloud billing or server infrastructure.

### Step 2.1: Prepare the Google Sheet
1. Open [Google Sheets](https://sheets.new) and name the spreadsheet (e.g. `Academic Hub Database`).
2. Create three tabs with exact column headers in **Row 1**:

#### Tab 1: `Courses`
| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| id | code | title | credits | semester | weightInClass | weightMidterm | weightFinal | scoreInClass | scoreMidterm | scoreFinal | targetGrade |

#### Tab 2: `Deliverables`
| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| id | projectId | taskName | milestonePhase | ownerName | internalBufferDeadline | officialDueDate | peerReviewer | status | artifactUrl |

#### Tab 3: `CalendarEvents`
| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| id | title | courseCode | startDate | endDate | type | location |

---

### Step 2.2: Add the Google Apps Script Web App
1. In your Google Sheet, open the menu: **Extensions** &rarr; **Apps Script**.
2. Replace all existing text in `Code.gs` with the following:

```javascript
/**
 * Student Operations & Academic Hub - Google Sheets Live Web App
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

### Step 2.3: Deploy as Web App
1. At the top right of the Apps Script window, click **Deploy** &rarr; **New deployment**.
2. Click the gear icon (**Select type**) &rarr; choose **Web app**.
3. Configure:
   * **Description:** `Academic Hub Live Connector`
   * **Execute as:** `Me (your Google email)`
   * **Who has access:** `Anyone` *(Crucial so browser client fetches can read/write without complex OAuth popups)*
4. Click **Deploy**.
5. When prompted, click **Authorize access**, select your Google account, click **Advanced** &rarr; **Go to Untitled project (unsafe)** &rarr; **Allow**.
6. Copy the **Web app URL** (ending with `/exec`, e.g. `https://script.google.com/macros/s/AKfycb.../exec`).

---

### Step 2.4: Connect Dashboard & Use Visual Diff
1. In the Dashboard header, click the **Cloud Sync** button.
2. Select **Google Sheets (Apps Script Web App)** in the Provider dropdown.
3. Paste the `/exec` URL into **Google Apps Script Web App URL**.
4. Click **Test Connection** &rarr; confirm a green shield status appears.
5. Click **Save Cloud Settings**.
6. **Collaborative Workflows:**
   * **Pull & Review Diff:** Fetches remote changes from Google Sheets and opens the **Visual Diff Drawer**. Review green `NEW` additions, amber `MODIFIED` field transitions, cherry-pick the items you want with checkboxes, and click **Accept Selected Changes**.
   * **Push Local &rarr; Remote:** Sends your updated local courses, deliverables, and calendar events back into the Google Sheet.

---

## 3. Supabase Cloud PostgreSQL (Alternative)

If your institution or team prefers Supabase:
1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run:
   ```sql
   create table if not exists public.workspaces (
     workspace_id text primary key,
     data jsonb not null,
     updated_at timestamp with time zone default timezone('utc'::text, now()) not null
   );

   alter table public.workspaces enable row level security;
   create policy "Allow public read/write by workspace_id" on public.workspaces
     for all using (true) with check (true);
   ```
3. In **Project Settings** &rarr; **API**, copy your **Project URL** and `anon` **public API key**.
4. In the Dashboard, open **Cloud Sync**, choose **Supabase PostgreSQL**, input your REST endpoint (`https://<id>.supabase.co/rest/v1/workspaces`), paste the API key, and specify your workspace ID (e.g. `ds-fall2026-hub`).

---

## 4. University LMS & Google Calendar Integration

Sync university assignment due dates, lecture timetables, and exam crunches directly into the visual timetable.

### Canvas LMS
1. Open your university **Canvas** portal &rarr; click **Calendar** on the left navigation bar.
2. At the bottom right, click **Calendar Feed**.
3. Copy the URL (starts with `webcal://...` or `https://.../feed.ics`).
4. In the Dashboard &rarr; **Calendar & Schedule** tab &rarr; click **WebCal URL**.
5. Paste the feed URL and click **Save & Sync Feed**.

### Google Calendar
1. Open [Google Calendar](https://calendar.google.com) on your computer.
2. In the left panel, find your course calendar &rarr; click **Three Dots** &rarr; **Settings and sharing**.
3. Scroll to **Integrate calendar** &rarr; copy **Secret address in iCal format**.
4. In the Dashboard &rarr; **Calendar & Schedule** &rarr; click **WebCal URL**, paste, and sync.

### Offline `.ics` File Import
If your university blocks external CORS requests:
1. Download the `.ics` file from your portal.
2. In the Dashboard, click **Import .ics** and select the file. The parser detects course codes (`DSA201`, `PDM102`) and schedules them into your Month, Week, and Agenda views.

---

## 5. GitHub Repository & CI Monitor

Track live commits and pull request reviews across your team's software projects.

1. Open the **Buffer Table** or **Integrations** tab.
2. Ensure each project has a valid GitHub repo name in `owner/repo` format (e.g. `facebook/react`, `your-org/data-science-sprint2`).
3. The dashboard connects to GitHub's public API:
   * Commits: `https://api.github.com/repos/{owner}/{repo}/commits`
   * Pull Requests: `https://api.github.com/repos/{owner}/{repo}/pulls`
4. Responses are cached for 5 minutes to avoid rate limiting.

---

## 6. Teammate Public Read-Only Portal

To share project status, DRI ownership, and buffer countdowns with teammates or instructors without allowing edits:

1. Open the **Milestone Buffer Table** tab.
2. Select your group project from the dropdown.
3. Click **Share Read-Only Link**.
4. The dashboard copies a deep link to your clipboard:
   ```
   https://your-dashboard.vercel.app/#/project/p-dsa/view
   ```
5. Teammates opening this link get a dedicated view with:
   * Real-time 72-hour internal safety buffer countdowns
   * Deliverable approval sign-off gates
   * Complete prevention of modifications, edits, or deletes

---

## 7. Data Portability & Audit Reporting

* **One-Click JSON Backup:** Click **Export** in the top navigation bar to download `academic_hub_backup_YYYY-MM-DD.json`.
* **Restore Anywhere:** Click **Import** on any browser or computer to restore all grades, notes, buffers, and calendar schedules instantly.
* **Academic Audit Report:** Click **Audit Report** in the top navigation bar to generate:
  * Semester GPA (4.00) & weighted 100-pt average
  * Target Final Exam scores required for desired letter grades
  * Milestone buffer health & single DRI ownership ratios
  * Export options: **Copy Markdown** (for Discord/Slack), **Export .md**, or **Print / PDF**.
