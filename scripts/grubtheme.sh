# --- GRUB NORD THEME INSTALLATION ---
# Đường dẫn repo bạn cung cấp
GRUB_REPO="https://github.com/stevendejongnl/grub2-nord-theme.git"
TEMP_DIR="/tmp/grub-nord-theme"

# Kiểm tra xem theme đã tồn tại trong hệ thống chưa (tránh cài đè)
if [ ! -d "/boot/grub/themes/nord" ]; then
    echo "󰛖 Đang tải và cài đặt Grub Nord Theme..."

    # 1. Clone repo vào thư mục tạm (chỉ lấy commit mới nhất để cho nhanh)
    git clone --depth 1 "$GRUB_REPO" "$TEMP_DIR"

    # 2. Chạy file install.sh (thường repo này yêu cầu quyền sudo)
    # Lưu ý: Một số repo cần chuyển vào đúng thư mục mới chạy được script
    cd "$TEMP_DIR" || exit
    sudo ./install.sh

    # 3. Quay lại thư mục cũ và dọn dẹp
    cd - > /dev/null
    rm -rf "$TEMP_DIR"

    echo "󰄬 Cài đặt Grub Theme thành công!"
else
    echo "󰄬 Grub Nord Theme đã được cài đặt từ trước."
fi
