#!/bin/bash

# --- Bảng màu ANSI ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color (Reset)

# --- Hàm thông báo (Logging) ---
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# --- Hàm hỗ trợ logic ---

# 1. Kiểm tra một lệnh đã tồn tại trong PATH chưa
has_command() {
    command -v "$1" >/dev/null 2>&1
}

# 2. Cài đặt bằng APT nếu chưa có (Tiết kiệm thời gian chạy lại script)
install_apt() {
    if ! has_command "$1"; then
        info "Đang cài đặt $1..."
        sudo apt install -y "$1"
    else
        info "$1 đã được cài đặt từ trước."
    fi
}

# 3. Hàm chờ người dùng nhấn phím để tiếp tục (Dùng khi cần debug)
pause_script() {
    read -p "Nhấn [Enter] để tiếp tục hoặc [Ctrl+C] để dừng..."
}

# 4. Kiểm tra quyền sudo
check_sudo() {
    if [ "$EUID" -ne 0 ]; then
        error "Vui lòng chạy script với quyền sudo (dùng: sudo ./script_name)"
        exit 1
    fi
}
