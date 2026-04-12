# Editor
export EDITOR='nvim'

# 1. FNM (Node.js) - Phải đặt trước PATH
export PATH="$HOME/.local/share/fnm:$PATH"
if command -v fnm &> /dev/null; then
  eval "$(fnm env --use-on-cd)"
fi

# 2. SDKMAN (Java)
export SDKMAN_DIR="$HOME/.sdkman"
[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"

# Fcitx5 (Tiếng Anh - Nhật - Việt)
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS=@im=fcitx
export SDL_IM_MODULE=fcitx
export GLFW_IM_MODULE=ibus

# --- ANDROID CONFIGURATION ---
export ANDROID_HOME="$HOME/Android/Sdk"

# Thiết lập đường dẫn Android SDK (thường mặc định trên Linux)
export ANDROID_HOME=$HOME/Android/Sdk

# Thêm các thư mục công cụ vào PATH
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

export QT_QPA_PLATFORM=xcb

