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


# Added by Antigravity CLI installer
export PATH="/home/trinhquyetchien/.local/bin:$PATH"

# simutil
export PATH="/home/trinhquyetchien/.local/lib/simutil:$PATH"

eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv zsh)"
