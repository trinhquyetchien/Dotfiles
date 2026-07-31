# 🚀 Personal Dotfiles

![Ubuntu](https://img.shields.io/badge/Ubuntu-22.04%2B-E95420?style=for-the-badge&logo=ubuntu&logoColor=white)
![Zsh](https://img.shields.io/badge/Zsh-Shell-4EAA25?style=for-the-badge&logo=gnu-bash&logoColor=white)
![Neovim](https://img.shields.io/badge/Neovim-0.9%2B-57A143?style=for-the-badge&logo=neovim&logoColor=white)
![Tmux](https://img.shields.io/badge/Tmux-Terminal_Multiplexer-1BB91F?style=for-the-badge&logo=tmux&logoColor=white)
![WezTerm](https://img.shields.io/badge/WezTerm-Terminal_Emulator-blue?style=for-the-badge)

Bộ cấu hình (Dotfiles) cá nhân trên môi trường **Ubuntu GNOME**, được quản lý dễ dàng bằng [GNU Stow](https://www.gnu.org/software/stow/). 

Mục tiêu của repository này là cung cấp một môi trường phát triển nhanh, mạnh mẽ và nhất quán, tập trung vào các công cụ CLI hiện đại. Các script đi kèm có thể tự động cài đặt SDK, database, phần mềm và tinh chỉnh hệ thống.

> ⚠️ **Cảnh báo**: Đây là cấu hình cá nhân được thiết kế riêng. Vui lòng đọc kỹ mã nguồn các script và **sao lưu dữ liệu/cấu hình hiện tại** của bạn trước khi chạy tự động!

---

## 🎯 Môi trường mục tiêu

- **OS**: Ubuntu GNOME (`x86_64`)
- **Package Managers**: APT, Snap
- **Init System**: systemd
- **Terminal mặc định**: WezTerm
- **Shell mặc định**: Zsh + Starship prompt
- **Font**: JetBrainsMono Nerd Font

*(Các bản phân phối Linux khác vẫn có thể dùng các module cấu hình thông qua `stow`, nhưng hạn chế dùng script cài đặt toàn hệ thống).*

---

## 📦 Các thành phần chính

| Thư mục/Module | Chức năng chi tiết |
| --- | --- |
| 📁 `nvim` | Cấu hình Neovim cực mượt với `lazy.nvim`, tích hợp LSP, Treesitter, Telescope, DAP và các plugin hỗ trợ code Java, Kotlin, Android, TS/JS, Python, Flutter. |
| 📁 `zsh` | Thiết lập Zsh với Zinit, aliases hữu ích, biến môi trường và giao diện Starship. |
| 📁 `tmux` | Tmux với TPM, tmux-resurrect, tmux-continuum, tmux-yank, chia pane tiện lợi. |
| 📁 `wezterm` | Giao diện WezTerm, font chữ, phím tắt và xử lý sự kiện mượt mà. |
| 📁 `starship` | Tùy chỉnh Starship prompt đẹp và cung cấp đủ thông tin ngữ cảnh. |
| 📁 `libinput` | Cử chỉ touchpad đa điểm sử dụng `libinput-gestures`. |
| 📁 `scripts/` | Chứa các script cài đặt độc lập: phần mềm, SDK, Database, tinh chỉnh GNOME... |
| 📄 `install.sh` | Script bootstrap để thiết lập nhanh chóng toàn bộ máy từ đầu. |

---

## 🛠 Hướng dẫn cài đặt

Bạn có hai cách để sử dụng repository này: **Cài đặt toàn bộ (Full Install)** hoặc **Cài đặt từng phần (Modular Install)**.

### Cách 1: Cài đặt từng phần (Khuyên dùng)
Áp dụng nếu bạn chỉ muốn lấy cấu hình (Neovim, Zsh, Tmux...) mà không muốn script can thiệp vào các phần mềm khác của hệ thống.

**1. Cài đặt các gói phụ thuộc cơ bản:**
```bash
sudo apt update
sudo apt install -y git stow zsh tmux
```
*(Hãy tự cài đặt Neovim, WezTerm, Starship nếu muốn dùng config tương ứng).*

**2. Clone repository:**
```bash
git clone https://github.com/trinhquyetchien/Dotfiles.git ~/Dotfiles
cd ~/Dotfiles
```

**3. Sao lưu cấu hình hiện tại:**
Stow sẽ báo lỗi nếu symlink bị trùng với file đã có. Hãy di chuyển hoặc xóa chúng:
```bash
mkdir -p ~/.dotfiles-backup
mv ~/.zshrc ~/.tmux.conf ~/.dotfiles-backup/ 2>/dev/null || true
mv ~/.config/nvim ~/.config/wezterm ~/.dotfiles-backup/ 2>/dev/null || true
mv ~/.config/starship.toml ~/.config/libinput-gestures.conf ~/.dotfiles-backup/ 2>/dev/null || true
```

**4. Kích hoạt module bằng GNU Stow:**
Bạn chỉ cần `stow` các thành phần muốn dùng:
```bash
# Cài đặt tất cả:
stow zsh nvim wezterm starship tmux libinput

# Hoặc chỉ chọn vài công cụ:
stow nvim tmux
```

**5. Hoàn tất thiết lập:**
- **Neovim**: Mở `nvim`, `lazy.nvim` sẽ tự động tải các plugins.
- **Tmux**: Cài TPM nếu chưa có: `git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm`. Sau đó vào Tmux, nhấn `Prefix` + `I` để cài plugins.

### Cách 2: Cài đặt tự động toàn bộ (Full Installer)
Dành cho máy tính Ubuntu mới cài đặt lại hoặc máy trắng. 

Script `install.sh` sẽ thực hiện:
- Cài Zsh, Neovim, WezTerm, Docker...
- Cài đặt VS Code, Postman, Android Studio.
- Setup Java, Kotlin, Node.js, Miniconda, Android SDK.
- Cài DB (PostgreSQL, MySQL, Redis).
- Setup touchpad gestures, đổi shell mặc định và cài GRUB theme.
- **Lưu ý**: Script sẽ `rm -rf` các config cũ (Zsh, Neovim, Tmux...) thay vì sao lưu. Hãy cẩn thận!

```bash
cd ~/Dotfiles
# Khuyên bạn nên mở và đọc các file script trước
./install.sh
```
*(Nếu gặp trục trặc, bạn có thể chạy lẻ từng script trong thư mục `scripts/`)*

---

## 🗑️ Gỡ bỏ cấu hình

Nếu bạn cài đặt theo **Cách 1** (dùng GNU Stow), bạn có thể gỡ các symlink cực kỳ dễ dàng:
```bash
cd ~/Dotfiles
stow -D zsh nvim wezterm starship tmux libinput
```
*(Lệnh này không gỡ phần mềm, chỉ thu hồi lại các file cấu hình).*

---

## ⌨️ Phím tắt (Keybindings)

### Neovim
*Leader key mặc định là `Space`.*

| Phím | Chức năng |
| --- | --- |
| `<Space>e` | Bật/tắt Neo-tree (File Explorer) |
| `<Space>sf` | Tìm file bằng Telescope |
| `<Space>sg` | Tìm text trong project bằng Telescope |
| `<Space>tt` | Mở floating terminal |
| `<Space>f` | Format buffer hiện tại |
| `<Space>m` | Quản lý LSP/DAP/Linter với Mason |
| `<Space>l` | Mở trình quản lý plugin `lazy.nvim` |
| `gd` | Nhảy đến định nghĩa (Go to definition) |
| `K` | Hiển thị thông tin LSP (Hover documentation) |
| `H` / `L` | Chuyển đổi qua lại giữa các buffer (tabs) |

> 💡 *Toàn bộ phím tắt tùy chỉnh có thể xem tại: [`nvim/.config/nvim/lua/core/keymaps.lua`](nvim/.config/nvim/lua/core/keymaps.lua).*

### Tmux
*Prefix key là `Ctrl-a` (thay cho `Ctrl-b` mặc định).*

| Phím | Chức năng |
| --- | --- |
| `Prefix` + `/` | Chia pane theo chiều ngang |
| `Prefix` + `-` | Chia pane theo chiều dọc |
| `Prefix` + `c` | Tạo window mới tại thư mục hiện tại |
| `Prefix` + `h/j/k/l` | Chuyển hướng giữa các pane |
| `Prefix` + `H/J/K/L` | Thay đổi kích thước pane |
| `Prefix` + `r` | Tải lại (Reload) cấu hình Tmux nhanh |
| `Prefix` + `Ctrl-s` | Lưu session hiện tại (tmux-resurrect) |
| `Prefix` + `Ctrl-r` | Khôi phục session đã lưu |

---

## 📝 Lưu ý & Bảo trì

1. **Phiên bản Neovim Plugin**: File `lazy-lock.json` được commit lên để khóa phiên bản plugin, đảm bảo hệ thống không bị lỗi ngớ ngẩn khi cài ở máy khác.
2. **Đường dẫn mặc định**: Cấu hình Zsh giả định các công cụ quản lý như `SDKMAN`, `FNM`, `Miniconda`, `Android SDK` được đặt ở thư mục home (`~`).
3. **WezTerm**: Sử dụng `/bin/zsh` làm shell khởi động và sử dụng font `JetBrains Mono`. Đảm bảo font chữ đã được cài.
4. **Bảo mật**: Tuyệt đối không commit API keys hay thông tin nhạy cảm. Hãy dùng `.env` hoặc các biến môi trường được export cục bộ.
5. **License**: Repo hiện chưa đính kèm giấy phép sử dụng mã nguồn. Mặc định quyền tác giả thuộc về chủ repo cho đến khi file `LICENSE` được thêm vào.
