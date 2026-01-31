export PATH="/home/linuxbrew/.linuxbrew/bin:$PATH"
export PATH="/usr/lib/postgresql/16/bin:$PATH"
export SDKMAN_DIR="$HOME/.sdkman"
export WEZTERM_CONFIG_FILE="$HOME/Dotfiles/wezterm/wezterm.lua"
export STARSHIP_CONFIG="/home/trinhquyetchien/Dotfiles/starship/starship.toml"
export ZSH_HIGHLIGHT_HIGHLIGHTERS_DIR=/home/linuxbrew/.linuxbrew/share/zsh-syntax-highlighting/highlighters
export PATH="$PATH:$HOME/Tools/flutter/bin"
export TERMINFO=/home/linuxbrew/.linuxbrew/Cellar/ncurses/6.5/share/terminfo
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH="$HOME/.local/bin:$PATH"
export PATH="$PATH:$HOME/.pub-cache/bin"
export VIRTUAL_ENV_DISABLE_PROMPT=0

[[ -s "$HOME/.sdkman/bin/sdkman-init.sh" ]] && source "$HOME/.sdkman/bin/sdkman-init.sh"

eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
eval "$(starship init zsh)"

alias xampp-start='sudo /opt/lampp/lampp start'
alias xampp-stop='sudo /opt/lampp/lampp stop'
alias xampp-status='sudo /opt/lampp/lampp status'
alias xampp-restart='sudo /opt/lampp/lampp restart'
alias mysql-start='sudo systemctl start mysql'
alias ani-cli="$HOME/.ani-cli/ani-cli"
alias en="trans -b :en"
alias vi="trans -b :vi"
alias ja="trans -b :ja"


# Load zinit
source ~/.zinit/bin/zinit.zsh

zinit light zsh-users/zsh-completions
zinit light djui/alias-tips
zinit light hcgraf/zsh-sudo
zinit light zsh-users/zsh-syntax-highlighting
zinit light zsh-users/zsh-autosuggestions
zinit light Aloxaf/fzf-tab

alias wezterm='env WAYLAND_DISPLAY= wezterm'

export PATH=$PATH:/usr/local/go/bin
