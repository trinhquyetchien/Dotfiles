# Editors
alias v="nvim"

# Terminal tools
alias t="tmux"
alias lzg="lazygit"
alias lzd="lazydocker"
alias lzs="lazysql"

# Navigation
alias ..="cd .."
alias .="cd"
alias note=" cd ~/Note; v"

# Shell
alias cl="clear"
alias sz='source ~/.zshrc'

# System session
alias hibernate='sudo systemctl hibernate'      # Ngủ đông (lưu vào swap 31GB của bạn)
alias sleep='systemctl suspend'              # Tạm dừng (ngủ nhẹ)
alias shutdown='sudo poweroff'                 # Tắt máy hoàn toàn
alias out='gnome-session-quit --logout' # Đăng xuất nhanh
alias lock='loginctl lock-session'  # Khóa màn hình

alias today='nvim ~/Note/Daily/"$(date +%Y-%m-%d).md"'

# Work websites
alias email='google-chrome https://mail.google.com/mail'
alias nix='google-chrome https://digital.nix.edu.vn/dashboard'
alias zalo='google-chrome https://chat.zalo.me'
alias mess='google-chrome https://www.messenger.com'
alias driver='google-chrome https://drive.google.com'
alias calendar='google-chrome https://calendar.google.com'
alias youtube='google-chrome https://youtube.com'
alias github='google-chrome https://github.com'
alias insta="google-chrome https://www.instagram.com"
alias abolo="google-chrome https://app.alobo.vn"
alias face="google-chrome https://www.facebook.com"
alias jira="google-chrome https://trinhquyetchien2005.atlassian.net"
alias clickup="google-chrome https://app.clickup.com"
alias notion="google-chrome https://app.notion.com"
alias map=" google-chrome https://www.google.com/maps"
alias supabase='google-chrome https://supabase.com/dashboard'
alias vercel='google-chrome https://vercel.com/'
alias aws='google-chrome https://settings.aws.com/projects'
alias firebase='google-chrome https://console.firebase.google.com/u/0/'
alias mongodb='google-chrome https://cloud.mongodb.com/v2#/org/675be6e45f137433a9fe0940/projects'
alias postman='google-chrome https://trinhquyetchiens-team.postman.co/home'
alias neon='google-chrome https://console.neon.tech/app/org-fancy-wildflower-39437087/projects'
alias cloudflare='google-chrome https://dash.cloudflare.com/f6c59e033046e634d8d128fe4ae30473/home'

soical() {
    insta
    youtube
    face 
}


chat() {
    mess
    zalo
}

task() {
    calendar
}

work() {
    email
    abolo
    driver
}

pm(){
    clickup
    jira
}

function accept-line {
    if [[ "$BUFFER" =~ '^[[:space:]]*[0-9]+[[:space:]]*([+*/%-][[:space:]]*[0-9]+[[:space:]]*)+$' ]]; then
        BUFFER="echo \$(( $BUFFER ))"
    fi

    zle .accept-line
}

zle -N accept-line
