# Design Specification: Google Sheets Two-Way Live Connector & Visual Diff

## 1. Understanding Summary
* **Purpose:** Provide a zero-cost, two-way synchronization bridge between the Student Operations & Academic Hub and Google Sheets via Google Apps Script.
* **Target Users:** Undergraduate data science students, project team leads, and collaborative teammates.
* **Core Functionality:**
  * Pull remote updates from Google Sheets into the dashboard with a side-by-side Visual Diff modal.
  * Granular item-by-item selection (accept/reject) and a master "Accept All" toggle.
  * Push dashboard state back into the Google Sheet to update team members.
  * Modular table scoping: Deliverables (Buffer Table) and Courses enabled by default; Calendar optional.
* **Explicit Non-Goals:**
  * No complex multi-tenant backend server (direct client-to-Google Apps Script).
  * No real-time character-by-character typing sync (state-based on pull/push action).

---

## 2. Assumptions & Constraints
1. **Google Apps Script Backend:** Runs via Google's free infrastructure, deployed as a Web App with access set to "Anyone".
2. **Local Storage of Credentials:** The Apps Script endpoint URL is stored locally in browser `LocalStorage` (`student_dashboard_cloud_config`) and never transmitted to third parties.
3. **Primary Key Matching:** Items are mapped by unique `id` attribute. Missing IDs in Google Sheets are dynamically assigned UUIDs during sync.
4. **Performance:** Sub-second diff generation for standard academic project sizes (10–100 rows).

---

## 3. Decision Log
* **Decision 1:** Built-in Google Sheets two-way synchronization via Google Apps Script (zero cloud hosting cost).
* **Decision 2:** Modular sync scope (Deliverables + Courses by default; Calendar optional).
* **Decision 3:** Granular Item-by-Item Visual Diff Review with a master "Accept All" toggle to prevent teammate accidental overwrites.
* **Decision 4:** Integrated Visual Diff Drawer within Cloud Sync flow to maintain low-strain, focused workspace aesthetics.

---

## 4. Technical Architecture & Components

```
[ Browser / Dashboard Client ]
       │
       ├── 1. Fetches Remote Snapshot via HTTP GET
       ▼
[ Google Apps Script Web App ] ──► [ Google Sheet: Courses / Deliverables / Calendar ]
       │
       ├── 2. Returns JSON Payload
       ▼
[ Diff Engine: syncDiffEngine.ts ]
       │ Compares Remote vs. Local (by unique `id`)
       ▼
[ Visual Diff Modal: SyncDiffModal.tsx ]
       │ Displays Green (Added) & Amber (Modified) rows with checkboxes
       ├── Student selects items & clicks "Merge Selected"
       ▼
[ Storage Service: storageService.ts ] ──► Updates LocalStorage & triggers re-render
```

### 4.1 `src/utils/syncDiffEngine.ts`
* `computeTableDiff<T extends { id: string }>(localItems: T[], remoteItems: T[]): TableDiffResult<T>`
* `mergeSelectedDiffs<T extends { id: string }>(localItems: T[], selectedDiffs: DiffItem<T>[]): T[]`
* Type coercion helpers to ensure numeric strings from Google Sheets match numbers in TypeScript.

### 4.2 `src/components/SyncDiffModal.tsx`
* Provider badge: `Google Sheets (Live)` with last remote timestamp.
* Category tabs: Deliverables, Courses, Calendar.
* Master toggles: "Select All" and "Deselect All".
* Diff rows with color indicators:
  * Green badge for `NEW` rows.
  * Amber badge for `MODIFIED` rows showing field transitions (`status: IN_PROGRESS → APPROVED`).
* Action button: "Apply Selected Changes".

### 4.3 `src/components/CloudSyncModal.tsx`
* Direct **"Google Sheets (Apps Script)"** provider preset.
* Endpoint health validator with immediate visual feedback.
* **"Pull & Review Changes"** launcher.

---

## 5. Verification Plan
* **Unit Tests (`test/engine.test.ts`):**
  * Verification of `computeTableDiff` for new, modified, and unchanged items.
  * Verification of `mergeSelectedDiffs` ensuring only checked items are updated.
* **Lint & Build:**
  * Clean `oxlint` with 0 warnings/errors.
  * Clean `npm run build` production bundle.
