#!/bin/bash

# --- IMPORT UTILS ---
DOTFILES_DIR=$(pwd)
source "$DOTFILES_DIR/scripts/utils.sh"

info "🚀 BẮT ĐẦU TỔNG TIẾN CÔNG THIẾT LẬP DOTFILES..."

# 1. CẤP QUYỀN THỰC THI CHO CÁC SCRIPTS
chmod +x scripts/*.sh

# 2. CHẠY CÁC SCRIPTS CÀI ĐẶT MÔI TRƯỜNG
info "🛠 Đang cài đặt phần mềm và các bộ SDK..."
./scripts/setup-shell.sh
./scripts/software.sh
./scripts/languages.sh
./scripts/database.sh
./scripts/dev-tools.sh
./scripts/resources.sh
./scripts/extensions.sh
./scripts/grubtheme.sh

# 3. DỌN DẸP CONFIG CŨ (Để Stow không bị lỗi conflict)
info "🧹 Đang dọn dẹp cấu hình cũ tại thư mục Home..."
rm -rf ~/.zshrc ~/.zsh ~/.bashrc ~/.tmux.conf ~/.wezterm.lua ~/.config/starship.toml
rm -rf ~/.config/wezterm ~/.config/nvim ~/.config/libinput-gestures.conf

# 4. THỰC HIỆN STOW (Áp dụng config từ repo)
info "🔗 Đang thực hiện Stow để liên kết cấu hình..."
# Lưu ý: grub không stow vì nó cần cài vào hệ thống /boot/grub
packages=(zsh nvim wezterm starship tmux libinput)

for pkg in "${packages[@]}"; do
    if [ -d "$pkg" ]; then
        stow "$pkg"
        success "Link thành công: $pkg"
    else
        warn "Bỏ qua $pkg vì không tìm thấy thư mục."
    fi
done

# 5. CÀI ĐẶT GRUB THEME (Chạy trực tiếp từ repo của bạn)
if [ -d "$DOTFILES_DIR/grub/grub2-nord-theme" ]; then
    info "🎨 Đang cài đặt GRUB Nord Theme..."
    cd "$DOTFILES_DIR/grub/grub2-nord-theme"
    chmod +x install.sh
    # Chạy lệnh cài đặt của theme (thường cần sudo bên trong file .sh)
    sudo ./install.sh
    cd "$DOTFILES_DIR"
    success "Đã cài xong giao diện GRUB."
else
    warn "Không tìm thấy thư mục theme GRUB."
fi

# 6. PLUGIN TMUX (TPM)
if [ ! -d "$HOME/.tmux/plugins/tpm" ]; then
    info "📦 Cài đặt Tmux Plugin Manager..."
    git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
fi

success "✨ HỆ THỐNG ĐÃ SẴN SÀNG!"
info "👉 Bước cuối: Khởi động lại máy để thấy GRUB mới và gõ 'nvim' để bắt đầu code!"
