# Hướng Dẫn Sử Dụng Chi Tiết
# Student Operations & Academic Analytics Hub

Chào mừng bạn đến với **Student Operations & Academic Analytics Hub** – Hệ thống quản trị học tập, tối ưu hóa điểm số GPA và điều hành dự án nhóm toàn diện dành cho sinh viên.

---

## Mục Lục
1. [Tổng Quan & Giao Diện](#1-tổng-quan--giao-diện)
2. [Module 1: Hiệu Suất Học Thuật & Tối Ưu Điểm GPA](#2-module-1-hiệu-suất-học-thuật--tối-ưu-điểm-gpa)
3. [Module 2: Quản Lý Dự Án Nhóm & Bảng Đệm An Toàn 72 Giờ](#3-module-2-quản-lý-dự-án-nhóm--bảng-đệm-an-toàn-72-giờ)
4. [Module 3: Thời Khóa Biểu & Phát Hiện Xung Đột Lịch Thi](#4-module-3-thời-khóa-biểu--phát-hiện-xung-đột-lịch-thi)
5. [Module 4: Đồng Bộ Hai Chiều Với Google Sheets & Đối Chiếu Dữ Liệu (Visual Diff)](#5-module-4-đồng-bộ-hai-chiều-với-google-sheets--đối-chiếu-dữ-liệu-visual-diff)
6. [Module 5: Báo Cáo Kiểm Toán Học Thuật & Sao Lưu Dữ Liệu](#6-module-5-báo-cáo-kiểm-toán-học-thuật--sao-lưu-dữ-liệu)
7. [Khắc Phục Sự Cố Thường Gặp (FAQ)](#7-khắc-phục-sự-cố-thường-gặp-faq)

---

## 1. Tổng Quan & Giao Diện

Hệ thống được thiết kế theo giao diện tối màu chuyên nghiệp **Deep Pine Slate** (`#131716` nền chính, `#1B2220` bề mặt thẻ, `#5B8266` xanh lá điểm nhấn).

### Thanh Điều Hướng Trên Cùng (Header)
* **Logo & Tên người dùng:** Hiển thị thông tin sinh viên hiện tại.
* **Các Tab Chức Năng:**
  * **Academic Performance:** Bảng điểm, máy tính giải điểm thi, sổ tay công thức.
  * **Milestone Buffer:** Bảng điều hành dự án nhóm, thời hạn đệm 72 giờ, cổng duyệt bài.
  * **Calendar & Schedule:** Thời khóa biểu tuần/tháng, phát hiện trùng lịch thi.
  * **Integrations:** Giám sát kho mã nguồn GitHub và liên kết nhanh.
* **Các Nút Thao Tác Nhanh (Góc Phải):**
  * **Audit Report:** Mở báo cáo kiểm toán học tập tổng hợp (in PDF / chép Markdown).
  * **Cloud Sync:** Kết nối đồng bộ Google Sheets hoặc cơ sở dữ liệu Supabase.
  * **Export / Import:** Sao lưu toàn bộ dữ liệu ra tệp JSON hoặc khôi phục từ tệp có sẵn.

### Thanh Chỉ Số KPI Thời Gian Thực (KPI Strip)
Ngay dưới thanh điều hướng là 4 chỉ số cốt lõi cập nhật tức thì theo từng thay đổi điểm số và công việc:
1. **Semester GPA:** Điểm trung bình học kỳ theo thang 4.00 chuẩn quốc tế.
2. **Buffer Health:** Tỷ lệ phần trăm các hạn nộp bài còn nằm trong vùng an toàn (trên 72 giờ).
3. **Pending Reviews:** Số lượng bài nộp đang chờ đồng đội ký duyệt chất lượng.
4. **Upcoming Exams:** Số kỳ thi hoặc hạn chót lớn diễn ra trong vòng 7 ngày tới.

---

## 2. Module 1: Hiệu Suất Học Thuật & Tối Ưu Điểm GPA

Truy cập: Nhấp vào tab **Academic Performance**.

### 2.1. Phân Nhóm Học Kỳ & Bộ Lọc
* Các môn học được tự động gom nhóm theo từng học kỳ (ví dụ: `Fall 2026`, `Spring 2026`).
* Mỗi học kỳ có tiêu đề riêng thể hiện: **GPA học kỳ (thang 4.00)**, **Điểm trung bình hệ 100**, **Tổng số tín chỉ**, và nút thu gọn/mở rộng danh sách môn.
* Bạn có thể lọc nhanh bằng thanh nút: `All Semesters`, `Fall 2026`, hoặc `Spring 2026`.

### 2.2. Máy Tính Giải Điểm Thi Cuối Kỳ Mục Tiêu (Target Final Score Solver)
Trên mỗi thẻ môn học:
* Nhập điểm quá trình: Điểm chuyên cần/bài tập (`In-Class`), Điểm giữa kỳ (`Midterm`).
* Chọn mục tiêu mong muốn: Điểm chữ **A (4.00)**, **B+ (3.50)**, hoặc **B (3.00)**.
* Hệ thống sẽ tự động tính toán ngược và hiển thị thông báo:
  * *"Cần đạt **86.5/100** ở bài thi cuối kỳ để đạt điểm A"*.
  * Nếu điểm quá trình quá cao hoặc quá thấp, hệ thống sẽ đưa ra dự báo khả thi tương ứng.

### 2.3. Bộ Tối Ưu Hóa GPA Toàn Học Kỳ (Macro GPA Target Optimizer)
Nhấp vào nút **"Target GPA Optimizer"** ở góc phải:
1. Chọn mức GPA mục tiêu cho cả học kỳ (ví dụ: `3.80` hoặc `3.50`).
2. Thuật toán sẽ tính toán ma trận phân bổ điểm thi cuối kỳ tối ưu nhất cho từng môn học dựa trên số tín chỉ và độ khó.
3. Nhấp **"Apply Optimized Target Plan"** để tự động gán kế hoạch này vào các môn học của bạn.

### 2.4. Sổ Tay Ghi Chú & Công Thức Môn Học (Study Notes Drawer)
Nhấp vào nút biểu tượng cuốn sách **"Notes & Formulas"** trên từng môn:
* Hỗ trợ soạn thảo Markdown kèm xem trước trực tiếp (Live Preview).
* **Chèn công thức 1-chạm:** Có sẵn các mẫu công thức phổ biến như *Định lý Bayes*, *Gradient Descent*, *Mean Squared Error (MSE)*, *Bảng độ phức tạp thuật toán Big-O*, và *SQL Window Functions*.
* Nhấp **"Download .md"** để tải tài liệu ôn thi về máy tính.

---

## 3. Module 2: Quản Lý Dự Án Nhóm & Bảng Đệm An Toàn 72 Giờ

Truy cập: Nhấp vào tab **Milestone Buffer**.

Module này giải quyết triệt để vấn đề trễ hạn và đùn đẩy trách nhiệm trong bài tập lớn/dự án nhóm (Capstone/Sprint).

### 3.1. Quy Tắc Đệm An Toàn 72 Giờ (72-Hour Internal Safety Buffer)
* **Hạn nộp chính thức (Official Due Date):** Thời hạn cuối cùng do giảng viên hoặc cổng trường quy định.
* **Hạn nộp nội bộ (Internal Buffer Deadline):** Hệ thống tự động đặt lùi lại **trước 72 giờ** so với hạn chính thức.
* Khoảng đệm 3 ngày này dành riêng cho việc: chạy thử nghiệm, phản biện nhóm, sửa lỗi và chống nghẽn mạng phút chót.

### 3.2. Trách Nhiệm Độc Lập (Single DRI) & Cổng Duyệt Bài (Peer Review)
* **Chủ nhiệm công việc (DRI - Directly Responsible Individual):** Mỗi nhiệm vụ chỉ có **duy nhất 1 người chịu trách nhiệm chính**, không giao chung chung cho cả nhóm.
* **Người phản biện (Peer Reviewer):** Người kiểm tra chất lượng sản phẩm.
* **Quy tắc phê duyệt:** Bạn **không thể** chuyển trạng thái nhiệm vụ sang `APPROVED` nếu chưa có chữ ký duyệt của người phản biện.

### 3.3. Các Trạng Thái Tiến Độ
1. `PLANNED` (Xám): Đã lên kế hoạch.
2. `IN_PROGRESS` (Xanh dương): Đang thực hiện.
3. `REVIEW` (Vàng/Cam): Đã nộp bản nháp, đang chờ phản biện kiểm tra.
4. `APPROVED` (Xanh lá): Đã được người phản biện duyệt đạt chuẩn.
5. `SUBMITTED` (Xanh ngọc): Đã nộp thành công lên cổng của trường.

### 3.4. Chia Sẻ Đường Dẫn Chỉ Xem Cho Đồng Đội (Guest Read-Only Portal)
1. Chọn dự án từ menu chọn dự án.
2. Nhấp vào nút **"Share Read-Only Link"**.
3. Đường dẫn có dạng `https://your-dashboard.vercel.app/#/project/p-dsa/view` sẽ được tự động sao chép vào bộ nhớ tạm.
4. Khi đồng đội hoặc giảng viên mở liên kết này:
   * Họ có thể theo dõi tiến độ, đồng hồ đếm ngược hạn đệm 72 giờ và người phụ trách.
   * Mọi nút sửa, xóa, thêm mới đều bị ẩn để bảo đảm an toàn dữ liệu.

---

## 4. Module 3: Thời Khóa Biểu & Phát Hiện Xung Đột Lịch Thi

Truy cập: Nhấp vào tab **Calendar & Schedule**.

### 4.1. Ba Chế Độ Hiển Thị Lịch
* **Month View:** Xem tổng quan toàn bộ lịch học và hạn nộp trong tháng.
* **Week View:** Lịch biểu dạng cột theo giờ (từ 07:00 đến 21:00), trực quan hóa khoảng thời gian học trên lớp.
* **Agenda View:** Danh sách thứ tự sự kiện sắp diễn ra kèm địa điểm phòng học.

### 4.2. Bộ Phát Hiện Xung Đột Lịch & Quá Tải Hạn Nộp (Conflict Detector)
Nếu có sự cố lịch trình, một dải banner cảnh báo màu hổ phách sẽ xuất hiện ở đầu trang:
* **Overlap Conflict:** Phát hiện 2 buổi học hoặc kỳ thi bị trùng giờ nhau.
* **Exam Crunch:** Phát hiện 2 bài thi lớn diễn ra trong cùng một ngày.
* **Buffer Overlap:** Phát hiện hạn đệm nội bộ của hai bài tập lớn rơi vào cùng một ngày, gây nguy cơ quá tải.
* Nhấp vào **"View in Week"** để nhảy trực tiếp đến ngày bị xung đột và xử lý.

### 4.3. Chuyển Lịch Thi Thành Nhiệm Vụ Đệm 72 Giờ
Khi có một kỳ thi hoặc hạn chót trên lịch, nhấp vào nút **"Convert to 72h Safety Buffer Task"** ở góc thẻ sự kiện. Hệ thống sẽ tự động tạo một nhiệm vụ tương ứng bên Bảng đệm an toàn với hạn chót nội bộ lùi lại 3 ngày.

### 4.4. Nhập Lịch Từ Trường Đại Học (Canvas LMS, Blackboard, Google Calendar)
* **Cách 1: Tải tệp `.ics` về máy (Khuyên dùng - 100% không bị chặn CORS):**
  1. Tải tệp lịch `.ics` từ cổng trường hoặc Google Calendar về máy tính.
  2. Trên thanh công cụ lịch, nhấp **"Import .ics"** (hoặc nhấp *"Upload Downloaded .ics File"* trong cửa sổ WebCal).
  3. Hệ thống sẽ tự động trích xuất các môn học, thời gian, phòng học và thêm vào lịch của bạn.
* **Cách 2: Đăng ký qua đường dẫn WebCal URL:**
  1. Nhấp **"WebCal URL"** trên thanh công cụ.
  2. Dán đường dẫn `webcal://...` hoặc `https://.../calendar.ics` từ Canvas/Blackboard.
  3. Nhấp **"Save & Sync"**. Hệ thống sẽ tự động đồng bộ qua cầu nối dữ liệu.

---

## 5. Module 4: Đồng Bộ Hai Chiều Với Google Sheets & Đối Chiếu Dữ Liệu (Visual Diff)

Đây là tính năng cho phép bạn làm việc nhóm mà không lo người này vô tình ghi đè làm mất dữ liệu của người khác.

### 5.1. Thiết Lập Kết Nối Google Sheets
1. Tạo một trang tính Google Sheets với 3 bảng: `Courses`, `Deliverables`, `CalendarEvents` (xem chi tiết mã lệnh trong tệp [`DEPLOYMENT_AND_INTEGRATION_GUIDE.md`](file:///C:/Users/Alan/Documents/Student%20DashBoard/DEPLOYMENT_AND_INTEGRATION_GUIDE.md)).
2. Dán mã nguồn Google Apps Script, triển khai dưới dạng **Web App** với quyền truy cập **"Anyone"**.
3. Sao chép đường dẫn kết thúc bằng `/exec`.
4. Trên Dashboard, nhấp vào nút **"Cloud Sync"** (trên thanh điều hướng).
5. Chọn nhà cung cấp: **Google Sheets (Apps Script Web App)**.
6. Dán đường dẫn vào mục **Google Apps Script Web App URL** &rarr; Nhấp **"Test Connection"** &rarr; Nhấp **"Save Cloud Settings"**.

### 5.2. Kéo Dữ Liệu & Đối Chiếu Trực Quan (Pull & Review Diff)
Khi đồng đội của bạn đã cập nhật điểm số hoặc công việc trên Google Sheet:
1. Mở cửa sổ **Cloud Sync** &rarr; Nhấp nút **"Pull & Review Diff"**.
2. Cửa sổ **Visual Diff & Merge Review** sẽ hiện ra:
   * **Mục mới (`NEW` - Huy hiệu xanh lá):** Các môn học hoặc bài tập đồng đội mới thêm vào.
   * **Mục chỉnh sửa (`MODIFIED` - Huy hiệu vàng hổ phách):** Thể hiện chi tiết trường nào bị thay đổi theo định dạng `giá_trị_cũ -> giá_trị_mới`.
   * **Mục bị xóa (`DELETED` - Huy hiệu đỏ):** Các mục có ở máy bạn nhưng không còn trên Google Sheet.
3. **Chấp nhận có chọn lọc (Cherry-picking):**
   * Bạn có thể tích chọn từng mục riêng lẻ bạn muốn cập nhật.
   * Hoặc dùng nút **"Select All / Deselect All"** để chọn toàn bộ.
   * Nhấp **"Accept Selected Changes"** để cập nhật an toàn vào hệ thống của bạn.

### 5.3. Đẩy Dữ Liệu Lên Google Sheets (Push Local &rarr; Remote)
Khi bạn muốn cập nhật toàn bộ bài tập và điểm số mới nhất của mình lên Google Sheet để đồng đội xem:
* Mở cửa sổ **Cloud Sync** &rarr; Nhấp **"Push Local &rarr; Remote"**.

---

## 6. Module 5: Báo Cáo Kiểm Toán Học Thuật & Sao Lưu Dữ Liệu

### 6.1. Báo Cáo Kiểm Toán Học Thuật (Audit Report)
Nhấp vào nút **"Audit Report"** trên thanh tiêu đề:
* Tổng hợp toàn diện: Điểm GPA tích lũy, điểm thi cuối kỳ tối thiểu cần đạt cho từng môn.
* Thống kê dự án nhóm: Tỷ lệ an toàn vùng đệm 72 giờ, tỷ lệ bài nộp đã được duyệt chất lượng, biểu đồ phân bổ nhiệm vụ theo từng thành viên.
* **Xuất báo cáo:**
  * **Copy Markdown:** Sao chép bản tóm tắt định dạng Markdown để dán ngay vào Discord, Slack, Notion hoặc Email gửi giảng viên.
  * **Export .md:** Tải về máy thành tệp văn bản.
  * **Print / Save as PDF:** Định dạng in chuẩn đẹp mắt, xuất ra tệp PDF làm hồ sơ học tập.

### 6.2. Sao Lưu & Khôi Phục Dự Phòng (Export & Import)
* **Sao lưu:** Nhấp nút **"Export"** &rarr; Tải về tệp `academic_hub_backup_YYYY-MM-DD.json`. Tệp này chứa toàn bộ điểm số, thời khóa biểu, công việc và ghi chú học tập của bạn.
* **Khôi phục:** Nhấp nút **"Import"** &rarr; Chọn tệp JSON đã lưu để phục hồi toàn bộ dữ liệu trên trình duyệt hoặc máy tính mới chỉ trong 1 giây.

---

## 7. Khắc Phục Sự Cố Thường Gặp (FAQ)

### Q1: Khi nhấn "Test Connection" báo lỗi `Connection failed: Failed to fetch`?
* **Nguyên nhân 1 (Phổ biến nhất):** Quyền truy cập Web App trong Google Apps Script đang để là *"Only myself"*.
  * *Cách sửa:* Trong Apps Script, vào **Deploy &rarr; Manage deployments** &rarr; bấm biểu tượng bút chì &rarr; đổi **Who has access** thành **"Anyone"** &rarr; Deploy lại.
* **Nguyên nhân 2:** Dùng nhầm đường dẫn kết thúc bằng `/dev` thay vì `/exec`.
  * *Cách sửa:* Hãy chắc chắn bạn sao chép URL kết thúc bằng `/exec`.

### Q2: Khi đồng bộ WebCal báo thông báo `CORS restriction`?
* **Giải thích:** Cổng trường đại học (Canvas/Blackboard) có chính sách bảo mật chặn các trang web ngoài đọc lịch học trực tiếp qua trình duyệt.
* **Cách khắc phục:** Tải tệp `.ics` từ Canvas về máy tính, sau đó nhấp nút **"Upload Downloaded .ics File"** trong cửa sổ WebCal hoặc nút **"Import .ics"** trên màn hình chính. Thao tác này hoàn tất chỉ mất 10 giây và hoạt động thành công 100%.

### Q3: Dữ liệu của tôi được lưu ở đâu? Có bị mất khi tắt trình duyệt không?
* Dữ liệu được tự động lưu liên tục vào bộ nhớ cục bộ an toàn (`LocalStorage`) của trình duyệt trên máy tính bạn. Tắt trình duyệt hoặc tắt máy dữ liệu vẫn giữ nguyên 100%.
* Để làm việc trên nhiều máy tính khác nhau, bạn hãy dùng tính năng **Cloud Sync (Google Sheets)** hoặc định kỳ nhấp **Export** để lưu tệp dự phòng.

---

*Tài liệu được biên soạn đồng bộ với phiên bản ứng dụng Student Operations & Academic Analytics Hub.*
