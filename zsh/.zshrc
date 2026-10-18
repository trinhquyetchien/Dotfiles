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

eval "$(luarocks path --local)"

function has_command() {
  command -v "$1" >/dev/null 2>&1
}

if [ -d "$HOME/.zsh" ]; then
  for file in $HOME/.zsh/*.zsh; do
    source "$file"
  done
fi

function accept-line {
    if [[ "$BUFFER" =~ '^[[:space:]]*[0-9]+[[:space:]]*([+*/%-][[:space:]]*[0-9]+[[:space:]]*)+$' ]]; then
        BUFFER="echo \$(( $BUFFER ))"
    fi

    zle .accept-line
}

zle -N accept-line

[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"

has_command fnm && eval "$(fnm env --use-on-cd)"

[ -f "$HOME/miniconda3/etc/profile.d/conda.sh" ] && source "$HOME/miniconda3/etc/profile.d/conda.sh"

has_command starship && eval "$(starship init zsh)"


# User local bin
export PATH="$HOME/.local/bin:$PATH"

# simutil (if present)
[ -d "$HOME/.local/lib/simutil" ] && export PATH="$HOME/.local/lib/simutil:$PATH"

# Homebrew (if installed)
if [ -x "/home/linuxbrew/.linuxbrew/bin/brew" ]; then
  eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv zsh)"
elif [ -x "$HOME/.linuxbrew/bin/brew" ]; then
  eval "$($HOME/.linuxbrew/bin/brew shellenv zsh)"
fi

# Aliases to quickly open MarkdownTray calendar and today's task note
alias calendar='pkill -SIGHUP -f "([m]d_tray_app\\.py|[M]arkdownTray)" 2>/dev/null || (python3 "$HOME/.local/bin/md_tray_app.py" --calendar >/dev/null 2>&1 &!)'
alias task='pkill -SIGUSR2 -f "([m]d_tray_app\\.py|[M]arkdownTray)" 2>/dev/null || (python3 "$HOME/.local/bin/md_tray_app.py" --task >/dev/null 2>&1 &!)'
