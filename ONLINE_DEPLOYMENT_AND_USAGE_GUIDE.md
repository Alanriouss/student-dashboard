# Student Operations & Academic Analytics Hub
## Complete Online Deployment & User Operations Guide
### Hướng Dẫn Toàn Diện: Triển Khai Lên Mạng & Vận Hành Trực Tuyến

---

> **Quick Language Navigation / Chuyển Đổi Ngôn Ngữ Nhanh:**
> - 🇬🇧 **[Part 1: English Guide (Deployment & Online Usage)](#part-1-english-deployment--online-usage-guide)**
> - 🇻🇳 **[Phần 2: Hướng Dẫn Tiếng Việt (Triển Khai & Sử Dụng Chi Tiết)](#phan-2-huong-dan-trien-khai-va-su-dung-chi-tiet-tieng-viet)**

---

<a name="part-1-english-deployment--online-usage-guide"></a>
# PART 1: English Deployment & Online Usage Guide

Welcome to the **Student Operations & Academic Analytics Hub** – an edge-native, zero-cost academic management platform designed for ambitious university students and high-performing project teams. 

This guide covers everything required to deploy the system online for free, connect collaborative cloud backends, and master every feature in production.

---

## Table of Contents (English)
1. [Architecture & Technology Stack](#1-architecture--technology-stack)
2. [5-Minute Online Deployment (Zero Cost)](#2-5-minute-online-deployment-zero-cost)
   - [Option A: Vercel Edge (Recommended)](#option-a-vercel-edge-recommended)
   - [Option B: Netlify](#option-b-netlify)
   - [Option C: GitHub Pages](#option-c-github-pages)
3. [Cloud Database & Collaborative Sync Setup](#3-cloud-database--collaborative-sync-setup)
   - [Google Sheets 2-Way Sync via Google Apps Script (Free)](#google-sheets-2-way-sync-via-google-apps-script-free)
   - [Supabase PostgreSQL (Optional)](#supabase-postgresql-optional)
4. [External Integrations](#4-external-integrations)
   - [Canvas LMS / Blackboard / Google Calendar (.ics Feed)](#canvas-lms--blackboard--google-calendar-ics-feed)
   - [GitHub Repositories & CI/CD Tracking](#github-repositories--cicd-tracking)
5. [Online Usage & Feature Walkthrough](#5-online-usage--feature-walkthrough)
   - [Real-Time KPI Strip](#real-time-kpi-strip)
   - [Academic Performance & GPA Optimization](#academic-performance--gpa-optimization)
   - [72-Hour Milestone Buffer & Team Accountability](#72-hour-milestone-buffer--team-accountability)
   - [Smart Schedule & Exam Conflict Detector](#smart-schedule--exam-conflict-detector)
   - [Visual Diff Cherry-Pick Merging](#visual-diff-cherry-pick-merging)
   - [Teammate Public Read-Only Portal](#teammate-public-read-only-portal)
   - [Academic Audit Reports & Backup/Restore](#academic-audit-reports--backuprestore)
6. [Troubleshooting & FAQ](#6-troubleshooting--faq)

---

## 1. Architecture & Technology Stack

The Hub runs completely in modern web browsers as an **offline-first Single Page Application (SPA)**:
- **Frontend Core:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Local Persistence:** HTML5 `localStorage` (instant loading, zero latency, works without Wi-Fi).
- **Edge Hosting:** Vercel Global Edge Network, Netlify, or GitHub Pages.
- **Cloud Backend:** Google Sheets via Google Apps Script serverless proxy (no cloud hosting fees or Google Cloud bills).
- **Navigation:** Hash-based router (`/#/project/:id/view`) guaranteed to never throw 404s on static CDNs.

---

## 2. 5-Minute Online Deployment (Zero Cost)

### Option A: Vercel Edge (Recommended)
Vercel provides global CDN caching, automatic HTTPS, and seamless Git deployments on their free Hobby Tier.

#### Step 1: Push Code to GitHub
Open your terminal in the project directory:
```bash
git init
git add .
git commit -m "feat: initial commit of academic hub"
git branch -M main
git remote add origin https://github.com/<your-username>/student-dashboard.git
git push -u origin main
```

#### Step 2: Connect to Vercel
1. Sign up or log in at [vercel.com](https://vercel.com).
2. Click **Add New...** &rarr; **Project**.
3. Select your `student-dashboard` repository and click **Import**.
4. Configure the build parameters:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Click **Deploy**.
6. Within 60 seconds, your site is live at: `https://your-app-name.vercel.app`.

> [!NOTE]
> The included `vercel.json` file ensures that all incoming routes are forwarded to `index.html`, eliminating 404 errors when refreshing direct links.

---

### Option B: Netlify
1. Log in to [netlify.com](https://netlify.com).
2. Click **Add new site** &rarr; **Import an existing project** &rarr; **GitHub**.
3. Select the repository. Set:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. If prompted for redirects, create a file named `public/_redirects` with:
   ```text
   /*    /index.html   200
   ```
5. Click **Deploy site**.

---

### Option C: GitHub Pages
1. In `vite.config.ts`, add the repository base path:
   ```ts
   export default defineConfig({
     base: '/student-dashboard/',
     plugins: [react(), tailwindcss()],
   })
   ```
2. Run `npm run build`.
3. Push the `dist` folder to a `gh-pages` branch or configure GitHub Actions to deploy from `main`.

---

## 3. Cloud Database & Collaborative Sync Setup

While local storage saves all data on your computer, connecting Google Sheets lets your team view and edit data from any mobile phone or browser.

### Google Sheets 2-Way Sync via Google Apps Script (Free)

#### Step 3.1: Create the Google Sheet
1. Open [Google Sheets](https://sheets.new) and name it `Academic Hub Database`.
2. Create **three tabs** with the exact column headers in **Row 1**:

**Tab 1: `Courses`**
```
id | code | title | credits | semester | weightInClass | weightMidterm | weightFinal | scoreInClass | scoreMidterm | scoreFinal | targetGrade
```

**Tab 2: `Deliverables`**
```
id | projectId | taskName | milestonePhase | ownerName | internalBufferDeadline | officialDueDate | peerReviewer | status | artifactUrl
```

**Tab 3: `CalendarEvents`**
```
id | title | courseCode | startDate | endDate | type | location
```

---

#### Step 3.2: Insert Google Apps Script
1. In your Google Sheet, click **Extensions** &rarr; **Apps Script**.
2. Erase any placeholder code in `Code.gs` and paste the following script:

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

#### Step 3.3: Deploy as Public Web App
1. Click **Deploy** (top right) &rarr; **New deployment**.
2. Select type: **Web app** (gear icon).
3. Fill in:
   - **Description:** `Academic Hub Live API`
   - **Execute as:** `Me (your Google email)`
   - **Who has access:** `Anyone` *(Crucial: allows client-side web fetches without complex OAuth redirects)*
4. Click **Deploy**.
5. Grant permissions: Click **Authorize access** &rarr; choose your Google Account &rarr; **Advanced** &rarr; **Go to Untitled project (unsafe)** &rarr; **Allow**.
6. Copy the **Web App URL** ending in `/exec`.

---

#### Step 3.4: Connect Your Dashboard
1. Open your deployed Hub URL (e.g. `https://your-app.vercel.app`).
2. In the top navigation bar, click **Cloud Sync**.
3. Select **Google Sheets (Apps Script Web App)**.
4. Paste the `/exec` URL into the field.
5. Click **Test Connection** &rarr; wait for the green shield verification.
6. Click **Save Cloud Settings**.
7. Click **Push Local &rarr; Remote** to seed your Google Sheet with initial courses and deadlines!

---

### Supabase PostgreSQL (Optional)
If you prefer a relational SQL database:
1. Create a free database at [supabase.com](https://supabase.com).
2. Run this SQL in the **SQL Editor**:
   ```sql
   create table if not exists public.workspaces (
     workspace_id text primary key,
     data jsonb not null,
     updated_at timestamp with time zone default timezone('utc'::text, now()) not null
   );

   alter table public.workspaces enable row level security;
   create policy "Allow read/write" on public.workspaces for all using (true) with check (true);
   ```
3. Copy your project REST URL (`https://<id>.supabase.co/rest/v1/workspaces`) and public `anon` key into the Hub's **Cloud Sync** modal.

---

## 4. External Integrations

### Canvas LMS / Blackboard / Google Calendar (.ics Feed)
1. In your university **Canvas** portal, click **Calendar** &rarr; **Calendar Feed** (bottom right).
2. Copy the URL (e.g. `webcal://canvas.university.edu/feeds/calendars/...ics`).
3. In the Hub, switch to the **Calendar & Schedule** tab.
4. Click **WebCal URL** in the toolbar, paste your feed link, and click **Save & Sync Feed**.
5. All course deadlines, lecture sessions, and exam dates appear on your timetable automatically.

### GitHub Repositories & CI/CD Tracking
1. Switch to the **Integrations** tab.
2. Under **GitHub Repository Monitor**, enter your repository name (`owner/repo`).
3. View the latest commits, active Pull Requests, and CI/CD workflow status live without leaving your dashboard.

---

## 5. Online Usage & Feature Walkthrough

### Real-Time KPI Strip
Located directly under the header:
- **Semester GPA:** Real-time 4.00-scale GPA computed across all enrolled credits.
- **Buffer Health:** Percentage of deliverables with more than 72 hours remaining before their internal cutoff.
- **Pending Reviews:** Tasks submitted by teammates waiting for quality approval.
- **Upcoming Exams:** Number of critical exams or high-stakes deadlines occurring within the next 7 days.

---

### Academic Performance & GPA Optimization
- **Final Exam Solver:** On any course card, enter your current in-class and midterm grades. Select your target letter grade (`A`, `B+`, `B`). The card immediately solves the exact score needed on the final exam (e.g. *"Need 86.5/100 on Final to secure an A"*).
- **Macro Target GPA Optimizer:** Click **Target GPA Optimizer** in the header. Set your desired semester GPA (e.g. `3.80`). The mathematical solver balances exam effort across all courses proportional to their credit weights. Click **Apply Optimized Target Plan** to write targets to your courses.
- **Study Notes & Formulas:** Click the book icon (**Notes & Formulas**) on any course to open the markdown cheat sheet drawer with 1-click formulas for Bayes' Theorem, Big-O Complexity, Gradient Descent, and SQL Window Functions.

---

### 72-Hour Milestone Buffer & Team Accountability
Traditional group projects fail due to last-minute cramming and unaccountable teammates. The **Milestone Buffer** module enforces two non-negotiable rules:
1. **72-Hour Safety Buffer:** For every task, entering an Official Due Date automatically computes an **Internal Buffer Deadline 72 hours earlier**. This 3-day window is reserved for testing, peer critique, and portal submission buffer.
2. **Single DRI (Directly Responsible Individual):** Every deliverable must have one person in charge.
3. **Peer Review Gate:** A task cannot enter the `APPROVED` state until its designated **Peer Reviewer** verifies the submission.

---

### Smart Schedule & Exam Conflict Detector
- View assignments and classes in **Month**, **Week**, or **Agenda** views.
- **Exam Conflict Detector:** The algorithm analyzes your examination schedule. If two exams occur on the same day or within 24 hours of each other, an amber alert card highlights the conflict and provides a direct link to submit an official university exam rescheduling petition.

---

### Visual Diff Cherry-Pick Merging
When working with team members who edit the Google Sheet directly:
1. Click **Cloud Sync** &rarr; **Pull & Review Diff**.
2. A side-by-side **Visual Diff Drawer** displays:
   - Green badges: Brand-new courses or tasks added remotely.
   - Amber badges: Modified scores, updated dates, or changed DRI owners.
3. Check the boxes next to the items you want to merge.
4. Click **Accept Selected Changes**. Your local workspace updates safely without overwriting your private work.

---

### Teammate Public Read-Only Portal
Need to share milestone deadlines with project members or teaching assistants without letting them alter your personal dashboard?
1. Open the **Milestone Buffer** tab.
2. Select your project and click **Share Read-Only Link**.
3. Share the generated deep link (e.g. `https://your-hub.vercel.app/#/project/p-dsa/view`).
4. Teammates can view the full progress board, DRI assignments, and artifact links in a clean, read-only interface.

---

### Academic Audit Reports & Backup/Restore
- **Audit Report:** Click **Audit Report** in the top header to generate an executive academic summary with semester GPA, credit progress, and milestone completion stats. Click **Print PDF** or **Copy Markdown** to attach it to internship applications or scholarship portfolios.
- **Data Backup (Disaster Recovery):** Click **Export / Import** &rarr; **Export Backup JSON** to save a snapshot of your entire database to your computer.

---

## 6. Troubleshooting & FAQ

| Problem | Root Cause | Solution |
| :--- | :--- | :--- |
| **Google Sheets test fails with "Failed to fetch"** | Apps Script access permission is restricted. | In Apps Script, click **Deploy** &rarr; **Manage deployments** &rarr; edit &rarr; set **Who has access** to **Anyone**. Re-deploy and copy the `/exec` URL. |
| **URL ends in `/dev` and will not sync** | Copied the test deployment URL instead of the production Web App URL. | In Apps Script, click **Deploy** &rarr; **New deployment** &rarr; **Web app** and copy the URL ending in `/exec`. |
| **Refreshing deep link gives 404 on custom host** | Static hosting provider does not rewrite SPA routes. | Use hash links (default: `/#/project/...`), or ensure `vercel.json` / `_redirects` is in the deployment root. |
| **Canvas calendar events not appearing** | URL does not point to the raw `.ics` calendar feed. | Ensure the URL begins with `https://` or `webcal://` and ends in `.ics`. |

---
---

<a name="phan-2-huong-dan-trien-khai-va-su-dung-chi-tiet-tieng-viet"></a>
# PHẦN 2: Hướng Dẫn Triển Khai & Sử Dụng Chi Tiết (Tiếng Việt)

Chào mừng bạn đến với **Student Operations & Academic Analytics Hub** – Nền tảng điều hành học tập và quản trị dự án nhóm chuẩn quốc tế, giúp sinh viên đại học chinh phục GPA xuất sắc và xóa bỏ triệt để tình trạng trễ hạn bài tập lớn.

---

## Mục Lục (Tiếng Việt)
1. [Kiến Trúc Kỹ Thuật & Tính Năng Nổi Bật](#1-kien-truc-ky-thuat)
2. [Triển Khai Lên Mạng Trong 5 Phút (Miễn Phí 100%)](#2-trien-khai-len-mang-5-phut)
   - [Phương Án 1: Vercel Edge (Khuyên dùng)](#phuong-an-1-vercel-edge)
   - [Phương Án 2: Netlify](#phuong-an-2-netlify)
   - [Phương Án 3: GitHub Pages](#phuong-an-3-github-pages)
3. [Thiết Lập Cơ Sở Dữ Liệu Đám Mây (Google Sheets & Supabase)](#3-thiet-lap-co-so-du-lieu-dam-may)
   - [Đồng Bộ 2 Chiều Với Google Sheets Qua Google Apps Script (0 Đồng)](#dong-bo-2-chieu-google-sheets)
   - [Supabase PostgreSQL (Tùy chọn)](#supabase-postgresql)
4. [Tích Hợp Dịch Vụ Trường Học](#4-tich-hop-dich-vu-truong-hoc)
   - [Đồng Bộ Lịch Canvas LMS / Blackboard / Google Calendar](#dong-bo-lich-canvas)
   - [Theo Dõi Dự Án GitHub & CI/CD](#theo-doi-du-an-github)
5. [Cẩm Nang Vận Hành & Khai Thác Toàn Diện](#5-cam-nang-van-hanh)
   - [Thanh Chỉ Số Hiệu Suất Thời Gian Thực (KPI Strip)](#thanh-chi-so-kpi)
   - [Quản Trị Học Thuật & Bộ Tối Ưu Điểm GPA](#quan-tri-hoc-thuat-gpa)
   - [Bảng Đệm An Toàn 72 Giờ & Trách Nhiệm Nhóm (DRI)](#bang-dem-an-toan-72-gio)
   - [Lịch Học Thông Minh & Cảnh Báo Trùng Lịch Thi](#lich-hoc-thong-minh)
   - [Đối Chiếu & Hợp Nhất Dữ Liệu Hai Chiều (Visual Diff)](#doi-chieu-du-lieu-diff)
   - [Cổng Chia Sẻ Dự Án Cho Đồng Đội (Chỉ Xem)](#cong-chia-se-du-an)
   - [Báo Cáo Kiểm Toán Học Thuật & Sao Lưu JSON](#bao-cao-kiem-toan-hoc-thuat)
6. [Xử Lý Sự Cố Kỹ Thuật & Câu Hỏi Thường Gặp (FAQ)](#6-xu-ly-su-co-faq)

---

<a name="1-kien-truc-ky-thuat"></a>
## 1. Kiến Trúc Kỹ Thuật & Tính Năng Nổi Bật

Hệ thống được thiết kế theo tư duy **Offline-First**, hoạt động cực nhanh ngay trên trình duyệt:
- **Giao diện & Xử lý:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons.
- **Lưu trữ tức thời:** HTML5 `localStorage` – dữ liệu luôn sẵn sàng ngay cả khi mất mạng.
- **Máy chủ tĩnh (Edge):** Vercel, Netlify hoặc GitHub Pages – hoàn toàn miễn phí.
- **Cơ sở dữ liệu đám mây:** Google Sheets qua Google Apps Script Web App – đồng đội có thể xem và sửa trên điện thoại hoặc bảng tính thông thường mà không tốn chi phí thuê server.

---

<a name="2-trien-khai-len-mang-5-phut"></a>
## 2. Triển Khai Lên Mạng Trong 5 Phút (Miễn Phí 100%)

<a name="phuong-an-1-vercel-edge"></a>
### Phương Án 1: Vercel Edge (Khuyên Dùng Nhất)
Vercel cung cấp hạ tầng CDN toàn cầu, chứng chỉ bảo mật HTTPS tự động và băng thông miễn phí trọn đời cho dự án cá nhân.

#### Bước 1: Đẩy Mã Nguồn Lên GitHub
Mở cửa sổ dòng lệnh (Terminal/PowerShell) tại thư mục dự án:
```bash
git init
git add .
git commit -m "feat: trien khai he thong quan ly hoc tap"
git branch -M main
git remote add origin https://github.com/<tai-khoan-cua-ban>/student-dashboard.git
git push -u origin main
```

#### Bước 2: Kết Nối Với Vercel
1. Đăng ký hoặc đăng nhập tài khoản tại [vercel.com](https://vercel.com).
2. Nhấp nút **Add New...** &rarr; chọn **Project**.
3. Tìm kho lưu trữ `student-dashboard` vừa đẩy lên và bấm **Import**.
4. Các thông số cấu hình mặc định:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Nhấp nút **Deploy**.
6. Sau khoảng 45-60 giây, website của bạn sẽ hoạt động chính thức tại địa chỉ: `https://ten-du-an.vercel.app`.

> [!TIP]
> Tệp `vercel.json` đi kèm dự án đã cấu hình sẵn quy tắc định tuyến, giúp bạn thoải mái tải lại trang hoặc chia sẻ link sâu (như `/#/project/p-dsa/view`) mà không bao giờ bị lỗi 404.

---

<a name="phuong-an-2-netlify"></a>
### Phương Án 2: Netlify
1. Đăng nhập [netlify.com](https://netlify.com).
2. Chọn **Add new site** &rarr; **Import an existing project** &rarr; **GitHub**.
3. Chọn kho mã nguồn của bạn. Điền thông tin:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Bấm **Deploy site**. Website sẽ có địa chỉ `https://ten-trang.netlify.app`.

---

<a name="phuong-an-3-github-pages"></a>
### Phương Án 3: GitHub Pages
1. Mở tệp `vite.config.ts`, thêm thuộc tính `base` theo tên kho của bạn:
   ```ts
   export default defineConfig({
     base: '/student-dashboard/',
     plugins: [react(), tailwindcss()],
   })
   ```
2. Chạy lệnh: `npm run build`.
3. Đẩy thư mục `dist` lên nhánh `gh-pages` hoặc bật tính năng GitHub Pages trong phần Settings của kho lưu trữ.

---

<a name="3-thiet-lap-co-so-du-lieu-dam-may"></a>
## 3. Thiết Lập Cơ Sở Dữ Liệu Đám Mây (Google Sheets & Supabase)

<a name="dong-bo-2-chieu-google-sheets"></a>
### Đồng Bộ 2 Chiều Với Google Sheets Qua Google Apps Script (0 Đồng)

Giải pháp này cho phép bạn dùng một file Google Sheets quen thuộc làm cơ sở dữ liệu thời gian thực.

#### Bước 3.1: Tạo Trang Tính Mới
1. Mở [Google Sheets](https://sheets.new) và đặt tên (ví dụ: `Học Tập & Dự Án Hub`).
2. Tạo đúng **3 tab trang tính** với các tiêu đề cột tại **Dòng 1** như sau:

**Tab 1: `Courses` (Danh sách môn học & điểm số)**
```
id | code | title | credits | semester | weightInClass | weightMidterm | weightFinal | scoreInClass | scoreMidterm | scoreFinal | targetGrade
```

**Tab 2: `Deliverables` (Nhiệm vụ & bài tập nhóm)**
```
id | projectId | taskName | milestonePhase | ownerName | internalBufferDeadline | officialDueDate | peerReviewer | status | artifactUrl
```

**Tab 3: `CalendarEvents` (Lịch thi & sự kiện học tập)**
```
id | title | courseCode | startDate | endDate | type | location
```

---

#### Bước 3.2: Dán Mã Nguồn Google Apps Script
1. Trên thanh công cụ của Google Sheet, bấm vào **Tiện ích mở rộng (Extensions)** &rarr; **Apps Script**.
2. Xóa toàn bộ nội dung mẫu trong tệp `Code.gs` và dán đoạn mã sau vào:

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

#### Bước 3.3: Xuất Bản Dưới Dạng Ứng Dụng Web (Web App)
1. Ở góc trên bên phải màn hình Apps Script, nhấp **Triển khai (Deploy)** &rarr; **Tùy chọn triển khai mới (New deployment)**.
2. Bấm vào biểu tượng bánh răng (**Chọn loại**) &rarr; chọn **Ứng dụng web (Web app)**.
3. Thiết lập thông số:
   - **Mô tả (Description):** `Academic Hub Live Connector`
   - **Thực thi dưới dạng (Execute as):** `Tôi (Địa chỉ email Google của bạn)`
   - **Người có quyền truy cập (Who has access):** `Bất kỳ ai (Anyone)` *(Rất quan trọng: Giúp trình duyệt gửi dữ liệu không bị chặn quyền)*
4. Nhấp **Triển khai (Deploy)**.
5. Cấp quyền truy cập: Nhấp **Ủy quyền truy cập (Authorize access)** &rarr; chọn tài khoản Google &rarr; nhấp **Nâng cao (Advanced)** &rarr; nhấp **Mở Dự án không có tiêu đề (không an toàn)** &rarr; nhấp **Cho phép (Allow)**.
6. Sao chép **URL ứng dụng web** (đường dẫn có đuôi `/exec`).

---

#### Bước 3.4: Kết Nối Trên Bảng Điều Khiển
1. Truy cập trang web Hub của bạn trên Vercel.
2. Ở thanh điều hướng trên cùng, nhấp vào nút **Cloud Sync**.
3. Chọn **Google Sheets (Apps Script Web App)** tại danh sách thả xuống.
4. Dán đường dẫn `/exec` vừa sao chép vào ô đường dẫn.
5. Nhấp **Test Connection** &rarr; kiểm tra thông báo màu xanh báo kết nối thành công.
6. Nhấp **Save Cloud Settings**.
7. Bấm nút **Push Local &rarr; Remote** để đẩy toàn bộ danh sách môn học và công việc hiện tại vào Google Sheet của bạn!

---

<a name="supabase-postgresql"></a>
### Supabase PostgreSQL (Tùy Chọn)
Nếu bạn muốn sử dụng cơ sở dữ liệu quan hệ SQL chuẩn:
1. Tạo dự án miễn phí tại [supabase.com](https://supabase.com).
2. Vào **SQL Editor** và chạy đoạn mã:
   ```sql
   create table if not exists public.workspaces (
     workspace_id text primary key,
     data jsonb not null,
     updated_at timestamp with time zone default timezone('utc'::text, now()) not null
   );

   alter table public.workspaces enable row level security;
   create policy "Allow read/write" on public.workspaces for all using (true) with check (true);
   ```
3. Lấy URL Endpoint và Khóa công khai `anon` dán vào phần cài đặt Cloud Sync của ứng dụng.

---

<a name="4-tich-hop-dich-vu-truong-hoc"></a>
## 4. Tích Hợp Dịch Vụ Trường Học

<a name="dong-bo-lich-canvas"></a>
### Đồng Bộ Lịch Canvas LMS / Blackboard / Google Calendar
1. Truy cập vào trang học trực tuyến **Canvas LMS** của trường &rarr; chọn mục **Lịch (Calendar)** ở thanh menu trái.
2. Ở góc dưới cùng bên phải, nhấp vào nút **Nguồn cấp dữ liệu lịch (Calendar Feed)**.
3. Sao chép đường dẫn lịch (bắt đầu bằng `webcal://...` hoặc đuôi `.ics`).
4. Mở tab **Calendar & Schedule** trên Hub của bạn.
5. Bấm vào nút **WebCal URL**, dán đường dẫn vào và bấm **Save & Sync Feed**. Toàn bộ hạn nộp bài và lịch thi trên Canvas sẽ được vẽ lên thời khóa biểu của bạn.

<a name="theo-doi-du-an-github"></a>
### Theo Dõi Dự Án GitHub & CI/CD
1. Nhấp vào tab **Integrations** trên thanh menu chính.
2. Tại mục **GitHub Repository Monitor**, nhập tên kho mã nguồn của nhóm (ví dụ: `alanriouss/student-dashboard`).
3. Bạn sẽ theo dõi được trực tiếp các commit mới nhất, Pull Request đang mở và trạng thái kiểm thử tự động (CI/CD) của kho lưu trữ.

---

<a name="5-cam-nang-van-hanh"></a>
## 5. Cẩm Nang Vận Hành & Khai Thác Toàn Diện

<a name="thanh-chi-so-kpi"></a>
### Thanh Chỉ Số Hiệu Suất Thời Gian Thực (KPI Strip)
Thanh chỉ số nằm ngay dưới tiêu đề phản ánh tức thì sức khỏe học tập của bạn:
- **Semester GPA:** Điểm trung bình tích lũy theo thang 4.00, tự động cập nhật mỗi khi nhập điểm môn học mới.
- **Buffer Health:** Tỷ lệ phần trăm các công việc nhóm còn nằm trong vùng an toàn (trước hạn nộp nội bộ 72 giờ).
- **Pending Reviews:** Số lượng bài tập nộp đang chờ đồng đội chấm kiểm duyệt chất lượng.
- **Upcoming Exams:** Số bài thi học kỳ hoặc sự kiện lớn diễn ra trong vòng 7 ngày tới.

---

<a name="quan-tri-hoc-thuat-gpa"></a>
### Quản Trị Học Thuật & Bộ Tối Ưu Điểm GPA
Truy cập tab **Academic Performance**:
- **Giải Điểm Thi Cuối Kỳ Tự Động (Target Final Score Solver):** Trên mỗi thẻ môn học, nhập điểm chuyên cần và điểm thi giữa kỳ. Chọn mục tiêu điểm chữ mong muốn (`A`, `B+`, hoặc `B`). Hệ thống sẽ tự động giải bài toán ngược và cho bạn biết: *"Cần đạt đúng **86.5/100** điểm ở bài thi cuối kỳ để đạt điểm A"*.
- **Bộ Tối Ưu Hóa GPA Toàn Học Kỳ (Macro Target GPA Optimizer):** Nhấp nút **Target GPA Optimizer** ở góc phải thanh tiêu đề. Chọn mức GPA mong muốn cho cả kỳ (ví dụ `3.80`). Thuật toán sẽ tính toán ma trận phân bổ điểm thi cuối kỳ nhẹ nhàng nhất cho từng môn dựa vào số tín chỉ. Bấm **Apply Optimized Target Plan** để lưu kế hoạch vào các môn học.
- **Sổ Tay Ghi Chú & Công Thức Ôn Thi:** Nhấp vào biểu tượng cuốn sách trên mỗi môn để mở ngăn ghi chú Markdown, kèm các mẫu công thức toán, thuật toán chuẩn (Bayes, Gradient Descent, Big-O, SQL).

---

<a name="bang-dem-an-toan-72-gio"></a>
### Bảng Đệm An Toàn 72 Giờ & Trách Nhiệm Nhóm (DRI)
Truy cập tab **Milestone Buffer**:
Hầu hết các nhóm sinh viên làm đồ án đều bị trễ hạn vì đùn đẩy trách nhiệm và dồn việc vào đêm cuối cùng. Hệ thống giải quyết bằng 2 nguyên tắc vàng:
1. **Quy Tắc Đệm An Toàn 72 Giờ:** Mỗi khi tạo nhiệm vụ, bạn nhập Hạn nộp chính thức của giảng viên (Official Due Date). Hệ thống sẽ **tự động tính lùi lại đúng 72 giờ** để tạo ra Hạn chót nội bộ (Internal Buffer Deadline). 3 ngày an toàn này dùng để kiểm thử mã nguồn, sửa bài và chống sập mạng trường vào phút chót.
2. **Chủ Nhiệm Duy Nhất (Single DRI):** Mỗi công việc chỉ giao cho 1 người chịu trách nhiệm chính, không giao mơ hồ cho "cả nhóm".
3. **Cổng Kiểm Duyệt Đồng Đội (Peer Review Gate):** Người làm không thể tự ý chuyển nhiệm vụ sang trạng thái `APPROVED` (Đạt chuẩn) nếu chưa có chữ ký duyệt của người phản biện được chỉ định.

---

<a name="lich-hoc-thong-minh"></a>
### Lịch Học Thông Minh & Cảnh Báo Trùng Lịch Thi
Truy cập tab **Calendar & Schedule**:
- Xem theo dạng **Tháng (Month)**, **Tuần (Week)** hoặc **Danh Sách (Agenda)**.
- **Phát Hiện Xung Đột Lịch Thi:** Thuật toán tự động quét toàn bộ lịch thi. Nếu phát hiện bạn có 2 môn thi cùng 1 ngày hoặc cách nhau dưới 24 giờ, hệ thống sẽ hiện cảnh báo màu hổ phách kèm nút liên kết hỗ trợ nộp đơn xin hoãn thi hoặc chuyển ca thi chính thức theo quy chế đào tạo.

---

<a name="doi-chieu-du-lieu-diff"></a>
### Đối Chiếu & Hợp Nhất Dữ Liệu Hai Chiều (Visual Diff)
Khi nhiều thành viên cùng chỉnh sửa trên file Google Sheets hoặc làm việc từ nhiều thiết bị:
1. Bấm **Cloud Sync** &rarr; nhấp nút **Pull & Review Diff**.
2. Một ngăn đối chiếu dữ liệu trực quan (**Visual Diff Drawer**) sẽ xuất hiện:
   - Thẻ màu xanh lá `NEW`: Các môn học hoặc công việc mới được thêm từ phía Google Sheets.
   - Thẻ màu hổ phách `MODIFIED`: Các trường dữ liệu có sự thay đổi (điểm số, ngày nộp, người phụ trách).
3. Đánh dấu tích vào các mục bạn đồng ý nhận.
4. Bấm **Accept Selected Changes**. Dữ liệu sẽ được hợp nhất an toàn tuyệt đối mà không sợ bị ghi đè mất dữ liệu cá nhân.

---

<a name="cong-chia-se-du-an"></a>
### Cổng Chia Sẻ Dự Án Cho Đồng Đội (Chỉ Xem)
Khi cần gửi tiến độ dự án cho bạn cùng nhóm hoặc trợ giảng xem mà không muốn họ vô tình chỉnh sửa bảng điều khiển của bạn:
1. Mở tab **Milestone Buffer**.
2. Chọn dự án cần chia sẻ và bấm nút **Share Read-Only Link**.
3. Hệ thống sẽ tạo liên kết sâu (ví dụ: `https://ten-web.vercel.app/#/project/p-dsa/view`).
4. Người nhận có thể xem toàn bộ bảng tiến độ, phân công người phụ trách và link tài liệu sản phẩm trên giao diện tinh gọn, bảo mật.

---

<a name="bao-cao-kiem-toan-hoc-thuat"></a>
### Báo Cáo Kiểm Toán Học Thuật & Sao Lưu JSON
- **Audit Report:** Nhấp nút **Audit Report** trên thanh tiêu đề để mở bảng tổng kết thành tích học tập, xếp loại GPA và tiến độ dự án. Bạn có thể bấm **Print PDF** để in hoặc gửi kèm hồ sơ xin học bổng.
- **Sao Lưu Dữ Liệu Dự Phòng:** Nhấp **Export / Import** &rarr; **Export Backup JSON** để tải tệp lưu trữ toàn bộ dữ liệu về máy tính của bạn nhằm phòng ngừa mọi rủi ro mất dữ liệu.

---

<a name="6-xu-ly-su-co-faq"></a>
## 6. Xử Lý Sự Cố Kỹ Thuật & Câu Hỏi Thường Gặp (FAQ)

| Hiện Tượng | Nguyên Nhân | Cách Khắc Phục |
| :--- | :--- | :--- |
| **Báo lỗi "Failed to fetch" khi bấm Test Connection Google Sheets** | Ứng dụng Apps Script chưa được mở quyền truy cập công khai. | Trong cửa sổ Apps Script, bấm **Triển khai (Deploy)** &rarr; **Quản lý bản triển khai** &rarr; Chỉnh sửa &rarr; chuyển **Người có quyền truy cập** thành **Bất kỳ ai (Anyone)**. Triển khai lại và lấy link `/exec` mới. |
| **Đường dẫn Web App kết thúc bằng đuôi `/dev`** | Bạn sao chép nhầm đường dẫn chạy thử nghiệm của lập trình viên. | Bấm **Triển khai** &rarr; **Tùy chọn triển khai mới** &rarr; chọn **Ứng dụng web** và lấy đường dẫn có đuôi `/exec`. |
| **Chia sẻ link sâu bị lỗi 404 khi tải lại trang trên hosting khác** | Máy chủ tĩnh không hỗ trợ cấu hình chuyển hướng Single Page App. | Sử dụng đường dẫn có dấu thăng (mặc định: `/#/project/...`) hoặc đảm bảo tệp `vercel.json` (đối với Vercel) / `_redirects` (đối với Netlify) đã được đẩy lên thư mục gốc. |
| **Lịch Canvas không tự động đồng bộ** | Đường dẫn sao chép chưa đúng định dạng nguồn cấp iCalendar. | Đảm bảo link bắt đầu bằng `https://` hoặc `webcal://` và kết thúc bằng đuôi `.ics`. |

---
*Biên soạn bởi Đội ngũ Phát triển Student Operations & Academic Analytics Hub.*
