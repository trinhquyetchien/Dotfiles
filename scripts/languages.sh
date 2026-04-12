#!/bin/bash
source "$(dirname "$0")/utils.sh"

info "--- [STEP 3] THIẾT LẬP MÔI TRƯỜNG DEV (JAVA 21 & ANDROID CLI) ---"

# Đảm bảo có unzip để giải nén Android Tools
install_apt "unzip"

# 1. SDKMAN!
if [ ! -d "$HOME/.sdkman" ]; then
    info "Đang cài đặt SDKMAN!..."
    curl -s "https://get.sdkman.io?rcupdate=false" | bash # Tắt tự động update rc để mình tự quản lý
    
    # Nạp SDKMAN ngay lập tức để dùng lệnh 'sdk'
    export SDKMAN_DIR="$HOME/.sdkman"
    source "$HOME/.sdkman/bin/sdkman-init.sh"
    
    info "Cài đặt Java (Thiết lập Java 21 làm mặc định)..."
    sdk install java 21.0.2-tem
    sdk install java 17.0.10-tem
    sdk install kotlin
    sdk install gradle
    sdk install maven
    
    sdk default java 21.0.2-tem
else
    info "SDKMAN! đã sẵn sàng."
    source "$HOME/.sdkman/bin/sdkman-init.sh"
fi

# 2. Android SDK Command Line Tools
ANDROID_ROOT="$HOME/Android/Sdk"
CMD_LINE_TOOLS_DIR="$ANDROID_ROOT/cmdline-tools"

# Kiểm tra xem file thực thi sdkmanager đã tồn tại chưa thay vì chỉ kiểm tra thư mục
if [ ! -f "$CMD_LINE_TOOLS_DIR/latest/bin/sdkmanager" ]; then
    info "Đang thiết lập Android SDK thuần CLI..."
    
    # Xóa sạch thư mục cũ nếu có để tránh lỗi lệnh mv
    rm -rf "$CMD_LINE_TOOLS_DIR"
    mkdir -p "$CMD_LINE_TOOLS_DIR"
    
    URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    curl -Lo /tmp/cmdline-tools.zip "$URL"
    unzip -q /tmp/cmdline-tools.zip -d "$CMD_LINE_TOOLS_DIR"
    
    # Google đóng gói zip hơi kỳ (nó nằm trong thư mục cmdline-tools)
    mv "$CMD_LINE_TOOLS_DIR/cmdline-tools" "$CMD_LINE_TOOLS_DIR/latest"
    rm /tmp/cmdline-tools.zip

    # Nạp PATH tạm thời để các lệnh bên dưới chạy được
    export PATH="$CMD_LINE_TOOLS_DIR/latest/bin:$ANDROID_ROOT/platform-tools:$ANDROID_ROOT/emulator:$PATH"

    info "Đang tải các thành phần Android SDK..."
    yes | sdkmanager --licenses
    
    # Thêm --sdk_root để chắc chắn nó cài đúng chỗ
    sdkmanager --sdk_root=$ANDROID_ROOT "platform-tools" "platforms;android-34" "build-tools;34.0.0" "emulator"
    
    info "Đang tải system image..."
    sdkmanager --sdk_root=$ANDROID_ROOT "system-images;android-34;google_apis;x86_64"
    
    info "Tạo AVD..."
    echo "no" | avdmanager create avd -n "NvimEmulator" -k "system-images;android-34;google_apis;x86_64" --force
else
    success "Android SDK đã được cài đặt tại $CMD_LINE_TOOLS_DIR/latest"
fi

# 3. FNM & Node.js (Fix lỗi bản lts)
if ! has_command "fnm"; then
    info "Đang cài đặt FNM..."
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir "$HOME/.local/share/fnm" --skip-shell
    
    export PATH="$HOME/.local/share/fnm:$PATH"
    eval "$(fnm env --use-on-cd)"
    
    info "Đang cài đặt Node.js v22 (LTS)..."
    fnm install 22
    fnm default 22
    fnm use 22
    
    npm install -g yarn pnpm live-server @nestjs/cli
    success "FNM và Node.js đã cài xong."
else
    # Đảm bảo nạp fnm vào session hiện tại của script
    export PATH="$HOME/.local/share/fnm:$PATH"
    eval "$(fnm env)"
    fnm use 22
fi

# 4. Miniconda
if [ ! -d "$HOME/miniconda3" ]; then
    info "Đang cài đặt Miniconda..."
    wget -c https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh
    bash /tmp/miniconda.sh -b -u -p $HOME/miniconda3
    rm /tmp/miniconda.sh
    # Không cần init zsh ở đây nếu bạn đã có config conda trong Dotfiles
fi

# 5. Library hỗ trợ
info "Cài đặt thư viện hệ thống..."
install_apt libgl1
install_apt libpulse0
install_apt libxcomposite1
install_apt libcursor1
install_apt libasound2
install_apt watchman
install_apt build-essential
success "=== HOÀN THÀNH STEP 3 ==="
