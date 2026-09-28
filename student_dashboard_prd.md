# Product Requirements Document (PRD)
## Student Operations & Academic Analytics Hub

* **Document Version:** 1.0.0  
* **Target User:** Sophomore Data Science Undergraduates  
* **Document Status:** Ready for Implementation  
* **Architecture:** Decoupled Web App (Frontend + Google Sheets / Apps Script / Supabase API)  

---

## 1. Executive Summary & Objectives

The **Student Operations & Academic Analytics Hub** is a specialized single-page workspace engineered to solve two distinct friction points for data science students:
1. **Academic Performance & Target Grade Modeling:** Tracking coursework components (in-class, midterm, final) and programmatically computing target score thresholds to hit specific letter grades and GPA goals.
2. **Predictable Project Execution:** Managing multi-course software and IT deliverables (e.g., Data Structures & Algorithms, Python Data Manipulation) through a structured **Milestone Buffer Table**, avoiding chaotic last-minute merges and teammate accountability failures.

### Key Performance Indicators (KPIs)
* **Zero Missed Deadlines:** 100% of deliverables tracked with an internal 72-hour safety buffer ahead of official university submission portals.
* **Grade Clarity:** Real-time visibility into required final examination targets per course.
* **Low Operational Overhead:** Less than 20 minutes required per week to maintain project statuses and academic logs.

---

## 2. User Roles & Access Control

| Role | Target Identity | Scope & Permissions |
| :--- | :--- | :--- |
| **Workspace Owner (Admin)** | Student Developer (You) | Full read, create, update, and delete (CRUD) rights across all modules: courses, target grades, project deliverables, GitHub feeds, and quick links. |
| **Project Teammate (Guest)** | Course Project Collaborators | **Read-only access** restricted to assigned project boards via a unique shareable URL (`/project/:id/view`). Cannot edit tasks, view other projects, or see academic grades. |

---

## 3. Functional Requirements

### 3.1 Academic Tracking & Predictive Analytics Module

#### A. Component Structure
Each course evaluation is split into three foundational assessment components:
* **In-Class Score ($S_{\text{in-class}}$):** Attendance, weekly lab exercises, and quizzes.
* **Midterm Score ($S_{\text{midterm}}$):** Midterm exam or mid-semester progress milestone.
* **Final Exam Score ($S_{\text{final}}$):** Comprehensive terminal exam or final project defense.

The final course composite score out of 100 is given by:

$$\text{Course Score}_{100} = (w_{\text{in-class}} \times S_{\text{in-class}}) + (w_{\text{midterm}} \times S_{\text{midterm}}) + (w_{\text{final}} \times S_{\text{final}})$$

$$\text{Subject to: } w_{\text{in-class}} + w_{\text{midterm}} + w_{\text{final}} = 1.0$$

#### B. Institutional Grading & Conversion Standards
The platform maps calculated 100-point composite grades to letter grades, 4.0-scale GPA points, and academic rankings:

| 100-Point Scale Range | Letter Grade | 4.0 Scale Value | Classification (Xếp loại) | Academic Status |
| :--- | :---: | :---: | :--- | :---: |
| $90 \le \text{Score} \le 100$ | **A+** | **4.0** | Xuất sắc (Excellent) | Đạt (Pass) |
| $80 \le \text{Score} < 90$ | **A** | **3.5** | Giỏi (Very good) | Đạt (Pass) |
| $70 \le \text{Score} < 80$ | **B+** | **3.0** | Khá (Good) | Đạt (Pass) |
| $60 \le \text{Score} < 70$ | **B** | **2.5** | Trung bình Khá (Fair) | Đạt (Pass) |
| $50 \le \text{Score} < 60$ | **C** | **2.0** | Trung bình (Average) | Đạt (Pass) |
| $40 \le \text{Score} < 50$ | **D+** | **1.5** | Yếu (Weak) | Không đạt (Fail) |
| $30 \le \text{Score} < 40$ | **D** | **1.0** | Kém (Very weak) | Không đạt (Fail) |
| $\text{Score} < 30$ | **F** | **0.0** | Kém (Very weak) | Không đạt (Fail) |

#### C. Semester & Cumulative GPA Engine
Semester and cumulative GPA calculations are weighted by course credits ($c_i$):

$$\text{GPA}_{4.0} = \frac{\sum_{i=1}^{n} (\text{GradePoint}_{4.0, i} \times c_i)}{\sum_{i=1}^{n} c_i}$$

$$\text{GPA}_{100} = \frac{\sum_{i=1}^{n} (\text{Score}_{100, i} \times c_i)}{\sum_{i=1}^{n} c_i}$$

#### D. Predictive Target Grade Solver
Given a desired score threshold $T \in \{50, 60, 70, 80, 90\}$ corresponding to target letter grades (C, B, B+, A, A+):

$$S_{\text{final\_target}} = \frac{T - (w_{\text{in-class}} \times S_{\text{in-class}}) - (w_{\text{midterm}} \times S_{\text{midterm}})}{w_{\text{final}}}$$

* **Bound Evaluation:**
  * If $S_{\text{final\_target}} \le 0$: Flag as **"Secured"** (grade achieved regardless of final exam score).
  * If $0 < S_{\text{final\_target}} \le 100$: Output exact required integer score.
  * If $S_{\text{final\_target}} > 100$: Flag as **"Mathematically Unattainable"** for target threshold $T$.
* **Interactive Optimizer:** When $S_{\text{in-class}}$ is only partially recorded, provide a slider interface simulating how higher in-class participation lowers the final exam burden.

---

### 3.2 Project Management Module (The Buffer Table)

To eliminate the common pitfalls of university teamwork (the "In-Progress" backlog of Kanban boards and the heavy maintenance overhead of Gantt charts), project workflows follow the **Milestone-Anchored Buffer Table with Single-Threaded Ownership**.

```
+-----------------------------------------------------------------------------------------------------------------+
| PROJECT: Data Structures & Algorithms Implementation (Team Lead Mode)                                           |
| Filters: [All Phases] [Due in 7 Days] | Actions: [+ New Deliverable] [Export] [Copy View-Only Link]             |
+---------------------+-------------------+--------------+-------------------+--------------+----------+----------+
| Deliverable         | Milestone Phase   | Owner (DRI)  | Internal Buffer   | Official Due | Reviewer | Status   |
+---------------------+-------------------+--------------+-------------------+--------------+----------+----------+
| Balanced BST Module | Phase 2 (Midterm) | Alex         | Oct 12, 11:59 PM  | Oct 15       | Dung     | APPROVED |
| Graph Benchmark     | Phase 2 (Midterm) | Liam         | Oct 13, 08:00 PM  | Oct 15       | Sarah    | IN PROG  |
| Report Section 3    | Phase 2 (Midterm) | Dung (Lead)  | Oct 14, 06:00 PM  | Oct 15       | Liam     | NOT STRT |
+---------------------+-------------------+--------------+-------------------+--------------+----------+----------+
```

#### Core Schema & Rules
1. **Deliverable / Sub-Task:** Concrete technical unit of work (e.g., *"Build Data Preprocessing Pipeline"*).
2. **Phase / Milestone:** Course syllabus anchors (e.g., *Phase 1: Proposal*, *Phase 2: Midterm Demo*, *Phase 3: Final Submission*).
3. **Single Owner (DRI):** Strictly **one** student assigned. Multi-owner rows ("Alex & Liam") are forbidden.
4. **Internal Buffer Deadline:** Automatically set **48 to 72 hours before** the professor's submission deadline to guarantee a dedicated merge and validation window.
5. **Peer Reviewer:** A mandatory second team member assigned to review code, run unit tests, or proofread text before sign-off.
6. **Status & Proof Link:** State dropdown (`NOT STARTED`, `IN PROGRESS`, `DRAFT READY`, `APPROVED`) paired with a direct URL (GitHub PR, Google Doc, Figma). A deliverable can only transition to `APPROVED` once verified by the Peer Reviewer.

#### View Modes
* **Personal Work Mode:** Displays a filtered list of deliverables assigned directly to the user across all enrolled courses, ordered chronologically by internal deadline.
* **Team Lead Mode:** Displays the full team roster, deliverable distribution, unassigned review warnings, and provides a "Share Read-Only Link" button for group members.

---

### 3.3 Integrations & Hub Tooling

#### A. Google Calendar Integration
* Fetch events from a dedicated academic calendar using the Google Calendar API v3.
* Filter and display assignment deadlines and exam dates.
* Consolidated "Next 7 Days" dashboard strip alerting the student of approaching buffer dates.

#### B. GitHub Activity Monitor
* Integration with GitHub REST API (`/repos/{owner}/{repo}/commits` and `/pulls`).
* Real-time display for active team projects:
  * Recent 3 commits (author, message, timestamp, commit SHA link).
  * Number of open Pull Requests pending review.
  * Latest GitHub Actions CI/CD build badge (Success / Failure).

#### C. Quick Link Directory
Categorized quick-access navigation grid with persistent shortcut buttons:
* **Academic Portals:** University LMS, Student Affairs portal, Course registration.
* **Storage & Docs:** Project Google Drive root, Shared team folders.
* **Repositories:** GitHub organization or personal repository links.
* **Data Science Reference:** Python Docs, Pandas Cheatsheet, Scikit-learn documentation.

---

## 4. UI/UX Design System (Night & Extended-Session Palette)

Tailored specifically for low-strain night work, avoiding high-contrast pure white/black boundaries and eliminating intense warm colors (reds, yellows, oranges).

```
+-----------------------------------------------------------------------------------+
|                            NIGHT PALETTE SPECIFICATION                            |
+--------------------+-------------------+--------------------+---------------------+
| Background Canvas  | Surface / Card    | Active / Primary   | Slate Secondary     |
| #131716            | #1B2220           | #5B8266            | #648381             |
| Deep Pine Slate    | Muted Forest Dark | Muted Sage Green   | Desaturated Slate   |
+--------------------+-------------------+--------------------+---------------------+
| Primary Text       | Muted Subtext     | Buffer Warning     | Structural Border   |
| #E0E6E4            | #8C9E96           | #997A5B            | #2D3834             |
| Off-White Neutral  | Soft Greenish Gray| Low-Strain Ochre   | Pine Border Tone    |
+--------------------+-------------------+--------------------+---------------------+
```

### Layout Specifications
* **Typography:** System sans-serif (`Inter`, `system-ui`, `-apple-system`) for interfaces; monospaced font (`JetBrains Mono`, `Fira Code`) for GPA counters, grades, code commits, and dates.
* **Component Density:** Compact, data-dense tabular presentation to minimize vertical scrolling.
* **Accessibility:** Contrast ratios strictly kept between $7:1$ and $10:1$ to prevent eye fatigue while exceeding WCAG AAA standards.

---

## 5. System Architecture & Tech Stack Recommendation

### Recommended Architecture: Decoupled Modern Web App
To provide instant load times, clean read-only sharing for team members, and direct GitHub API access, a decoupled architecture is recommended over a monolithic Apps Script interface:

```
[ Frontend: React / Next.js or Vite ]  <--- Edge Hosted on Vercel / GitHub Pages
             |
             +---> Google Calendar API v3 (Direct OAuth / Read Token)
             +---> GitHub REST API (Public Repo Status / Webhooks)
             |
             v
[ Backend API: Google Apps Script Web App OR Supabase ]
             |
             v
[ Persistence: Google Sheets Database OR PostgreSQL ]
```

### Technology Comparison

| Layer | Option 1: Monolithic Google Apps Script | Option 2: Decoupled Web App (Recommended) |
| :--- | :--- | :--- |
| **Frontend** | GAS HTML Service (`google.script.run`) | React / Vite + Tailwind CSS |
| **Backend** | Google Apps Script (`doGet` / `doPost`) | Cloudflare Workers / Serverless API or GAS Web API |
| **Database** | Google Sheets Tabs | Google Sheets API v4 or Supabase (Postgres) |
| **Sharing Security** | High friction (requires Google account permissions) | Tokenized Read-Only URLs (`?token=view_xyz`) |
| **Performance** | High latency (1.5s–3s per sheet interaction) | Sub-100ms UI response; client-side grade solving |

---

## 6. Database Schema Design

### Table 1: `courses`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `code` | VARCHAR(16) | Course code (e.g., `DSA201`, `PDM102`) |
| `title` | VARCHAR(128) | Full course title |
| `credits` | INTEGER | Credit weight (e.g., 3, 4, 5) |
| `weight_inclass` | DECIMAL(3,2) | Component weight (e.g., 0.20) |
| `weight_midterm` | DECIMAL(3,2) | Component weight (e.g., 0.30) |
| `weight_final` | DECIMAL(3,2) | Component weight (e.g., 0.50) |
| `score_inclass` | DECIMAL(5,2) | Recorded in-class score (0–100), Nullable |
| `score_midterm` | DECIMAL(5,2) | Recorded midterm score (0–100), Nullable |
| `score_final` | DECIMAL(5,2) | Recorded final score (0–100), Nullable |
| `target_grade` | VARCHAR(4) | Target letter grade (`A+`, `A`, `B+`, etc.) |

### Table 2: `deliverables` (Buffer Table)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `project_id` | UUID | Foreign Key referencing parent project |
| `task_name` | VARCHAR(255) | Deliverable title |
| `milestone_phase` | VARCHAR(64) | Milestone stage (e.g., Phase 1, Phase 2) |
| `owner_name` | VARCHAR(64) | Single student owner (DRI rule) |
| `internal_buffer_deadline` | TIMESTAMP | Buffer deadline (48–72h prior to due date) |
| `official_due_date` | TIMESTAMP | University portal submission deadline |
| `peer_reviewer` | VARCHAR(64) | Name of assigned reviewer |
| `status` | ENUM | `NOT_STARTED`, `IN_PROGRESS`, `DRAFT_READY`, `APPROVED` |
| `artifact_url` | TEXT | Link to PR, Drive, or document |

### Table 3: `quick_links`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `category` | VARCHAR(32) | Category: `ACADEMIC`, `REPO`, `DOCS`, `TOOL` |
| `title` | VARCHAR(64) | Display label |
| `url` | TEXT | Destination target URL |
| `sort_order` | INTEGER | Sequence order index |

---

## 7. Implementation Roadmap

### Phase 1: Core Foundation & Academic Engine
* [ ] Initialize frontend project repository with dark forest design tokens.
* [ ] Implement Course CRUD interface and Google Sheets / LocalStorage sync.
* [ ] Implement GPA 100-to-4.0 conversion logic based on official institutional scale.
* [ ] Implement single-variable and slider-based target grade solver.

### Phase 2: Buffer Table & Group Project Workflow
* [ ] Build Milestone Buffer Table with single-owner assignment validation.
* [ ] Add automatic 72-hour internal buffer date calculation from official deadline.
* [ ] Create "Personal Mode" vs. "Team Lead Mode" view toggles.
* [ ] Build view-only read route for group collaborators with write controls disabled.

### Phase 3: Integrations & Polishing
* [ ] Connect Google Calendar API to surface active deadlines.
* [ ] Add GitHub repository card fetching latest commits and pull requests.
* [ ] Build customizable Quick Link drawer.
* [ ] Perform end-to-end responsiveness and low-light contrast audits.