#!/bin/bash
source "$(dirname "$0")/utils.sh"

info "--- [STEP 6] CÀI ĐẶT CÔNG CỤ HỖ TRỢ (LAZY TOOLS & CLI UTILS) ---"

# 1. Lazygit - Quản lý Git đỉnh cao (Phải có cho BrSE)
if ! has_command "lazygit"; then
    info "Đang cài đặt Lazygit..."
    LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | grep -Po '"tag_name": "v\K[^"]*')
    curl -Lo /tmp/lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
    tar xf /tmp/lazygit.tar.gz -C /tmp lazygit
    sudo install /tmp/lazygit /usr/local/bin
    rm /tmp/lazygit.tar.gz /tmp/lazygit
    success "Lazygit đã sẵn sàng."
fi

# 2. Lazydocker - Quản lý Container PostgreSQL/Redis cho ChickenGoo
if ! has_command "lazydocker"; then
    info "Đang cài đặt Lazydocker..."
    curl https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | bash
    # Copy vào bin để dùng toàn hệ thống
    sudo cp $HOME/.local/bin/lazydocker /usr/local/bin/ 2>/dev/null
fi

# 3. Lazysql - Quản lý DB trực tiếp trong Terminal (Dành cho Neovim)
if ! has_command "lazysql"; then
    info "Đang cài đặt Lazysql..."
    curl -Lo /tmp/lazysql.tar.gz "https://github.com/jorgerojas26/lazysql/releases/latest/download/lazysql_Linux_x86_64.tar.gz"
    tar xf /tmp/lazysql.tar.gz -C /tmp lazysql
    sudo install /tmp/lazysql /usr/local/bin
    rm /tmp/lazysql.tar.gz /tmp/lazysql
fi

# 4. Yazi - File Manager siêu tốc bằng Rust (Thay thế Ranger/Nnn)
if ! has_command "yazi"; then
    info "Đang cài đặt Yazi..."
    curl -Lo /tmp/yazi.zip "https://github.com/sxyazi/yazi/releases/latest/download/yazi-x86_64-unknown-linux-gnu.zip"
    unzip -q /tmp/yazi.zip -d /tmp/yazi-dist
    sudo cp /tmp/yazi-dist/yazi-x86_64-unknown-linux-gnu/yazi /usr/local/bin/
    sudo cp /tmp/yazi-dist/yazi-x86_64-unknown-linux-gnu/ya /usr/local/bin/
    rm -rf /tmp/yazi.zip /tmp/yazi-dist
fi


# Liên kết fdfind thành fd (Ubuntu đặt tên hơi khác)
ln -sf $(which fdfind) ~/.local/bin/fd 2>/dev/null

success "=== HOÀN THÀNH STEP 6: DEV-TOOLS ĐÃ SẴN SÀNG ==="
