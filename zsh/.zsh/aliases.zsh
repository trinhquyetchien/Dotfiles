alias v="nvim"
alias t="tmux"
alias lzg="lazygit"
alias lzd="lazydocker"
alias lzs="lazysql"

alias ..="cd .."
alias .="cd"
alias note=" cd ~/Note; v"
alias today='nvim ~/Note/Daily/"$(date +%Y-%m-%d).md"'

alias cl="clear"
alias sz='source ~/.zshrc'

alias hibernate='sudo systemctl hibernate'
alias sleep='systemctl suspend'              
alias off='sudo poweroff'                 
alias out='gnome-session-quit --logout' 
alias lock='loginctl lock-session'  

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

