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
    
    # Cài đặt công cụ hỗ trợ
    install_apt "libinput-tools" "xdotool"
    
    # Cấp quyền đọc touchpad
    sudo gpasswd -a $USER input
    
    # Clone và cài đặt từ source
    git clone https://github.com/bulletmark/libinput-gestures.git /tmp/libinput-gestures
    cd /tmp/libinput-gestures && sudo ./libinput-gestures-setup install
    
    # Thiết lập tự khởi động
    libinput-gestures-setup autostart
    
    # Dùng lệnh này để ép hệ thống nhận cấu hình ngay (tạm thời) hoặc khởi động dịch vụ
    libinput-gestures-setup start || true
    
    warn "⚠️  LƯU Ý: Bạn cần LOG OUT và LOG IN lại để cử chỉ touchpad có hiệu lực!"
fi

# 5. GNOME Customization
info "Cài đặt GNOME Tweaks để tùy biến giao diện..."
install_apt "gnome-tweaks"

# Cài đặt thêm engine để hỗ trợ các bộ theme phổ biến (GTK)
install_apt "gtk2-engines-murrine" "gtk2-engines-pixbuf"

# Sửa lỗi AppIndicator cho GNOME Extensions
info "Cài đặt thư viện hỗ trợ AppIndicator..."
install_apt "libayatana-appindicator3-1" "gir1.2-ayatanaappindicator3-0.1" "gnome-shell-extension-appindicator"

success "=== TẤT CẢ SẴN SÀNG! ==="
