#!/bin/bash

# 1. Cài đặt các công cụ cần thiết (nếu chưa có)
echo "Đang cài đặt các công cụ hỗ trợ..."
sudo apt update && sudo apt install -y gettext git

# 2. Tạo thư mục chứa extension nếu chưa có
mkdir -p ~/.local/share/gnome-shell/extensions

# 3. Tải mã nguồn Extension từ GitHub (Bản này tương thích tốt với nhiều version Ubuntu)
echo "Đang tải extension Hibernate Status Button..."
TEMP_DIR=$(mktemp -d)
git clone https://github.com/PR-Developers/gnome-shell-extension-hibernate-status.git "$TEMP_DIR"

# 4. Di chuyển vào thư mục và cài đặt
cd "$TEMP_DIR"
# Lấy UUID của extension từ file metadata
EXT_UUID=$(grep -oP '"uuid": "\K[^"]+' metadata.json)

# Di chuyển thư mục vào đúng vị trí của Gnome
cp -r "$TEMP_DIR" ~/.local/share/gnome-shell/extensions/"$EXT_UUID"

# 5. Kích hoạt Extension
echo "Đang kích hoạt extension..."
gnome-extensions enable "$EXT_UUID" 2>/dev/null || echo "Vui lòng đăng xuất và đăng nhập lại, sau đó dùng 'Gnome Extensions App' để bật."

# Dọn dẹp
rm -rf "$TEMP_DIR"

echo "-------------------------------------------------------"
echo "HOÀN TẤT!"
echo "1. Hãy nhấn Alt + F2, gõ 'r' rồi Enter (để restart Gnome Shell)."
echo "   Hoặc Đăng xuất (Log out) và Đăng nhập lại."
echo "2. Kiểm tra menu nguồn, nút Hibernate sẽ xuất hiện."
echo "-------------------------------------------------------"
