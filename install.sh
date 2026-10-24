#!/usr/bin/env bash

# ==============================================================================
#  Ubuntu Environment Automated Restore & Backup Installer
#  Dotfiles: https://github.com/trinhquyetchien/Dotfiles
# ==============================================================================

set -eo pipefail

# --- COLORS & STYLING ---
BOLD="\e[1m"
GREEN="\e[32m"
BLUE="\e[34m"
YELLOW="\e[33m"
RED="\e[31m"
CYAN="\e[36m"
MAGENTA="\e[35m"
RESET="\e[0m"

info()    { echo -e "${BLUE}${BOLD}[INFO]${RESET} $1"; }
success() { echo -e "${GREEN}${BOLD}[SUCCESS]${RESET} $1"; }
warn()    { echo -e "${YELLOW}${BOLD}[WARN]${RESET} $1"; }
error()   { echo -e "${RED}${BOLD}[ERROR]${RESET} $1"; }
step()    { echo -e "\n${MAGENTA}${BOLD}===================================================================${RESET}";
            echo -e "${CYAN}${BOLD}>>> STEP $1: $2${RESET}";
            echo -e "${MAGENTA}${BOLD}===================================================================${RESET}\n"; }

# --- SCRIPT DIRECTORY & ARGUMENTS ---
DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$HOME/.dotfiles_backup/$BACKUP_TIMESTAMP"

MODE="full" # default full
while [[ $# -gt 0 ]]; do
    case "$1" in
        --cli-only)
            MODE="cli"
            shift
            ;;
        --stow-only|--dotfiles-only)
            MODE="stow"
            shift
            ;;
        --no-snap)
            SKIP_SNAP=true
            shift
            ;;
        --no-db)
            SKIP_DB=true
            shift
            ;;
        -h|--help)
            echo -e "${BOLD}Sử dụng:${RESET} $0 [OPTIONS]"
            echo ""
            echo "Tuỳ chọn:"
            echo "  (mặc định)        Khôi phục toàn diện (Hệ thống, CLI, Dev Tools, SDK, DB, GUI App, Dotfiles)"
            echo "  --cli-only        Chỉ khôi phục CLI, Shell, Neovim, Tmux, Runtimes (Bỏ qua Snaps & GUI)"
            echo "  --stow-only       Chỉ sao lưu và liên kết Dotfiles bằng GNU Stow (Không cài thêm package)"
            echo "  --no-snap         Bỏ qua cài đặt các ứng dụng Snap"
            echo "  --no-db           Bỏ qua cài đặt cơ sở dữ liệu (PostgreSQL, MySQL, Redis)"
            echo "  -h, --help        Hiển thị hướng dẫn này"
            exit 0
            ;;
        *)
            warn "Tham số không nhận dạng: $1. Tiếp tục với chế độ mặc định."
            shift
            ;;
    esac
done

# --- HELPER FUNCTIONS ---
has_command() {
    command -v "$1" >/dev/null 2>&1
}

has_snap() {
    snap list 2>/dev/null | grep -q "^$1 "
}

install_apt() {
    local pkgs=("$@")
    local to_install=()
    for pkg in "${pkgs[@]}"; do
        if ! dpkg -s "$pkg" >/dev/null 2>&1; then
            to_install+=("$pkg")
        fi
    done
    if [ ${#to_install[@]} -gt 0 ]; then
        info "APT: Đang cài đặt: ${to_install[*]}..."
        sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "${to_install[@]}"
    fi
}

check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        error "Vui lòng không chạy script với sudo trực tiếp (e.g. 'sudo ./install.sh')."
        error "Hãy chạy như user bình thường: './install.sh'. Script sẽ tự hỏi mật khẩu sudo khi cần."
        exit 1
    fi
    info "Xác thực quyền sudo..."
    sudo -v
    # Giữ quyền sudo sống trong suốt quá trình chạy
    while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &
}

# ==============================================================================
# BẮT ĐẦU QUÁ TRÌNH KHÔI PHỤC
# ==============================================================================

clear || true
echo -e "${CYAN}${BOLD}"
cat << "EOF"
  ____       _    __ _ _           
 |  _ \  ___| |_ / _(_) | ___  ___ 
 | | | |/ _ \ __| |_| | |/ _ \/ __|
 | |_| | (_) | |_|  _| | |  __/\__ \
 |____/ \___/ \__|_| |_|_|\___||___/
 Automated Backup & Environment Restore
EOF
echo -e "${RESET}"
info "Bắt đầu khôi phục môi trường từ thư mục: ${BOLD}$DOTFILES_DIR${RESET}"
info "Chế độ thực thi: ${BOLD}${MODE}${RESET}"
[ -n "$SKIP_SNAP" ] && info "Bỏ qua Snap: ${BOLD}CÓ${RESET}"
[ -n "$SKIP_DB" ] && info "Bỏ qua Database: ${BOLD}CÓ${RESET}"

# ==============================================================================
# NẾU CHỈ STOW (STOW ONLY)
# ==============================================================================
if [ "$MODE" = "stow" ]; then
    step "STOW" "Sao lưu cấu hình cũ & Liên kết Dotfiles bằng GNU Stow"
    if ! has_command "stow"; then
        check_sudo
        install_apt stow
    fi
    mkdir -p "$BACKUP_DIR"
    
    # Danh sách các file/thư mục cần kiểm tra để backup
    targets=(
        ".zshrc" ".zsh" ".bashrc" ".tmux.conf" ".tmux"
        ".config/starship.toml" ".config/wezterm" ".config/nvim"
        ".config/libinput-gestures.conf" ".config/mpv"
        ".config/autostart/md-tray-app.desktop"
        ".config/systemd/user/syncthing.service"
        ".local/bin/md_tray_app.py" ".local/bin/movie"
    )

    for item in "${targets[@]}"; do
        dest="$HOME/$item"
        if [ -e "$dest" ] || [ -L "$dest" ]; then
            if [ -L "$dest" ]; then
                target_link="$(readlink -f "$dest" 2>/dev/null || true)"
                if [[ "$target_link" == "$DOTFILES_DIR"* ]]; then
                    continue # Đã link đúng vào dotfiles
                fi
                rm -f "$dest"
            else
                backup_target="$BACKUP_DIR/$item"
                mkdir -p "$(dirname "$backup_target")"
                mv "$dest" "$backup_target"
                warn "Đã sao lưu $dest -> $backup_target"
            fi
        fi
    done

    mkdir -p "$HOME/.local/bin" "$HOME/.config/autostart" "$HOME/.config/systemd/user" "$HOME/.config/mpv"
    chmod +x "$DOTFILES_DIR"/desktop/.local/bin/* 2>/dev/null || true

    cd "$DOTFILES_DIR"
    for module in zsh tmux starship wezterm nvim libinput desktop systemd; do
        if [ -d "$module" ]; then
            stow -v -R -t "$HOME" "$module"
            success "Stow thành công: $module"
        fi
    done
    success "🎉 Quá trình Stow hoàn tất!"
    exit 0
fi

check_sudo

# ==============================================================================
# STEP 1: HỆ THỐNG CƠ SỞ & BUILD TOOLS
# ==============================================================================
step "1/10" "Cập nhật hệ thống & Cài đặt gói nền tảng"

sudo apt-get update
install_apt \
    build-essential \
    curl \
    wget \
    git \
    stow \
    unzip \
    tar \
    ca-certificates \
    gnupg \
    software-properties-common \
    lsb-release \
    pkg-config \
    xclip \
    wl-clipboard \
    jq \
    gettext \
    libasound2 \
    libpulse0 \
    libgl1

# Hỗ trợ FUSE AppImage (Ubuntu 24.04+ dùng libfuse2t64, cũ hơn dùng libfuse2)
sudo apt-get install -y libfuse2t64 2>/dev/null || sudo apt-get install -y libfuse2 2>/dev/null || true

success "Hệ thống cơ sở và build tools đã sẵn sàng."

# ==============================================================================
# STEP 2: SHELL & MODERN CLI UTILS
# ==============================================================================
step "2/10" "Cài đặt Zsh, Tmux & Modern CLI Utilities"

install_apt zsh tmux fzf ripgrep btop bat translate-shell entr watchman

# Liên kết batcat -> bat & fdfind -> fd
mkdir -p "$HOME/.local/bin"
if has_command "batcat" && ! has_command "bat"; then
    ln -sf "$(which batcat)" "$HOME/.local/bin/bat"
fi
install_apt fd-find
if has_command "fdfind" && [ ! -f "$HOME/.local/bin/fd" ]; then
    ln -sf "$(which fdfind)" "$HOME/.local/bin/fd"
fi

# eza (Thay thế hiện đại cho ls)
if ! has_command "eza"; then
    info "Đang cài đặt eza..."
    sudo mkdir -p /etc/apt/keyrings
    wget -qO- https://raw.githubusercontent.com/eza-community/eza/main/deb.asc | sudo gpg --yes --dearmor -o /etc/apt/keyrings/gierens.gpg
    echo "deb [signed-by=/etc/apt/keyrings/gierens.gpg] http://deb.gierens.de stable main" | sudo tee /etc/apt/sources.list.d/gierens.list
    sudo apt-get update && sudo apt-get install -y eza || true
fi

# Starship Prompt
if ! has_command "starship"; then
    info "Đang cài đặt Starship Prompt..."
    curl -sS https://starship.rs/install.sh | sh -s -- -y
fi

# Zinit Bootstrap cho Zsh
ZINIT_DIR="$HOME/.local/share/zinit/zinit.git"
if [ ! -d "$ZINIT_DIR" ]; then
    info "Đang clone Zinit (Zsh Plugin Manager)..."
    mkdir -p "$(dirname "$ZINIT_DIR")"
    git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_DIR"
fi

# Thiết lập Zsh làm Shell mặc định
if [[ "$SHELL" != *"zsh"* ]]; then
    ZSH_PATH="$(which zsh)"
    info "Thiết lập Zsh ($ZSH_PATH) làm Shell mặc định cho $USER..."
    sudo chsh -s "$ZSH_PATH" "$USER" || true
fi

success "Shell và các công cụ Modern CLI đã cài đặt xong."

# ==============================================================================
# STEP 3: DEVELOPER CLI TOOLS (GitHub Releases)
# ==============================================================================
step "3/10" "Cài đặt Developer CLI Tools (Lazygit, Lazydocker, Lazysql, Yazi)"

# 1. Lazygit
if ! has_command "lazygit"; then
    info "Đang tải Lazygit..."
    LZG_VER="$(curl -fsSLI -o /dev/null -w "%{url_effective}" https://github.com/jesseduffield/lazygit/releases/latest | awk -F'/' '{print $NF}' | sed 's/^v//')"
    if [ -n "$LZG_VER" ]; then
        curl -fsSL "https://github.com/jesseduffield/lazygit/releases/latest/download/lazygit_${LZG_VER}_linux_x86_64.tar.gz" -o /tmp/lazygit.tar.gz
        sudo tar -xzf /tmp/lazygit.tar.gz -C /usr/local/bin lazygit
        sudo chmod +x /usr/local/bin/lazygit
        rm -f /tmp/lazygit.tar.gz
        success "Lazygit $LZG_VER đã cài thành công."
    fi
fi

# 2. Lazydocker
if ! has_command "lazydocker"; then
    info "Đang cài đặt Lazydocker..."
    curl -fsSL https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | bash
    if [ -f "$HOME/.local/bin/lazydocker" ]; then
        sudo cp "$HOME/.local/bin/lazydocker" /usr/local/bin/lazydocker
    fi
fi

# 3. Lazysql
if ! has_command "lazysql"; then
    info "Đang tải Lazysql..."
    curl -fsSL "https://github.com/jorgerojas26/lazysql/releases/latest/download/lazysql_Linux_x86_64.tar.gz" -o /tmp/lazysql.tar.gz
    sudo tar -xzf /tmp/lazysql.tar.gz -C /usr/local/bin lazysql
    sudo chmod +x /usr/local/bin/lazysql
    rm -f /tmp/lazysql.tar.gz
    success "Lazysql đã cài thành công."
fi

# 4. Yazi (File Manager)
if ! has_command "yazi"; then
    info "Đang tải Yazi..."
    curl -fsSL "https://github.com/sxyazi/yazi/releases/latest/download/yazi-x86_64-unknown-linux-gnu.deb" -o /tmp/yazi.deb
    if [ -f /tmp/yazi.deb ]; then
        sudo apt-get install -y /tmp/yazi.deb || true
        rm -f /tmp/yazi.deb
        success "Yazi đã cài thành công."
    fi
fi

# 5. scrcpy (Screen copy cho Android)
install_apt scrcpy

success "Developer CLI Tools đã cài đặt thành công."

# ==============================================================================
# STEP 4: TERMINAL & EDITOR (WezTerm, Neovim, Tmux TPM)
# ==============================================================================
step "4/10" "Cài đặt Terminal (WezTerm) & Editor (Neovim)"

# 1. WezTerm qua Apt Fury Repo
if ! has_command "wezterm"; then
    info "Đang thiết lập WezTerm APT repository..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://apt.fury.io/wez/gpg.key | sudo gpg --yes --dearmor -o /etc/apt/keyrings/wezterm-fury.gpg
    echo 'deb [signed-by=/etc/apt/keyrings/wezterm-fury.gpg] https://apt.fury.io/wez/ * *' | sudo tee /etc/apt/sources.list.d/wezterm.list
    sudo apt-get update && sudo apt-get install -y wezterm || true
fi

if has_command "wezterm"; then
    info "Cấu hình WezTerm làm terminal mặc định..."
    sudo update-alternatives --install /usr/bin/x-terminal-emulator x-terminal-emulator "$(which wezterm)" 50 2>/dev/null || true
    sudo update-alternatives --set x-terminal-emulator "$(which wezterm)" 2>/dev/null || true
    gsettings set org.gnome.desktop.default-applications.terminal exec 'wezterm' 2>/dev/null || true
    gsettings set org.gnome.desktop.default-applications.terminal exec-arg "-e" 2>/dev/null || true
fi

# 2. Neovim mới nhất (Trực tiếp từ GitHub tarball /usr/local)
if ! has_command "nvim" || [[ "$(nvim --version 2>&1 | head -n1)" < "NVIM v0.10" ]]; then
    info "Đang cài đặt Neovim mới nhất từ GitHub..."
    curl -fsSL "https://github.com/neovim/neovim/releases/latest/download/nvim-linux-x86_64.tar.gz" -o /tmp/nvim.tar.gz
    sudo rm -rf /opt/nvim-linux-x86_64
    sudo tar -C /opt -xzf /tmp/nvim.tar.gz
    sudo ln -sf /opt/nvim-linux-x86_64/bin/nvim /usr/local/bin/nvim
    rm -f /tmp/nvim.tar.gz
    success "Neovim đã cài đặt thành công tại /usr/local/bin/nvim."
fi

# 3. Phụ thuộc cho Neovim Plugins (Luarocks, ImageMagick cho image.nvim)
info "Cài đặt dependencies cho Neovim image.nvim & formatters..."
install_apt luarocks imagemagick libmagickwand-dev lua5.1 liblua5.1-0-dev
luarocks --local --lua-version=5.1 install magick 2>/dev/null || true

# 4. Tmux Plugin Manager (TPM)
TPM_DIR="$HOME/.tmux/plugins/tpm"
if [ ! -d "$TPM_DIR" ]; then
    info "Đang clone Tmux Plugin Manager (TPM)..."
    mkdir -p "$TPM_DIR"
    git clone https://github.com/tmux-plugins/tpm "$TPM_DIR"
fi

success "Terminal và Neovim đã được cấu hình."

# ==============================================================================
# STEP 5: FONT & BỘ GÕ TIẾNG VIỆT/NHẬT (JetBrainsMono Nerd Font & Fcitx5)
# ==============================================================================
step "5/10" "Cài đặt JetBrainsMono Nerd Font & Bộ gõ Fcitx5"

# 1. JetBrainsMono Nerd Font
FONT_DIR="$HOME/.local/share/fonts/JetBrainsMono"
if [ ! -d "$FONT_DIR" ] || [ -z "$(ls -A "$FONT_DIR" 2>/dev/null)" ]; then
    info "Đang tải JetBrainsMono Nerd Font..."
    mkdir -p "$FONT_DIR"
    curl -fsSLo /tmp/JetBrainsMono.tar.xz "https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.tar.xz"
    tar -xf /tmp/JetBrainsMono.tar.xz -C "$FONT_DIR"
    fc-cache -fv >/dev/null 2>&1 || true
    rm -f /tmp/JetBrainsMono.tar.xz
    success "Đã cài xong JetBrainsMono Nerd Font."
fi

# 2. Fcitx5 (Vietnamese Bamboo + Japanese Mozc)
info "Cài đặt Fcitx5, Bamboo, Mozc..."
install_apt fcitx5 fcitx5-mozc fcitx5-bamboo fcitx5-config-qt
im-config -n fcitx5 >/dev/null 2>&1 || true

success "Font chữ và bộ gõ Fcitx5 đã sẵn sàng."

# ==============================================================================
# STEP 6: TOUCHPAD GESTURES & DESKTOP TOOLS
# ==============================================================================
step "6/10" "Cài đặt Touchpad Gestures, MPV & Custom Desktop Tools"

# 1. Gestures
install_apt libinput-tools xdotool ydotool gnome-tweaks gnome-shell-extension-manager
sudo gpasswd -a "$USER" input >/dev/null 2>&1 || true

if ! has_command "libinput-gestures"; then
    info "Đang biên dịch và cài đặt libinput-gestures..."
    git clone https://github.com/bulletmark/libinput-gestures.git /tmp/libinput-gestures
    (cd /tmp/libinput-gestures && sudo ./libinput-gestures-setup install)
    libinput-gestures-setup autostart >/dev/null 2>&1 || true
    rm -rf /tmp/libinput-gestures
fi

# 2. Thư viện cho md_tray_app.py & desktop apps
install_apt \
    python3-gi \
    gir1.2-gtk-3.0 \
    gir1.2-webkit2-4.1 \
    gir1.2-ayatanaappindicator3-0.1 \
    libayatana-appindicator3-1 \
    python3-pip \
    mpv

python3 -m pip install --break-system-packages markdown-it-py 2>/dev/null || \
python3 -m pip install markdown-it-py 2>/dev/null || true

success "Touchpad Gestures và Desktop Tools đã sẵn sàng."

# ==============================================================================
# STEP 7: RUNTIMES & SDKS (Node.js, Java, Kotlin, Android, Docker)
# ==============================================================================
step "7/10" "Cài đặt Runtimes & SDKs (FNM, Node 22, SDKMAN, Java, Android, Docker)"

# 1. FNM & Node.js
if ! has_command "fnm"; then
    info "Đang cài đặt FNM (Fast Node Manager)..."
    curl -fsSL https://fnm.vercel.app/install | bash -s -- --install-dir "$HOME/.local/share/fnm" --skip-shell
fi
export PATH="$HOME/.local/share/fnm:$PATH"
if has_command "fnm"; then
    eval "$(fnm env)"
    info "Cài đặt Node.js v22 (LTS)..."
    fnm install 22 || true
    fnm default 22 || true
    fnm use 22 || true
    if has_command "npm"; then
        npm install -g yarn pnpm live-server @nestjs/cli 2>/dev/null || true
    fi
fi

# 2. SDKMAN & Java / Kotlin / Gradle / Maven
export SDKMAN_DIR="$HOME/.sdkman"
if [ ! -d "$SDKMAN_DIR" ]; then
    info "Đang cài đặt SDKMAN..."
    curl -s "https://get.sdkman.io?rcupdate=false" | bash
fi

if [ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ]; then
    source "$SDKMAN_DIR/bin/sdkman-init.sh"
    sed -i -e 's/sdkman_auto_answer=false/sdkman_auto_answer=true/g' "$SDKMAN_DIR/etc/config" 2>/dev/null || true
    
    info "Cài đặt Java 21, Java 17, Kotlin, Gradle, Maven qua SDKMAN..."
    sdk install java 21.0.2-tem || sdk install java || true
    sdk install java 17.0.10-tem || true
    sdk default java 21.0.2-tem || true
    sdk install kotlin || true
    sdk install gradle || true
    sdk install maven || true
fi

# 3. Android SDK Command-line Tools
ANDROID_ROOT="$HOME/Android/Sdk"
CMD_LINE_TOOLS_DIR="$ANDROID_ROOT/cmdline-tools"
if [ ! -d "$CMD_LINE_TOOLS_DIR/latest" ]; then
    info "Đang thiết lập Android SDK Commandline Tools..."
    mkdir -p "$CMD_LINE_TOOLS_DIR"
    curl -fsSLo /tmp/cmdline-tools.zip "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
    unzip -q /tmp/cmdline-tools.zip -d "$CMD_LINE_TOOLS_DIR"
    mv "$CMD_LINE_TOOLS_DIR/cmdline-tools" "$CMD_LINE_TOOLS_DIR/latest" 2>/dev/null || true
    rm -f /tmp/cmdline-tools.zip
    
    export PATH="$CMD_LINE_TOOLS_DIR/latest/bin:$ANDROID_ROOT/platform-tools:$PATH"
    if has_command "sdkmanager"; then
        yes | sdkmanager --licenses >/dev/null 2>&1 || true
        sdkmanager --sdk_root="$ANDROID_ROOT" "platform-tools" "platforms;android-34" "build-tools;34.0.0" "emulator" >/dev/null 2>&1 || true
    fi
fi

# 4. Docker Engine & Compose
if ! has_command "docker"; then
    info "Đang cài đặt Docker Engine chính thức..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    sudo usermod -aG docker "$USER" || true
    rm -f /tmp/get-docker.sh
fi

success "Bộ SDK và Runtimes đã sẵn sàng."

# ==============================================================================
# STEP 8: CƠ SỞ DỮ LIỆU (PostgreSQL, MySQL, Redis, SQLite)
# ==============================================================================
if [ "$MODE" != "cli" ] && [ -z "$SKIP_DB" ]; then
    step "8/10" "Cài đặt Cơ sở dữ liệu (PostgreSQL, MySQL, Redis, SQLite)"

    install_apt postgresql postgresql-contrib mysql-server redis-server sqlite3 sqlitebrowser

    sudo systemctl enable postgresql mysql redis-server >/dev/null 2>&1 || true
    sudo systemctl start postgresql mysql redis-server >/dev/null 2>&1 || true

    success "Cơ sở dữ liệu đã cài đặt và khởi động ngầm."
else
    info "Bỏ qua cài đặt Database theo tuỳ chọn."
fi

# ==============================================================================
# STEP 9: ỨNG DỤNG DESKTOP & GUI (Snaps & Deb)
# ==============================================================================
if [ "$MODE" != "cli" ] && [ -z "$SKIP_SNAP" ]; then
    step "9/10" "Cài đặt Ứng dụng Desktop & GUI (Snap, Chrome, JetBrains Toolbox)"

    # Google Chrome
    if ! has_command "google-chrome"; then
        info "Đang cài Google Chrome..."
        wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb
        sudo apt-get install -y /tmp/chrome.deb || true
        rm -f /tmp/chrome.deb
    fi

    # Syncthing
    install_apt syncthing

    # JetBrains Toolbox
    if [ ! -f "$HOME/.local/bin/jetbrains-toolbox" ]; then
        info "Đang tải JetBrains Toolbox..."
        TB_URL="https://data.services.jetbrains.com/products/download?platform=linux&code=TBC"
        curl -fsSL "$TB_URL" -o /tmp/toolbox.tar.gz
        if tar -ztf /tmp/toolbox.tar.gz >/dev/null 2>&1; then
            mkdir -p /tmp/toolbox-dist
            tar -xzf /tmp/toolbox.tar.gz -C /tmp/toolbox-dist --strip-components=1
            mkdir -p "$HOME/.local/bin"
            mv /tmp/toolbox-dist/jetbrains-toolbox "$HOME/.local/bin/jetbrains-toolbox"
            chmod +x "$HOME/.local/bin/jetbrains-toolbox"
            rm -rf /tmp/toolbox.tar.gz /tmp/toolbox-dist
            success "JetBrains Toolbox đã tải vào ~/.local/bin/jetbrains-toolbox"
        fi
    fi

    # SceneBuilder
    if ! has_command "scenebuilder" && [ ! -d "/opt/scenebuilder" ]; then
        info "Đang cài đặt Gluon SceneBuilder..."
        curl -fsSLo /tmp/scenebuilder.deb "https://download2.gluonhq.com/scenebuilder/25.0.0/install/linux/SceneBuilder-25.0.0.deb"
        sudo apt-get install -y /tmp/scenebuilder.deb 2>/dev/null || true
        rm -f /tmp/scenebuilder.deb
    fi

    # Snaps
    info "Cài đặt ứng dụng Snap (VS Code, Postman, Android Studio, DBeaver, Figma, Flutter)..."
    for snap_app in "code --classic" "android-studio --classic" "flutter --classic" "dbeaver-ce --classic" "postman" "mysql-workbench-community" "figma-linux" "drawio"; do
        read -r s_name s_flag <<< "$snap_app"
        if ! has_snap "$s_name"; then
            info "Snap: Đang cài $s_name..."
            sudo snap install $s_name $s_flag || true
        fi
    done

    success "Ứng dụng Desktop GUI đã cài đặt xong."
else
    info "Bỏ qua cài đặt ứng dụng Desktop GUI theo tuỳ chọn."
fi

# ==============================================================================
# STEP 10: LIÊN KẾT CẤU HÌNH BẰNG GNU STOW & KÍCH HOẠT DỊCH VỤ
# ==============================================================================
step "10/10" "Sao lưu an toàn & Liên kết toàn bộ Dotfiles (GNU Stow)"

# 1. Tạo các thư mục đệm mục tiêu
mkdir -p "$HOME/.local/bin"
mkdir -p "$HOME/.config/autostart"
mkdir -p "$HOME/.config/systemd/user"
mkdir -p "$HOME/.config/mpv"
mkdir -p "$HOME/.local/share/gnome-shell/extensions"
mkdir -p "$HOME/Note/Daily"
mkdir -p "$BACKUP_DIR"

# 2. Danh sách các file cấu hình cần kiểm tra và sao lưu an toàn
targets=(
    ".zshrc" ".zsh" ".bashrc" ".tmux.conf" ".tmux"
    ".config/starship.toml" ".config/wezterm" ".config/nvim"
    ".config/libinput-gestures.conf" ".config/mpv"
    ".config/autostart/md-tray-app.desktop"
    ".config/systemd/user/syncthing.service"
    ".local/bin/md_tray_app.py" ".local/bin/movie"
)

info "Đang kiểm tra và sao lưu cấu hình cũ (nếu có) sang $BACKUP_DIR..."
for item in "${targets[@]}"; do
    dest="$HOME/$item"
    if [ -e "$dest" ] || [ -L "$dest" ]; then
        if [ -L "$dest" ]; then
            target_link="$(readlink -f "$dest" 2>/dev/null || true)"
            if [[ "$target_link" == "$DOTFILES_DIR"* ]]; then
                continue # Đã link vào Dotfiles hiện tại
            fi
            rm -f "$dest"
        else
            backup_target="$BACKUP_DIR/$item"
            mkdir -p "$(dirname "$backup_target")"
            mv "$dest" "$backup_target"
            warn "Đã sao lưu: $dest -> $backup_target"
        fi
    fi
done

# 3. Cấp quyền thực thi cho các script trong Dotfiles
chmod +x "$DOTFILES_DIR"/desktop/.local/bin/* 2>/dev/null || true

# 4. Sao lưu extension cũ nếu có xung đột và chuẩn bị liên kết
if [ -d "$DOTFILES_DIR/gnome-extensions/.local/share/gnome-shell/extensions" ]; then
    for ext_path in "$DOTFILES_DIR/gnome-extensions/.local/share/gnome-shell/extensions"/*; do
        ext_name="$(basename "$ext_path")"
        ext_dest="$HOME/.local/share/gnome-shell/extensions/$ext_name"
        if [ -e "$ext_dest" ] || [ -L "$ext_dest" ]; then
            if [ -L "$ext_dest" ]; then
                target_link="$(readlink -f "$ext_dest" 2>/dev/null || true)"
                if [[ "$target_link" == "$DOTFILES_DIR"* ]]; then
                    continue
                fi
                rm -rf "$ext_dest"
            else
                mkdir -p "$BACKUP_DIR/.local/share/gnome-shell/extensions"
                mv "$ext_dest" "$BACKUP_DIR/.local/share/gnome-shell/extensions/"
                warn "Đã sao lưu extension cũ: $ext_name -> $BACKUP_DIR"
            fi
        fi
    done
fi

# 5. Thực thi GNU Stow
cd "$DOTFILES_DIR"
modules=(zsh tmux starship wezterm nvim libinput desktop systemd gnome-extensions)

for mod in "${modules[@]}"; do
    if [ -d "$mod" ]; then
        stow -v -R -t "$HOME" "$mod"
        success "Đã liên kết module: $mod"
    fi
done

# 6. Kích hoạt user service cho Syncthing
if has_command "syncthing"; then
    info "Đang kích hoạt Syncthing user systemd service..."
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    systemctl --user enable syncthing.service >/dev/null 2>&1 || true
    systemctl --user start syncthing.service >/dev/null 2>&1 || true
fi

# 7. Pre-sync Neovim Plugins (Headless Lazy sync)
if has_command "nvim"; then
    info "Đang tự động tải các plugin Neovim bằng lazy.nvim (headless)..."
    nvim --headless "+Lazy! sync" +qa >/dev/null 2>&1 || true
fi

# ==============================================================================
# HOÀN TẤT
# ==============================================================================
echo -e "\n${GREEN}${BOLD}===================================================================${RESET}"
echo -e "${GREEN}${BOLD}🎉 CHÚC MỪNG! TOÀN BỘ MÔI TRƯỜNG ĐÃ ĐƯỢC KHÔI PHỤC HOÀN TOÀN!${RESET}"
echo -e "${GREEN}${BOLD}===================================================================${RESET}\n"

echo -e "${BOLD}Các bước tiếp theo bạn nên làm:${RESET}"
echo -e " 1. ${CYAN}Đăng xuất (Log out) hoặc khởi động lại (Reboot)${RESET} để áp dụng Shell Zsh, nhóm Docker & Input gestures."
echo -e " 2. Mở ${BOLD}WezTerm${RESET} (Ctrl+Alt+T) hoặc gõ ${BOLD}nvim${RESET} để bắt đầu lập trình."
echo -e " 3. Mở ${BOLD}tmux${RESET} và nhấn ${BOLD}Ctrl-a + I${RESET} (viết hoa) để tải các plugin tmux (nếu cần)."
echo -e " 4. File sao lưu cấu hình cũ của bạn (nếu có) được lưu an toàn tại: ${BOLD}$BACKUP_DIR${RESET}\n"
