# Dotfiles

Cấu hình môi trường phát triển cá nhân trên Ubuntu GNOME, được quản lý bằng
[GNU Stow](https://www.gnu.org/software/stow/).

Repo tập trung vào Zsh, Neovim, Tmux, WezTerm và Starship. Các script đi kèm
còn có thể cài thêm công cụ lập trình, SDK, database, ứng dụng desktop và một
số tùy chỉnh hệ thống.

> Đây là cấu hình cá nhân, không phải bộ cài đặt Linux dùng chung. Hãy đọc các
> script và sao lưu cấu hình hiện tại trước khi sử dụng.

## Môi trường mục tiêu

Cấu hình và script hiện được viết cho:

- Ubuntu GNOME trên máy `x86_64`
- APT, Snap và systemd
- Zsh làm shell mặc định
- WezTerm làm terminal mặc định
- JetBrainsMono Nerd Font

Các bản phân phối Linux, desktop environment hoặc kiến trúc CPU khác có thể
dùng riêng các gói Stow, nhưng không nên chạy toàn bộ installer nếu chưa chỉnh
lại script.

## Thành phần

| Thư mục | Nội dung |
| --- | --- |
| `nvim` | Neovim, lazy.nvim, LSP, completion, Treesitter, Telescope và DAP |
| `zsh` | Zsh, Zinit, alias, biến môi trường và tích hợp Starship |
| `tmux` | Tmux, TPM, tmux-resurrect, tmux-continuum và tmux-yank |
| `wezterm` | Giao diện, font, phím tắt và sự kiện WezTerm |
| `starship` | Starship prompt |
| `libinput` | Cử chỉ touchpad cho libinput-gestures |
| `scripts` | Script cài phần mềm, SDK, database và tùy chỉnh Ubuntu |
| `install.sh` | Script điều phối việc cài toàn bộ môi trường |

Neovim được cấu hình cho nhiều workflow, gồm Java, Kotlin, Android, Flutter,
JavaScript/TypeScript và Python. Một số tính năng chỉ hoạt động khi SDK hoặc
công cụ tương ứng đã được cài.

## Cài riêng dotfiles

Đây là cách nên dùng nếu chỉ muốn áp dụng các file cấu hình mà không thay đổi
toàn bộ hệ thống.

### 1. Cài công cụ cần thiết

```bash
sudo apt update
sudo apt install -y git stow zsh tmux
```

Cài thêm Neovim, WezTerm và Starship nếu muốn sử dụng cấu hình tương ứng.

### 2. Clone repo

```bash
git clone https://github.com/trinhquyetchien/Dotfiles.git ~/Dotfiles
cd ~/Dotfiles
```

### 3. Sao lưu cấu hình đang có

GNU Stow sẽ báo lỗi nếu file đích đã tồn tại và không phải symlink do Stow quản
lý. Hãy di chuyển các file cần giữ trước khi tiếp tục:

```bash
mkdir -p ~/.dotfiles-backup
mv ~/.zshrc ~/.tmux.conf ~/.dotfiles-backup/ 2>/dev/null || true
mv ~/.config/nvim ~/.config/wezterm ~/.dotfiles-backup/ 2>/dev/null || true
mv ~/.config/starship.toml ~/.config/libinput-gestures.conf \
  ~/.dotfiles-backup/ 2>/dev/null || true
```

### 4. Tạo symlink

Chỉ chọn các gói bạn thực sự muốn dùng:

```bash
stow zsh nvim wezterm starship tmux libinput
```

Ví dụ chỉ cài cấu hình Neovim và Tmux:

```bash
stow nvim tmux
```

Khởi động Neovim để lazy.nvim tự cài plugin:

```bash
nvim
```

TPM sẽ quản lý các plugin Tmux được khai báo trong cấu hình. Nếu TPM chưa có:

```bash
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```

Sau đó mở Tmux và nhấn `Ctrl-a`, rồi `I` để cài plugin.

## Gỡ cấu hình

Chạy từ thư mục repo:

```bash
stow -D zsh nvim wezterm starship tmux libinput
```

Lệnh này chỉ gỡ các symlink do Stow tạo, không gỡ ứng dụng hoặc SDK.

## Full installer

`install.sh` là bootstrap script dành cho máy cá nhân mới. Ngoài việc liên kết
dotfiles, script còn thực hiện nhiều thay đổi cấp hệ thống:

- cài Zsh, Neovim, WezTerm, Docker và các CLI tool;
- cài VS Code, Postman, Android Studio và ứng dụng desktop qua Snap;
- cài Java, Kotlin, Gradle, Maven, Node.js, Android SDK và Miniconda;
- cài PostgreSQL, MySQL, Redis và các công cụ quản trị database;
- đổi shell, terminal mặc định và input method;
- cài GNOME extensions, touchpad gestures và GRUB theme;
- xóa một số cấu hình hiện có trong `$HOME`.

Script cần mạng, quyền `sudo`, Snap, systemd và phiên GNOME đang hoạt động.
Không chạy script bằng tài khoản `root`.

Hiện tại full installer **chưa sẵn sàng để chạy một mạch**:

- `install.sh` gọi `scripts/database.sh`, trong khi file trong repo là
  `scripts/databases.sh`;
- một số bước mở ứng dụng tương tác như `scrcpy`;
- script xóa cấu hình cũ thay vì tự tạo bản sao lưu;
- các URL tải binary và phiên bản SDK có thể thay đổi theo thời gian.

Nên chạy từng script sau khi đã đọc và chỉnh cho phù hợp với máy:

```bash
chmod +x scripts/*.sh
./scripts/setup-shell.sh
./scripts/software.sh
./scripts/languages.sh
./scripts/databases.sh
./scripts/dev-tools.sh
./scripts/resources.sh
./scripts/extensions.sh
./scripts/grubtheme.sh
```

## Phím tắt chính

### Neovim

Leader key là `Space`.

| Phím | Chức năng |
| --- | --- |
| `<Space>e` | Bật/tắt Neo-tree |
| `<Space>sf` | Tìm file bằng Telescope |
| `<Space>sg` | Tìm nội dung trong project |
| `<Space>tt` | Mở floating terminal |
| `<Space>f` | Format buffer |
| `<Space>m` | Mở Mason |
| `<Space>l` | Mở lazy.nvim |
| `gd` | Đi tới định nghĩa |
| `K` | Hiện LSP hover |
| `H` / `L` | Chuyển buffer trước/sau |

Toàn bộ keymap nằm tại
[`nvim/.config/nvim/lua/core/keymaps.lua`](nvim/.config/nvim/lua/core/keymaps.lua).

### Tmux

Prefix key là `Ctrl-a`.

| Phím | Chức năng |
| --- | --- |
| `Prefix /` | Chia pane theo chiều ngang |
| `Prefix -` | Chia pane theo chiều dọc |
| `Prefix c` | Tạo window tại thư mục hiện tại |
| `Prefix h/j/k/l` | Di chuyển giữa các pane |
| `Prefix H/J/K/L` | Thay đổi kích thước pane |
| `Prefix r` | Reload cấu hình |
| `Prefix Ctrl-s` | Lưu session |
| `Prefix Ctrl-r` | Khôi phục session |

## Lưu ý bảo trì

- `lazy-lock.json` khóa phiên bản plugin Neovim để các lần cài nhất quán hơn.
- Cấu hình Zsh giả định SDKMAN, FNM, Miniconda và Android SDK nằm tại các đường
  dẫn mặc định trong home directory.
- Cấu hình WezTerm dùng `/bin/zsh` và font JetBrains Mono.
- Không commit API key hoặc thông tin bí mật vào repo; dùng biến môi trường cục
  bộ cho các plugin cần credential.
- Repo hiện chưa kèm giấy phép mã nguồn. Mặc định giữ nguyên quyền tác giả cho
  đến khi một file `LICENSE` được bổ sung.
