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

# Git
alias gs="git status"
alias gaa="git add ."
alias gcm="git commit -m"
alias gp="git push"
alias gpl="git pull"
alias gd="git diff"

# Docker
alias dc="docker compose"
alias dcu="docker compose up"
alias dcud="docker compose up -d"
alias dcd="docker compose down"
alias dcl="docker compose logs -f"

# Flutter
alias fl="flutter"
alias flr="flutter run"
alias fld="flutter devices"
alias flc="flutter clean"
alias flpg="flutter pub get"
alias flt="flutter test"
alias flbapk="flutter build apk"

# Android/Emulator
alias emu="emulator -list-avds"
alias emu-run="emulator -avd NvimEmulator"
alias adb-devices="adb devices"
alias adb-log="adb logcat"
alias adb-install="adb install -r"
alias adb-shell="adb shell"
alias adb-reverse-8080="adb reverse tcp:8080 tcp:8080"
alias gw="./gradlew"
alias gwad="./gradlew assembleDebug"
alias gwid="./gradlew installDebug"
alias gwtest="./gradlew test"
alias gwclean="./gradlew clean"

# React Native
alias rn="npx react-native"
alias rna="npx react-native run-android"
alias rnios="npx react-native run-ios"
alias rns="npx react-native start"
alias rnclean="cd android && ./gradlew clean && cd .."

# Node/Web
alias ni="npm install"
alias nr="npm run"
alias nrd="npm run dev"
alias nrb="npm run build"
alias nrt="npm test"
alias pi="pnpm install"
alias pr="pnpm run"
alias prd="pnpm dev"
alias prb="pnpm build"

# Java/Spring Boot
alias mvnrun="mvn spring-boot:run"
alias mvnci="mvn clean install"
alias mvnct="mvn clean test"
alias mvnskip="mvn clean install -DskipTests"
alias grboot="./gradlew bootRun"
alias grtest="./gradlew test"
alias grbuild="./gradlew build"
alias p8080="lsof -i :8080"
alias health="curl http://localhost:8080/actuator/health"
alias swagger="google-chrome http://localhost:8080/swagger-ui/index.html"

# System session
alias hibernate='sudo systemctl hibernate'      # Ngủ đông (lưu vào swap 31GB của bạn)
alias sleep='systemctl suspend'              # Tạm dừng (ngủ nhẹ)
alias shutdown='sudo poweroff'                 # Tắt máy hoàn toàn
alias out='gnome-session-quit --logout' # Đăng xuất nhanh
alias lock='loginctl lock-session'  # Khóa màn hình

# Work websites
alias email='google-chrome https://mail.google.com/mail'
alias zalo='google-chrome https://chat.zalo.me'
alias mess='google-chrome https://www.messenger.com'
alias driver='google-chrome https://drive.google.com'
alias calendar='google-chrome https://calendar.google.com'
alias youtube='google-chrome https://youtube.com'
alias github='google-chrome https://github.com'
alias insta="google-chrome https://www.instagram.com"
alias docs='google-chrome https://docs.google.com'
alias meet='google-chrome https://meet.google.com'
alias chatgpt='google-chrome https://chatgpt.com'
alias stack='google-chrome https://stackoverflow.com'
alias trello='google-chrome https://trello.com'
alias notion='google-chrome https://www.notion.so'
alias jira='google-chrome https://www.atlassian.com/software/jira'
alias springdoc='google-chrome https://docs.spring.io/spring-boot/docs/current/reference/html/'
alias androiddoc='google-chrome https://developer.android.com/docs'
alias flutterdoc='google-chrome https://docs.flutter.dev'
alias rndoc='google-chrome https://reactnative.dev/docs/getting-started'
alias mavenrepo='google-chrome https://mvnrepository.com'

# Open groups
function open-work() {
  google-chrome \
    https://mail.google.com/mail \
    https://calendar.google.com \
    https://drive.google.com \
    https://docs.google.com \
    https://github.com \
    https://chatgpt.com >/dev/null 2>&1 &!
}

function open-plan() {
  google-chrome \
    https://calendar.google.com \
    https://trello.com \
    https://www.notion.so \
    https://www.atlassian.com/software/jira >/dev/null 2>&1 &!
}

function open-mobile-docs() {
  google-chrome \
    https://docs.flutter.dev \
    https://developer.android.com/docs \
    https://reactnative.dev/docs/getting-started >/dev/null 2>&1 &!
}

function open-backend-docs() {
  google-chrome \
    https://docs.spring.io/spring-boot/docs/current/reference/html/ \
    https://mvnrepository.com \
    https://stackoverflow.com >/dev/null 2>&1 &!
}

function open-chat() {
  google-chrome \
    https://chat.zalo.me \
    https://www.messenger.com \
    https://mail.google.com/mail >/dev/null 2>&1 &!
}
