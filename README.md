# 🚀 Personal Dotfiles & Automated Ubuntu Environment

![Ubuntu](https://img.shields.io/badge/Ubuntu-22.04%20%7C%2024.04%20%7C%2026.04-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![Zsh](https://img.shields.io/badge/Zsh-Zinit-4EAA25?style=for-the-badge&logo=gnu-bash&logoColor=white)
![Neovim](https://img.shields.io/badge/Neovim-0.10%2B-57A143?style=for-the-badge&logo=neovim&logoColor=white)
![Tmux](https://img.shields.io/badge/Tmux-TPM-1BB91F?style=for-the-badge&logo=tmux&logoColor=white)
![WezTerm](https://img.shields.io/badge/WezTerm-GPU%20Terminal-blue?style=for-the-badge)
![Starship](https://img.shields.io/badge/Prompt-Starship-DD0B78?style=for-the-badge&logo=starship&logoColor=white)
![GNU Stow](https://img.shields.io/badge/Config-GNU%20Stow-005571?style=for-the-badge&logo=gnu&logoColor=white)

Bộ cấu hình (Dotfiles) cá nhân hoàn chỉnh trên môi trường **Ubuntu GNOME**, được quản lý theo mô hình module hoá bằng **[GNU Stow](https://www.gnu.org/software/stow/)**.

Repository này tích hợp sẵn script tự động hoá khôi phục toàn diện (`install.sh`), giúp bất kỳ máy Ubuntu mới cài đặt nào chỉ cần **clone về và chạy 1 dòng lệnh** là tự động tải, cài đặt và khôi phục 100% môi trường làm việc y như bản backup (từ shell, terminal, editor, SDK, database cho tới các ứng dụng desktop và giao diện).

---

## 📑 Mục lục
1. [🎯 Môi trường mục tiêu & Kiến trúc](#-môi-trường-mục-tiêu--kiến-trúc)
2. [📦 Các Module cấu hình](#-các-module-cấu-hình)
3. [⚡ Khôi phục 1-Click (Automated Setup)](#-khôi-phục-1-click-automated-setup)
4. [🛠 Cài đặt từng phần thủ công (Modular Stow)](#-cài-đặt-từng-phần-thủ-công-modular-stow)
5. [⌨️ Bảng Phím tắt & Cheat Sheet](#️-bảng-phím-tắt--cheat-sheet)
   - [Neovim](#1-neovim-leader-key-space)
   - [Tmux](#2-tmux-prefix-key-ctrl-a)
   - [WezTerm](#3-wezterm)
   - [Zsh Aliases & Workflows](#4-zsh-aliases--workflows)
   - [Touchpad Gestures](#5-cử-chỉ-touchpad-libinput)
6. [💡 Các Công cụ & Workflow đặc biệt](#-các-công-cụ--workflow-đặc-biệt)
7. [🔧 Xử lý sự cố (Troubleshooting)](#-xử-lý-sự-cố-troubleshooting)

---

## 🎯 Môi trường mục tiêu & Kiến trúc

- **Hệ điều hành**: Ubuntu GNOME (`x86_64`) phiên bản 22.04 LTS, 24.04 LTS và 26.04+.
- **Terminal Emulator**: WezTerm (GPU-accelerated, Kanagawa Dragon / Catppuccin theme, phím tắt chỉnh độ mờ linh hoạt).
- **Shell**: Zsh với Zinit plugin manager (tốc độ cao, autosuggestions, fast syntax-highlighting, zsh-vi-mode, fzf-tab).
- **Prompt**: Starship Prompt (hiển thị ngữ cảnh Git branch/status, runtime Node/Java/Python/Go/Rust, pin, thời gian).
- **Editor**: Neovim 0.10+ (quản lý plugin bằng `lazy.nvim`, Mason LSP/DAP/Linters/Formatters, hỗ trợ render ảnh `image.nvim`, giao diện Catppuccin).
- **Multiplexer**: Tmux (Prefix `Ctrl-a`, tích hợp TPM, vim-navigation, tự động lưu/khôi phục session qua `tmux-resurrect` & `tmux-continuum`).
- **Font**: JetBrainsMono Nerd Font.
- **Bộ gõ**: Fcitx5 (tiếng Việt với `fcitx5-bamboo`, tiếng Nhật với `fcitx5-mozc`).
- **Phát triển ứng dụng**:
  - **Node.js**: Quản lý bằng `fnm` (Fast Node Manager), cài sẵn Node LTS, `pnpm`, `yarn`, `@nestjs/cli`.
  - **Java / Kotlin**: Quản lý bằng `SDKMAN!`, cài sẵn Java 21, Java 17 (Temurin), Gradle, Kotlin, Maven.
  - **Mobile**: Android SDK Command-line Tools, Emulator, Scrcpy, Flutter SDK.
  - **Database**: PostgreSQL, MySQL Server, Redis, SQLite3, DBeaver CE, MySQL Workbench.
  - **DevOps / Containers**: Docker Engine, Docker Compose, Lazydocker.

---

## 📦 Các Module cấu hình

Mọi cấu hình đều được tổ chức dạng thư mục tương thích với GNU Stow để liên kết đối xứng vào `$HOME`:

| Thư mục | Mô tả chi tiết |
| :--- | :--- |
| 📁 `nvim` | Cấu hình Neovim cực mượt: Lazy.nvim, Treesitter, Mason LSP (`lua_ls`, `ts_ls`, `jdtls`, `clangd`, `pyright`, `gopls`, `marksman`, `gradle_ls`), None-ls formatters (`stylua`, `prettierd`, `black`, `ktlint`, `google-java-format`), render ảnh `image.nvim`, `img-clip`, Telescope, Neo-tree, Bufferline, Lualine. |
| 📁 `zsh` | Bootstrap Zinit, cấu hình `aliases.zsh`, `exports.zsh`, `options.zsh`, nạp FNM, SDKMAN, Starship, Fcitx5 env vars và hàm auto-calc. |
| 📁 `tmux` | Tmux chia pane trực quan, prefix `Ctrl-a`, giao diện Catppuccin Mocha, tích hợp TPM, `tmux-resurrect`, `tmux-continuum`, `tmux-yank`. |
| 📁 `wezterm` | Giao diện WezTerm hiện đại: font JetBrains Mono, Kanagawa Dragon theme, điều chỉnh độ mờ nền bằng phím tắt, tab navigation. |
| 📁 `starship` | Tinh chỉnh giao diện thanh prompt Starship phong cách Powerline đẹp mắt, hiển thị ngữ cảnh lập trình. |
| 📁 `desktop` | Chứa các công cụ desktop độc quyền: <br>• `md_tray_app.py`: Giao diện khay hệ thống (System Tray) quản lý ghi chú Markdown / Daily Tasks bằng Gtk3 & WebKit. <br>• `movie`: Script fzf + MPV ModernX xem video/phim cực nhanh trong terminal. <br>• `autostart`: Tự động khởi động `md_tray_app.py`. |
| 📁 `systemd` | Systemd User service (`syncthing.service`) tự động chạy đồng bộ kho ghi chú cá nhân ngầm. |
| 📁 `libinput` | Tùy chỉnh cử chỉ touchpad 4 ngón đa điểm qua `libinput-gestures`. |
| 📄 `install.sh` | Script bootstrap tự động 100% sao lưu và khôi phục toàn bộ môi trường từ máy trắng. |

---

## ⚡ Khôi phục 1-Click (Automated Setup)

Dành cho máy tính Ubuntu mới cài đặt lại hoặc máy trắng cần đưa toàn bộ môi trường và phần mềm về trạng thái chuẩn như bản backup.

### 1. Chạy khôi phục toàn bộ:
```bash
# 1. Clone repository về thư mục Home
git clone https://github.com/trinhquyetchien/Dotfiles.git ~/Dotfiles
cd ~/Dotfiles

# 2. Cấp quyền thực thi và chạy
chmod +x install.sh
./install.sh
```

### 2. Các tuỳ chọn nâng cao của `install.sh`:
Script hỗ trợ các cờ tuỳ chọn linh hoạt nếu bạn không muốn cài một số thành phần nặng:

```bash
# Chỉ khôi phục CLI, Shell, Neovim, Tmux, Runtimes (Bỏ qua các App GUI & Snaps)
./install.sh --cli-only

# Chỉ sao lưu cấu hình cũ và stow dotfiles (Không tải thêm phần mềm hệ thống)
./install.sh --stow-only

# Cài đặt mọi thứ nhưng bỏ qua Snaps (VS Code, Android Studio, Figma...)
./install.sh --no-snap

# Cài đặt mọi thứ nhưng bỏ qua Databases (PostgreSQL, MySQL, Redis)
./install.sh --no-db
```

> [!NOTE]
> - `install.sh` có tính chất **idempotent** (có thể chạy lại nhiều lần an toàn, cái gì đã cài sẽ được tự động bỏ qua).
> - Script có cơ chế **tự động sao lưu cấu hình cũ** (nếu bạn đã có sẵn `.zshrc`, `.tmux.conf`, `.config/nvim`...) vào thư mục `~/.dotfiles_backup/<timestamp>` trước khi liên kết, đảm bảo không bao giờ mất dữ liệu.
> - Sau khi cài xong, hãy **Đăng xuất (Log out)** hoặc **Khởi động lại (Reboot)** để hệ thống nhận diện Zsh, nhóm Docker và quyền touchpad.

---

## 🛠 Cài đặt từng phần thủ công (Modular Stow)

Nếu bạn chỉ muốn áp dụng file cấu hình (dotfiles) mà tự quản lý việc cài đặt phần mềm:

### 1. Cài đặt các gói cơ sở:
```bash
sudo apt update
sudo apt install -y git stow zsh tmux
```

### 2. Clone repo và Stow từng module:
```bash
cd ~/Dotfiles

# Kích hoạt toàn bộ các module:
stow -R -t ~ zsh tmux starship wezterm nvim libinput desktop systemd

# Hoặc chỉ kích hoạt một vài module mong muốn:
stow -R -t ~ nvim tmux zsh
```

### 3. Gỡ bỏ liên kết (Unstow):
```bash
cd ~/Dotfiles
stow -D -t ~ nvim tmux zsh
```

---

## ⌨️ Bảng Phím tắt & Cheat Sheet

### 1. Neovim (Leader key: `Space`)

#### Thao tác cơ bản & Cửa sổ
| Phím tắt | Hành động |
| :--- | :--- |
| `jk` (Insert/Visual) | Thoát về Normal mode |
| `<Space>w` | Lưu file hiện tại (`:w`) |
| `<Space>q` | Đóng cửa sổ hiện tại (`:q`) |
| `<Space>Q` | Thoát tất cả không lưu (`:qa!`) |
| `<Space>sh` / `<Space>sv` | Chia màn hình ngang / dọc |
| `<Space>sx` | Đóng màn hình chia |
| `<Ctrl-h/j/k/l>` | Chuyển con trỏ qua lại giữa các cửa sổ |
| `<Ctrl-Mũi tên>` | Thay đổi kích thước cửa sổ chia |
| `<Space>tt` | Bật/tắt Floating Terminal (`ToggleTerm`) |

#### Tìm kiếm, Điều hướng & Buffers
| Phím tắt | Hành động |
| :--- | :--- |
| `<Space>e` | Bật/tắt Neo-tree (Cây thư mục) |
| `<Space>sf` | Tìm kiếm file bằng Telescope |
| `<Space>sg` | Tìm kiếm nội dung văn bản trong project (Live Grep) |
| `<Space>sb` | Danh sách buffers đang mở |
| `<Space>1` -> `<Space>9` | Chuyển nhanh đến buffer số 1 -> 9 |
| `H` / `L` | Chuyển đến buffer trước / kế tiếp |
| `<Space>bd` | Đóng buffer thông minh (không làm vỡ layout chia cửa sổ) |

#### LSP, Coding & Debugging
| Phím tắt | Hành động |
| :--- | :--- |
| `gd` | Nhảy đến định nghĩa hàm/biến (`Lspsaga goto_definition`) |
| `gr` | Tìm tất cả vị trí sử dụng (`Lspsaga finder`) |
| `K` | Xem tài liệu/chữ ký hàm (`Lspsaga hover_doc`) |
| `<Space>rn` | Đổi tên biến đồng loạt (`Lspsaga rename`) |
| `<Space>ca` | Danh sách Code Actions (`Lspsaga code_action`) |
| `<Space>f` | Format mã nguồn (Prettier, Stylua, Black, Ktlint, JavaFormat...) |
| `<Space>xx` | Bật bảng quản lý lỗi toàn dự án (`Trouble`) |
| `<Space>m` | Mở trình quản lý LSP/Formatter `Mason` |
| `<Space>l` | Mở trình quản lý plugin `lazy.nvim` |
| `<Ctrl-v>` (Insert mode) | Dán ảnh chụp màn hình trực tiếp vào Markdown (`img-clip`) |

---

### 2. Tmux (Prefix key: `Ctrl-a`)

| Phím tắt | Hành động |
| :--- | :--- |
| `Ctrl-a` rồi `/` | Chia pane theo chiều dọc (mở tại thư mục hiện tại) |
| `Ctrl-a` rồi `-` | Chia pane theo chiều ngang (mở tại thư mục hiện tại) |
| `Ctrl-a` rồi `c` | Tạo window mới tại thư mục hiện tại |
| `Ctrl-a` rồi `h/j/k/l` | Di chuyển giữa các pane (Vim-style) |
| `Ctrl-a` rồi `H/J/K/L` | Mở rộng kích thước pane |
| `Ctrl-a` rồi `r` | Tải lại cấu hình Tmux (`Reload config`) |
| `Ctrl-a` rồi `Ctrl-s` | Lưu toàn bộ session Tmux hiện tại (`tmux-resurrect`) |
| `Ctrl-a` rồi `Ctrl-r` | Khôi phục session đã lưu gần nhất (`tmux-resurrect`) |
| `Ctrl-a` rồi `b` | Ẩn/Hiện thanh trạng thái Status Bar |
| `Ctrl-a` rồi `x` | Đóng pane hiện tại |

---

### 3. WezTerm

| Phím tắt | Hành động |
| :--- | :--- |
| `Ctrl+Shift+Up` | Tăng độ đậm nền (+5% Opacity) |
| `Ctrl+Shift+Down` | Giảm độ đậm nền (-5% Opacity, làm trong suốt hơn) |
| `Ctrl+Shift+Space` | Đặt lại độ trong suốt mặc định (80%) |
| `Ctrl+Shift+Enter` | Bật/Tắt chế độ toàn màn hình (Fullscreen) |
| `Ctrl+Shift+T` | Mở Tab mới |
| `Ctrl+Shift+W` | Đóng Tab hiện tại |
| `Ctrl+Shift+R` | Đổi tên Tab hiện tại |
| `Alt+h` / `Alt+l` | Chuyển qua lại giữa các Tab |
| `Ctrl+Shift+B` | Ẩn/Hiện thanh Tab Bar |

---

### 4. Zsh Aliases & Workflows

#### Phím tắt lệnh CLI
- `v` -> `nvim`
- `t` -> `tmux`
- `lzg` -> `lazygit`
- `lzd` -> `lazydocker`
- `lzs` -> `lazysql`
- `cl` -> `clear`
- `sz` -> `source ~/.zshrc` (Nạp lại cấu hình Zsh)
- `..` -> `cd ..`
- `.` -> `cd`

#### Quản lý ghi chú & Lịch
- `note` -> Mở thư mục `~/Note` bằng Neovim.
- `today` -> Mở hoặc tạo ghi chú ngày hôm nay trong `~/Note/Daily/YYYY-MM-DD.md`.
- `calendar` -> Gửi signal bật nhanh popup lịch Markdown từ ứng dụng khay hệ thống.
- `task` -> Kích hoạt menu công việc.

#### Điều khiển hệ thống
- `sleep` -> Đưa máy vào chế độ ngủ (`systemctl suspend`).
- `hibernate` -> Ngủ đông (`sudo systemctl hibernate`).
- `off` -> Tắt máy (`sudo poweroff`).
- `out` -> Đăng xuất (`gnome-session-quit --logout`).
- `lock` -> Khóa màn hình (`loginctl lock-session`).

#### Mở nhanh các trang web & công cụ
- `work` -> Mở đồng thời Gmail, Alobo, Google Drive.
- `pm` -> Mở ClickUp & Jira.
- `chat` -> Mở Messenger & Zalo Web.
- `soical` -> Mở Facebook, Instagram, YouTube.
- `supabase`, `vercel`, `aws`, `firebase`, `mongodb`, `postman`, `neon`, `cloudflare`, `github`.

---

### 5. Cử chỉ Touchpad (Libinput)

Trên Ubuntu GNOME, touchpad được tinh chỉnh bổ sung qua `libinput-gestures`:
- **Vuốt 4 ngón Sang Trái / Phải**: Chuyển cửa sổ (`Alt + Tab`).
- **Vuốt 4 ngón Lên**: Mở Google Chrome.
- **Vuốt 4 ngón Xuống**: Mở WezTerm (`Ctrl + Alt + T`).
- **Thu/Phóng 2 ngón (Pinch in/out)**: Zoom In/Out (`Ctrl + -` / `Ctrl + =`).

---

## 💡 Các Công cụ & Workflow đặc biệt

### 1. Markdown Daily Notes Tray (`md_tray_app.py`)
Nằm trong `desktop/.local/bin/md_tray_app.py`, đây là ứng dụng khay hệ thống viết bằng Python, Gtk3 và WebKit:
- Tự động gắn icon trên Topbar GNOME.
- Bấm vào icon để xem trước ghi chú ngày hôm nay (`~/Note/Daily/YYYY-MM-DD.md`) dưới định dạng HTML đẹp mắt.
- Cho phép **tích/bỏ tích checkbox công việc trực tiếp trên giao diện popup** mà không cần mở file text.
- Lắng nghe tín hiệu: Khi gõ lệnh `calendar` trong terminal (`SIGHUP`), cửa sổ lịch sẽ lập tức xuất hiện; khi gõ lệnh `task` (`SIGUSR2`), cửa sổ ghi chú hôm nay sẽ lập tức hiện ra.

### 2. Xem phim/video siêu nhanh (`movie`)
Nằm trong `desktop/.local/bin/movie`:
- Chỉ cần gõ lệnh `movie` ở bất kỳ thư mục nào, fzf sẽ lọc toàn bộ các file video (`.mp4`, `.mkv`, `.avi`, `.mov`...).
- Chọn file và Enter, video sẽ tự động phát qua MPV với giao diện hiện đại **ModernX OSC**.

### 3. Tự động đồng bộ Syncthing (`syncthing.service`)
Nằm trong `systemd/.config/systemd/user/syncthing.service`:
- Chạy ngầm dưới quyền user thông qua `systemctl --user`.
- Đảm bảo toàn bộ ghi chú `~/Note` và tài liệu luôn được đồng bộ real-time giữa máy tính và điện thoại.

---

## 🔧 Xử lý sự cố (Troubleshooting)

### 1. Không gõ được tiếng Việt trong WezTerm hoặc Neovim?
Kiểm tra xem Fcitx5 đã chạy chưa bằng lệnh:
```bash
fcitx5 &
```
Đảm bảo các biến môi trường sau có trong shell (đã được cấu hình tự động trong `zsh/.zsh/exports.zsh`):
```bash
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
```

### 2. Plugin `image.nvim` trong Neovim báo lỗi thiếu `magick`?
Chạy lệnh sau để cài đặt rock `magick` cho phiên bản Lua 5.1:
```bash
sudo apt install -y luarocks imagemagick libmagickwand-dev
luarocks --local --lua-version=5.1 install magick
```

### 3. Touchpad Gestures không nhận cử chỉ?
User hiện tại cần thuộc nhóm `input`. Hãy chạy:
```bash
sudo gpasswd -a $USER input
```
Sau đó đăng xuất và đăng nhập lại.

### 4. Xung đột symlink khi chạy GNU Stow thủ công?
Nếu bạn stow thủ công và gặp lỗi `conflict with existing target`:
```bash
# Sử dụng cờ -R (Restow) để ghi đè symlink cũ:
stow -R -t ~ <tên_module>
```
Hoặc dùng script khôi phục:
```bash
./install.sh --stow-only
```
Script sẽ tự động sao lưu file xung đột vào `~/.dotfiles_backup/` và liên kết an toàn.

---

## 👤 Tác giả
- **Trịnh Quyết Chiến**
- GitHub: [@trinhquyetchien](https://github.com/trinhquyetchien)
- Email: trinhquyetchien2005@gmail.com
