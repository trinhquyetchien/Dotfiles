#!/bin/bash

info() { echo -e "\e[34m[INFO]\e[0m $1"; }
success() { echo -e "\e[32m[SUCCESS]\e[0m $1"; }

# 1. Lấy phiên bản GNOME hiện tại (ví dụ: 46)
GNOME_VER=$(gnome-shell --version | cut -d ' ' -f 3 | cut -d '.' -f 1)
EXT_DIR="$HOME/.local/share/gnome-shell/extensions"
mkdir -p "$EXT_DIR"

extensions=(
    "blur-my-shell@aunetx"
    "clipboard-indicator@tudmotu.com"
    "gTile@vibou"
    "hidetopbar@mathieu.bidon.ca"
    "runandroidemulators@mateusz1913.dev"
    "todoit@wassimbj.github.io"
    "top-bar-organizer@julian.gse.jsts.xyz"
    "extension-list@tu.berry"
    "cronomix@zagortenay333"
    "docker@stickman_0x00.com"
    "event-planner@mdoksa"
    "ip-indicator@phoenixcreation"
    "vitals@corecoding.com"
)

info "Đang cài đặt Extensions cho GNOME $GNOME_VER..."

for uuid in "${extensions[@]}"; do
    if [ -d "$EXT_DIR/$uuid" ]; then
        success "Đã có: $uuid"
        continue
    fi

    info "Đang tải: $uuid"
    
    # Lấy link download trực tiếp từ API của GNOME Extensions
    # Dùng jq để parse JSON (nếu chưa có thì sudo apt install jq)
    DOWNLOAD_URL=$(curl -s "https://extensions.gnome.org/extension-query/?search=$uuid" | \
                  jq -r ".extensions[] | select(.uuid==\"$uuid\") | .pk")

    if [ "$DOWNLOAD_URL" != "" ]; then
        # Lấy bản build mới nhất phù hợp với version GNOME
        FILE_URL=$(curl -s "https://extensions.gnome.org/extension-info/?pk=$DOWNLOAD_URL&shell_version=$GNOME_VER" | jq -r ".download_url")
        
        # Tải và giải nén
        wget -qO "/tmp/$uuid.zip" "https://extensions.gnome.org$FILE_URL"
        mkdir -p "$EXT_DIR/$uuid"
        unzip -qo "/tmp/$uuid.zip" -d "$EXT_DIR/$uuid"
        
        # Kích hoạt extension
        gnome-extensions enable "$uuid"
        success "Đã cài xong: $uuid"
        rm "/tmp/$uuid.zip"
    else
        echo -e "\e[31m[ERROR]\e[0m Không tìm thấy link cho $uuid"
    fi
done

info "LƯU Ý: Bạn cần đăng xuất (Log out) hoặc Alt+F2 -> gõ 'r' để GNOME nhận diện đủ extensions mới."
