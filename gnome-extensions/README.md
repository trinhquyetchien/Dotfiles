# 🧩 GNOME Shell Extensions Module

Thư mục này quản lý toàn bộ các GNOME Shell Extensions cá nhân đã được cài đặt và tinh chỉnh trên Ubuntu GNOME, liên kết tự động tới `~/.local/share/gnome-shell/extensions` thông qua **GNU Stow**.

## 📦 Danh sách Extensions chính

1. **`reminder_alarm_clock@trifonovkv.gmail.com`**:
   - Extension báo thức / nhắc việc trên Top Bar đã được custom nâng cao:
     - Hỗ trợ tạo không giới hạn nhiều lượt nhắc (Multiple Reminders) cùng lúc.
     - Hiển thị danh sách task đang đếm ngược trực tiếp trên menu popup.
     - Cho phép xóa từng nhắc nhở hoặc xóa tất cả (Clear All).
     - Loại bỏ hành vi trừ thời gian âm khi quá hạn.
     - Tự động lưu và khôi phục danh sách báo thức khi tải lại shell.

2. **`touchpad-gestures@alpha.com`**:
   - Cử chỉ touchpad đa điểm trên Wayland/X11.

3. **`blur-my-shell@aunetx`**:
   - Hiệu ứng làm mờ (blur) hiện đại cho Top Bar, Dash và ứng dụng GNOME.

4. **`Vitals@CoreCoding.com`**:
   - Giám sát CPU, RAM, nhiệt độ, quạt, tốc độ mạng trực tiếp trên thanh tác vụ.

5. **`clipboard-indicator@tudmotu.com`**:
   - Quản lý lịch sử clipboard tiện lợi, hỗ trợ lưu và tìm kiếm văn bản sao chép.

6. **`top-bar-organizer@julian.gse.jsts.xyz`**:
   - Tùy chỉnh vị trí và sắp xếp các icon trên thanh Top Bar.

7. **`improved-workspace-indicator@michaelaquilina.github.io`**:
   - Hiển thị workspace trực quan dạng số hoặc icon ứng dụng.

8. **`docker@stickman_0x00.com`** & **`github-tray@debba.github.com`**:
   - Giám sát trạng thái containers Docker và thông báo GitHub trên khay hệ thống.

9. **`hidetopbar@mathieu.bidon.ca`**:
   - Tự động ẩn thanh Top Bar khi cửa sổ phóng to tối đa không gian làm việc.

10. **`vertical-app-grid@lublst.github.io`**:
    - Lưới ứng dụng dạng cuộn dọc trực quan.

## 🔗 Liên kết thủ công bằng GNU Stow

```bash
cd ~/Dotfiles
stow -v -R -t "$HOME" gnome-extensions
```
