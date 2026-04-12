#!/bin/bash
source "$(dirname "$0")/utils.sh"

info "--- [STEP 7] TÀI NGUYÊN CUỐI: FONT & FCITX5 (ANH-NHẬT-VIỆT) ---"

# 1. JetBrainsMono Nerd Font (Bắt buộc)
if [ ! -d "$HOME/.local/share/fonts/JetBrainsMono" ]; then
    info "Đang cài đặt JetBrainsMono Nerd Font..."
    mkdir -p "$HOME/.local/share/fonts/JetBrainsMono"
    wget -c https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.zip -O /tmp/font.zip
    unzip -o /tmp/font.zip -d "$HOME/.local/share/fonts/JetBrainsMono"
    fc-cache -fv
    rm /tmp/font.zip
fi

# 2. Cài đặt Fcitx5 và các bộ gõ
info "Đang cài đặt Fcitx5, Mozc (Nhật) và Bamboo (Việt)..."
# Gỡ Ibus nếu có để tránh xung đột
sudo apt remove --purge ibus -y

# Cài đặt Fcitx5 và engine
install_apt "fcitx5"
install_apt "fcitx5-mozc"      # Tiếng Nhật
install_apt "fcitx5-bamboo"    # Tiếng Việt
install_apt "fcitx5-config-qt" # Giao diện cấu hình

# Thiết lập Fcitx5 làm bộ gõ mặc định hệ thống
im-config -n fcitx5

# 3. Cấu hình biến môi trường cho Fcitx5 (Để gõ được trong nvim/wezterm)
info "Cấu hình biến môi trường cho Fcitx5..."
{
    echo 'export GTK_IM_MODULE=fcitx'
    echo 'export QT_IM_MODULE=fcitx'
    echo 'export XMODIFIERS=@im=fcitx'
    echo 'export SDL_IM_MODULE=fcitx'
    echo 'export GLFW_IM_MODULE=ibus' # Một số app Flutter/Nvim cần dòng này
} >> "$HOME/.zsh/exports.zsh" 2>/dev/null

# 4. Extension Manager & Gestures
install_apt "gnome-shell-extension-manager"
if ! has_command "libinput-gestures"; then
    info "Cài đặt Touchpad Gestures..."
    install_apt "libinput-tools" "xdotool"
    sudo gpasswd -a $USER input
    git clone https://github.com/bulletmark/libinput-gestures.git /tmp/libinput-gestures
    (cd /tmp/libinput-gestures && sudo ./libinput-gestures-setup install)
    libinput-gestures-setup autostart
fi

success "=== TẤT CẢ SẴN SÀNG! ==="
