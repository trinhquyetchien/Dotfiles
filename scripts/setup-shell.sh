#!/bin/bash

# Nạp các hàm bổ trợ và màu sắc
source "$(dirname "$0")/utils.sh"

info "--- [STEP 1] KHỞI TẠO NỀN TẢNG SHELL & CORE CLI ---"

# 1. Cập nhật APT và cài đặt các công cụ bắt buộc (Core Utilities)
# Đây là những thứ install.sh cần để chạy được các bước tiếp theo
info "Đang cập nhật và cài đặt các công cụ hệ thống cơ bản..."
sudo apt update -y
core_apps=(
    "zsh"            # Shell chính
    "stow"           # Công cụ quản lý symlink (Cực kỳ quan trọng)
    "curl"           # Tải script/binary
    "wget"           # Tải file
    "git"            # Quản lý mã nguồn
    "build-essential" # Biên dịch (nếu cần)
    "unzip"          # Giải nén font/tools
    "gettext"        # Cần cho một số CLI tools
)

for app in "${core_apps[@]}"; do
    install_apt "$app"
done

# 2. Cài đặt Zinit (Zsh Plugin Manager)
# Chúng ta cài vào thư mục chuẩn XDG để sạch máy
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
if [ ! -d "$ZINIT_HOME" ]; then
    info "Đang cài đặt Zinit (Turbo mode plugin manager)..."
    mkdir -p "$(dirname $ZINIT_HOME)"
    git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
    success "Cài đặt Zinit hoàn tất."
else
    info "Zinit đã tồn tại tại $ZINIT_HOME."
fi

# 3. Cài đặt Starship Prompt
# Cài bản binary trực tiếp để có hiệu năng cao nhất và luôn là bản mới nhất
if ! has_command "starship"; then
    info "Đang cài đặt Starship Prompt..."
    curl -sS https://starship.rs/install.sh | sh -s -- -y
    success "Starship đã sẵn sàng."
else
    info "Starship đã được cài đặt."
fi

# 4. Cài đặt các công cụ CLI hiện đại (Modern Unix Tools)
# Những công cụ này không cài qua Zinit vì chúng là binary hệ thống
info "Đang cài đặt các công cụ CLI bổ trợ..."

# fzf: Fuzzy finder (dùng cho CTRL+R, tìm file)
install_apt "fzf"
# ripgrep: Thay thế grep, cực nhanh (cần cho Neovim Telescope)
install_apt "ripgrep"
# btop: Quản lý tiến trình đẹp mắt
install_apt "btop"
# bat: Xem file có highlight (thay cho cat)
install_apt "bat"

# eza: Thay thế 'ls' (hiện đại, có icon) - Cần add repo vì apt mặc định ko có
if ! has_command "eza"; then
    info "Đang cấu hình repo cho eza..."
    sudo mkdir -p /etc/apt/keyrings
    wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --dearmor -o /etc/apt/keyrings/gierens.gpg
    echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | sudo tee /etc/apt/sources.list.d/gierens.list
    sudo apt update && sudo apt install -y eza
fi

# 5. Thiết lập Shell mặc định
if [[ "$SHELL" != */zsh ]]; then
    info "Đang đặt Zsh làm Shell mặc định cho $USER..."
    # Đổi shell cho user hiện tại mà không cần can thiệp tay
    sudo chsh -s "$(which zsh)" "$USER"
    warn "Shell đã đổi. Thay đổi sẽ có hiệu lực sau khi bạn đăng xuất và đăng nhập lại."
else
    info "Zsh hiện đã là Shell mặc định."
fi

# 6. Tạo cấu trúc thư mục đệm cho Zsh (Tránh lỗi Stow)
# Một số config của bạn trong zsh/ có thể trỏ vào các thư mục này
mkdir -p "$HOME/.zsh"
mkdir -p "$HOME/.config"

success "=== HOÀN THÀNH SETUP SHELL ==="
