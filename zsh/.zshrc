# --- 1. ZINIT BOOTSTRAP (Cài đặt và nạp plugin) ---
ZINIT_HOME="${XDG_DATA_HOME:-${HOME}/.local/share}/zinit/zinit.git"
if [[ ! -d "$ZINIT_HOME" ]]; then
    mkdir -p "$(dirname "$0")"
    git clone https://github.com/zdharma-continuum/zinit.git "$ZINIT_HOME"
fi
source "${ZINIT_HOME}/zinit.zsh"

# Nạp các plugin cơ bản
zinit light zsh-users/zsh-autosuggestions
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-completions
zinit ice depth=1; zinit light jeffreytse/zsh-vi-mode
zinit light Aloxaf/fzf-tab

# --- 2. HÀM HỖ TRỢ ---
function has_command() {
  command -v "$1" >/dev/null 2>&1
}

# --- 3. NẠP CẤU HÌNH CON TỪ .zsh/ ---
# Quan trọng: Phải nạp cái này để lấy PATH cho wezterm, nvim, android...
if [ -d "$HOME/.zsh" ]; then
  for file in $HOME/.zsh/*.zsh; do
    source "$file"
  done
fi

# --- 4. NẠP CÁC BỘ SDK (SDKMAN, FNM, CONDA) ---
# SDKMAN
[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"

# FNM (Node.js)
has_command fnm && eval "$(fnm env --use-on-cd)"

# Miniconda (AI)
[ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ] && source "$HOME/miniconda3/etc/profile.d/conda.sh"

# --- 5. KHỞI ĐỘNG STARSHIP (LUÔN ĐỂ CUỐI CÙNG) ---
has_command starship && eval "$(starship init zsh)"
