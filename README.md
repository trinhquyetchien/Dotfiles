# 🚀 Modern Unix Dotfiles

<p align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=700&size=50&pause=1000&color=F5E0DC&center=true&vCenter=true&width=500&lines=Chien+Dotfile;Modern+Unix+Env;Fast+Modular+Clean" alt="Chien Dotfile" />
</p>

<p align="center">
  <b>A professional, modular, and blazing-fast development environment tailored for Full-stack & AI Developers.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/OS-Ubuntu%20%2F%20Debian-orange?style=for-the-badge&logo=ubuntu&logoColor=white" />
  <img src="https://img.shields.io/badge/Shell-Zsh-blue?style=for-the-badge&logo=zsh&logoColor=white" />
  <img src="https://img.shields.io/badge/Editor-Neovim-green?style=for-the-badge&logo=neovim&logoColor=white" />
  <img src="https://img.shields.io/badge/Multiplexer-Tmux-blueviolet?style=for-the-badge&logo=tmux&logoColor=white" />
  <img src="https://img.shields.io/badge/Managed%20by-GNU%20Stow-lightgrey?style=for-the-badge&logo=gnu-bash&logoColor=white" />
</p>

---

## 🌟 Giới thiệu

Đây là bộ sưu tập các file cấu hình (dotfiles) được tối ưu hóa cho hiệu suất và thẩm mỹ. Hệ thống được quản lý thông qua **GNU Stow**, giúp việc triển khai môi trường làm việc trên các máy tính Linux mới (Ubuntu/Debian) chỉ mất vài phút.

### ✨ Điểm nổi bật
- 📦 **Quản lý linh hoạt:** Tách biệt cấu hình từng ứng dụng, dễ dàng thêm/bớt thông qua Symlink.
- 🚀 **Neovim (Lazy.nvim):** Trải nghiệm như một IDE hiện đại với LSP, Treesitter, Auto-completion và hỗ trợ đa ngôn ngữ.
- 🐚 **Zsh + Zinit:** Shell siêu tốc với khả năng nạp plugin "Turbo mode", tự động gợi ý lệnh và highlight cú pháp.
- 🖼️ **WezTerm + Tmux:** Sự kết hợp hoàn hảo giữa Terminal tăng tốc phần cứng và trình quản lý phiên làm việc mạnh mẽ.
- 🛠️ **Hệ sinh thái Dev:** Tích hợp sẵn SDKMAN (Java), FNM (Node.js), Miniconda (Python) và Android CLI Tools.

---

## 📸 Hình ảnh minh họa

| 💻 Neovim IDE Experience | 🐚 Modern Terminal UI |
| :---: | :---: |
| <img src="https://raw.githubusercontent.com/catppuccin/nvim/main/assets/mocha.png" width="400" alt="Neovim Preview" /> | <img src="https://raw.githubusercontent.com/catppuccin/catppuccin/main/assets/previews/terminal.png" width="400" alt="Terminal Preview" /> |
| *Cấu hình Neovim cực mượt với phong cách Mocha* | *Terminal hiện đại với Starship & Tmux* |

---

## 🚀 Cài đặt nhanh

### 📋 Điều kiện cần
- Hệ điều hành: **Ubuntu 22.04+** hoặc **Debian 12**.
- Đã cài đặt `git`.

### 🛠️ Các bước thực hiện
Chạy lệnh duy nhất sau để biến Terminal của bạn trở nên "pro":

```bash
git clone https://github.com/trinhquyetchien/Dotfiles.git ~/Dotfiles
cd ~/Dotfiles
chmod +x install.sh
./install.sh
```

> **Lưu ý:** Script sẽ tự động dọn dẹp các cấu hình cũ (như `.zshrc`, `.tmux.conf`) trước khi tạo liên kết mới. Hãy sao lưu nếu bạn có dữ liệu quan trọng.

---

## 📂 Cấu trúc dự án

```text
.
├── nvim/          # Cấu hình Neovim (Lua based, Lazy.nvim)
├── zsh/           # Cấu hình Zsh (.zshrc, aliases, exports)
├── tmux/          # Trình quản lý phiên làm việc Tmux
├── wezterm/       # Terminal emulator (GPU accelerated)
├── starship/      # Prompt đa nền tảng siêu đẹp
├── libinput/      # Cấu hình Gesture cho touchpad
├── scripts/       # Các script tự động hóa cài đặt (Software, SDKs, DBs)
└── install.sh     # Script tổng điều phối toàn bộ quá trình
```

---

## 🛠️ Công nghệ sử dụng

| Thành phần | Công cụ | Vai trò |
| :--- | :--- | :--- |
| **Editor** | [Neovim](https://neovim.io/) | Trình soạn thảo văn bản chính |
| **Shell** | [Zsh](https://www.zsh.org/) | Trình thông dịch lệnh mạnh mẽ |
| **Prompt** | [Starship](https://starship.rs/) | Hiển thị thông tin ngữ cảnh project |
| **Plugin Mgr** | [Zinit](https://github.com/zdharma-continuum/zinit) | Quản lý plugin Zsh cực nhanh |
| **Terminal** | [WezTerm](https://wezfurlong.org/wezterm/) | Terminal hiện đại hỗ trợ Lua |
| **CLI Tools** | `eza`, `bat`, `fzf`, `rg` | Các công cụ Unix hiện đại thay thế lệnh cũ |

---

## ⌨️ Phím tắt cơ bản (Cheatsheet)

### Neovim (Leader key là `Space`)
- `<Space> + e` : Mở cây thư mục (Neo-tree).
- `<Space> + ff`: Tìm kiếm file (Telescope).
- `<Space> + lg`: Mở Lazygit bên trong Nvim.
- `K`            : Xem thông tin định nghĩa hàm/biến (LSP Hover).

### Tmux (Prefix key là `Ctrl + a`)
- `Prefix + |` : Chia màn hình dọc.
- `Prefix + -` : Chia màn hình ngang.
- `Prefix + c` : Tạo cửa sổ (window) mới.
- `Prefix + z` : Phóng to/thu nhỏ pane hiện tại.

---

## 🤝 Đóng góp

Mọi đóng góp (Pull Request), báo lỗi (Issue) hoặc gợi ý tính năng mới đều được trân trọng!

1. Fork dự án này.
2. Tạo nhánh mới (`git checkout -b feature/AmazingFeature`).
3. Commit thay đổi (`git commit -m 'Add some AmazingFeature'`).
4. Push lên nhánh (`git push origin feature/AmazingFeature`).
5. Mở một Pull Request.

---

## 📄 Giấy phép

Phân phối dưới giấy phép **MIT**. Xem file `LICENSE` để biết thêm chi tiết.

---

<p align="center">
  Được xây dựng với ❤️ bởi <b>Trịnh Quyết Chiến</b>
</p>

<p align="center">
  <a href="https://github.com/trinhquyetchien">
    <img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" />
  </a>
</p>
