# Giải thích về lỗi rò rỉ RAM và cách sửa
## 1. Vấn đề rò rỉ RAM (Memory Leak)
**Vì sao RAM liên tục tăng?**
Trong GNOME Shell, khi bạn dùng CSS `background-image: url("file://...")`, GNOME sẽ tự động cache (lưu lại) bức ảnh đó vào bộ nhớ vĩnh viễn tên là `StTextureCache` để lần sau hiển thị nhanh hơn.
Khi đổi ảnh liên tục (mỗi phút một lần) bằng cách tạo file tạm thời có tên khác nhau (`uuid` ngẫu nhiên hoặc `md5`), GNOME Shell sẽ nạp ảnh đó vào RAM nhưng **không bao giờ giải phóng (xoá) ảnh cũ đi**. Vài tiếng sau, bạn sẽ có hàng trăm bức ảnh độ phân giải cao kẹt trong RAM khiến máy tính bị đầy bộ nhớ.

**Cách sửa:**
Mình đã **loại bỏ hoàn toàn CSS background-image**. Thay vào đó:
1. Tiện ích tự đọc ảnh, tự cắt/scale (crop) bức ảnh bằng thuật toán `GdkPixbuf`.
2. Ghi đè bức ảnh vừa cắt trực tiếp vào một luồng dữ liệu RAM cục bộ (Gio.BytesIcon/St.Icon).
3. Ra lệnh trực tiếp cho GJS (Garbage Collector) là `System.gc()` xoá ngay lập tức vùng nhớ cũ mỗi khi chuyển ảnh mới. 
Kết quả: Hoàn toàn không lưu file tạm vào ổ cứng, và RAM không bao giờ bị tăng dần lên nữa.

---

## 2. Vì sao ban nãy đổi ảnh thì bị mất viền góc bo tròn?
**Nguyên nhân:**
Vì chúng ta ngưng dùng CSS `background-image` (ảnh nền) mang tính nguy hiểm gặm RAM, hình ảnh chuyển sang chế độ hiển thị thô bạo (Widget `St.Icon`). Thẻ hình vuông `St.Icon` đè thẳng ảnh che lấp lên cái viền lớp chứa cong cong ở bên ngoài sinh ra góc nhọn. Ngoài ra GNOME không cho phép cắt gọt ảnh Foreground bằng CSS (`border-radius` chỉ có tác dụng lên Background).

**Cách sửa:**
Ảnh 16:9 hiện tại được vẽ viền cong ngay bên trong **bộ nhớ RAM (bằng kênh Alpha Channel trong suốt)**. Thuật toán Toán học chạy vòng lặp xuyên qua bộ nhớ RAM (Pixel Arrays) để xoá cúp 4 góc ảnh thành màu trong suốt. Giúp ảnh có viền hiển thị cong vòng hoàn hảo mà không cần chạy lại CSS.

---

## 3. Vì sao chọn tỷ lệ 16:9 mà ảnh bị lép thành hình vuông? (Đã khắc phục)
**Nguyên nhân:**
Quá trình chuyển sang dùng Widget `St.Icon` chịu 1 nhược điểm mặc định: nó luôn bắt ép tấm ảnh gốc thu nhỏ/kéo dãn thành **hình vuông 1:1**. Do đó lúc nãy ảnh bị dồn nén lại và có bóng ma đen do lỗi báo kích thước hình học `width=0` của GNOME.

**Cách sửa:**
- Xoá hoàn toàn cái khung đen ma CSS bằng mã màu `transparent` (trong suốt) và xóa bóng `box-shadow` để cải thiện CPU.
- Đánh lừa lệnh vẽ `St.Icon` bằng cách luôn vẽ ra một "tấm bạt" nền trong suốt kích thước hình vuông tàng hình (vd `160x160`). Sau đó dán đè bức ảnh 16:9 thực sự vào đúng điểm nằm giữa tấm bạt vuông đó.
- Cập nhật thông số `target_x` và `target_y` tuyệt đối. Tỷ lệ cài đặt Settings hiện tại được hệ thống tính toán lớn hơn **50% (cấp số nhân x1.5)** so với chỉ số Slider để các widget hiển thị rất bự và sắc nét.

---

## 4. Hiện tượng giật/đơ (Lag) máy khi kéo thanh chỉnh Radius hoặc Size
**Nguyên nhân:**
Khi bạn vuốt trỏ chuột trên thanh kéo slider, cứ nhích một li GNOME sẽ tạo 1 sự kiện `changed::radius`. Tức là hệ thống bắt CPU phải chạy thuật toán nội suy làm mượt (`HYPER`) và gọt góc Alpha cắt ảnh thủ công hàng chục lần một giây gây quá nhiệt CPU/GPU, từ đó làm chuột bị khựng, đơ máy.

**Cách sửa:**
Mình đã bổ sung hàm kìm hãm gọi là `Debounce` vào đoạn mã theo dõi thanh kéo Settings. 
Mỗi cử động kéo thanh trượt sẽ đặt một mốc Timeout giữ thời gian là **200 miligây** (chớp mắt). Quá trình render nặng nề trên CPU sẽ chỉ thực sự chạy **duy nhất 1 lần** nếu tay bạn đã "nhả chuột" hoặc dừng ngâm chuột đủ 200 miligây, giúp GPU và CPU không bao giờ bị nghẽn hay đơ quá tải nữa!
