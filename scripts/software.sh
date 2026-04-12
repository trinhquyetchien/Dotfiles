#!/bin/bash

# Nạp các hàm bổ trợ
source "$(dirname "$0")/utils.sh"

info "--- [STEP 2] CÀI ĐẶT PHẦN MỀM HỆ THỐNG & GUI ---"

# 1. Cài đặt các ứng dụng Terminal chuyên sâu
info "Đang cài đặt Tmux và hỗ trợ AppImage..."
install_apt "tmux"
install_apt "libfuse2" # Bắt buộc phải có để chạy Neovim AppImage trên Ubuntu mới

if ! has_command "nvim"; then
    info "Đang tải Neovim AppImage từ GitHub..."
    # Thêm -L để follow redirect và --progress-bar để hiện quá trình tải
    sudo curl -L --progress-bar https://github.com/neovim/neovim/releases/latest/download/nvim-linux-x86_64.appimage -o /usr/local/bin/nvim
    
    info "Đang cấp quyền thực thi cho Neovim..."
    sudo chmod +x /usr/local/bin/nvim
    
    success "Neovim đã được cài đặt thành công tại /usr/local/bin/nvim"
else
    info "Neovim đã tồn tại, kiểm tra phiên bản..."
    nvim --version | head -n 1
fi

# 3. WEZTERM (Dùng APT Repo thay vì tải .deb thủ công)
if ! has_command "wezterm"; then
    info "Đang thiết lập APT Repo cho Wezterm..."
    curl -fsSL https://apt.fury.io/wez/gpg.key | sudo gpg --yes --dearmor -o /usr/share/keyrings/wezterm-fury.gpg
    sudo chmod 644 /usr/share/keyrings/wezterm-fury.gpg
    echo 'deb [signed-by=/usr/share/keyrings/wezterm-fury.gpg] https://apt.fury.io/wez/ * *' | sudo tee /etc/apt/sources.list.d/wezterm.list
    
    sudo apt update
    sudo apt install wezterm -y
    success "Wezterm đã cài xong qua APT."
fi
# THIẾT LẬP WEZTERM LÀM MẶC ĐỊNH
info "Đang thiết lập Wezterm làm Terminal mặc định của hệ thống..."

# 1. Đăng ký vào hệ thống Alternatives (Dùng cho lệnh x-terminal-emulator)
sudo update-alternatives --install /usr/bin/x-terminal-emulator x-terminal-emulator /usr/bin/wezterm 50
sudo update-alternatives --set x-terminal-emulator /usr/bin/wezterm

# 2. Đặt Wezterm làm app mặc định cho Desktop
gsettings set org.gnome.desktop.default-applications.terminal exec 'wezterm'
gsettings set org.gnome.desktop.default-applications.terminal exec-arg "-e"

success "Đã đặt Wezterm làm mặc định. Thử nhấn Ctrl+Alt+T sau khi script xong!"

# 4. Cài đặt Docker (Engine & Compose)
if ! has_command "docker"; then
    info "Đang cài đặt Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    # Thêm user vào group để chạy docker ko cần sudo
    sudo usermod -aG docker $USER
    rm get-docker.sh
    success "Docker đã cài xong. Đã thêm $USER vào group docker."
fi

# 5. Cài đặt các ứng dụng qua Snap (Classic cho IDE, Stable cho Tools)
info "Đang cài đặt các ứng dụng qua Snap (Quá trình này có thể mất vài phút)..."
# Mẹo: Cài đặt song song có thể gây lỗi lock apt, nên ta cài tuần tự
sudo snap install code --classic
sudo snap install postman
sudo snap install android-studio --classic
sudo snap install dbeaver-ce --classic
sudo snap install figma-linux
sudo snap install drawio

# 6. Google Chrome (Bản .deb chính thức)
if ! has_command "google-chrome"; then
    info "Đang tải Google Chrome..."
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb
    sudo apt install -y /tmp/chrome.deb
    rm /tmp/chrome.deb
fi

#!/bin/bash

# Hàm bổ trợ nếu chưa có
info() { echo -e "\e[34m[INFO]\e[0m $1"; }

if [ ! -d "$HOME/.local/share/JetBrains/Toolbox" ]; then
    info "Đang chuẩn bị cài đặt JetBrains Toolbox..."
    
    # 1. Cài đặt thư viện cần thiết
    sudo apt update && sudo apt install -y libfuse2t64 libnss3-dev curl tar

    # 2. Link tải trực tiếp (đã qua xử lý redirect)
    # Tải bản mới nhất cho Linux x64
    TB_URL="https://data.services.jetbrains.com/products/download?platform=linux&code=TBC"
    
    # Dùng -L để curl đuổi theo link redirect, dùng --post301 để giữ method
    info "Đang tải file tar.gz..."
    curl -L "$TB_URL" -o /tmp/toolbox.tar.gz

    # Kiểm tra xem file tải về có thực sự là file nén không
    if ! tar -ztf /tmp/toolbox.tar.gz > /dev/null 2>&1; then
        echo -e "\e[31m[ERROR]\e[0m File tải về bị lỗi định dạng. Đang thử dùng wget..."
        wget -q --show-progress -O /tmp/toolbox.tar.gz "https://download.jetbrains.com/toolbox/jetbrains-toolbox-2.3.2.31487.tar.gz"
    fi

    # 3. Giải nén
    mkdir -p /tmp/toolbox-dist
    tar -xzf /tmp/toolbox.tar.gz -C /tmp/toolbox-dist --strip-components=1
    
    # 4. Di chuyển vào bin
    mkdir -p "$HOME/.local/bin"
    mv /tmp/toolbox-dist/jetbrains-toolbox "$HOME/.local/bin/jetbrains-toolbox"
    chmod +x "$HOME/.local/bin/jetbrains-toolbox"

    # 5. Khởi chạy với nohup để nó không chết khi tắt terminal
    info "Khởi chạy Toolbox để hoàn tất cài đặt..."
    nohup "$HOME/.local/bin/jetbrains-toolbox" --install > /dev/null 2>&1 &
    
    # Dọn dẹp
    rm -rf /tmp/toolbox.tar.gz /tmp/toolbox-dist
    
    echo -e "\e[32m[SUCCESS]\e[0m JetBrains Toolbox đang được cài đặt ngầm. Kiểm tra menu ứng dụng sau vài giây!"
else
    echo -e "\e[32m[SUCCESS]\e[0m JetBrains Toolbox đã tồn tại."
fi


# SceneBuilder cho JavaFX
if ! has_command "scenebuilder"; then
    info "Đang cài đặt SceneBuilder 25.0.0..."
    SB_URL="https://download2.gluonhq.com/scenebuilder/25.0.0/install/linux/SceneBuilder-25.0.0.deb"
    curl -Lo /tmp/scenebuilder.deb "$SB_URL"
    
    if [ -f /tmp/scenebuilder.deb ]; then
        sudo apt install -y /tmp/scenebuilder.deb
        rm /tmp/scenebuilder.deb
        success "SceneBuilder 25.0.0 đã cài xong!"
    else
        error "Tải SceneBuilder thất bại."
    fi
fi

success "=== HOÀN THÀNH STEP 2: SOFTWARE SETUP ==="
