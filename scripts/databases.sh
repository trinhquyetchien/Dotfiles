#!/bin/bash
source "$(dirname "$0")/utils.sh"

info "--- [STEP 4] DATABASE SERVERS & GUI MANAGEMENT TOOLS ---"

# ==========================================
# 1. DATABASE SERVERS (Các dịch vụ chạy ngầm)
# ==========================================

# PostgreSQL - Ưu tiên cho Backend dự án ChickenGoo
if ! has_command "psql"; then
    info "Đang cài đặt PostgreSQL..."
    install_apt "postgresql"
    install_apt "postgresql-contrib"
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    success "PostgreSQL Server đã sẵn sàng."
fi

# MySQL (MariaDB) - Phổ biến cho các môn học tại trường
if ! has_command "mysql"; then
    info "Đang cài đặt MySQL Server..."
    install_apt "mysql-server"
    sudo systemctl enable mysql
    sudo systemctl start mysql
    success "MySQL Server đã sẵn sàng."
fi

# Redis - Cực kỳ quan trọng để làm Cache cho App Fullstack
if ! has_command "redis-server"; then
    info "Đang cài đặt Redis Server..."
    install_apt "redis-server"
    sudo systemctl enable redis-server
    success "Redis Server đã sẵn sàng."
fi

# SQLite3 - Dùng cho Mobile (Flutter) và lưu trữ nhẹ cho AI
install_apt "sqlite3"

# ==========================================
# 2. DATABASE GUI TOOLS (Công cụ quản lý trực quan)
# ==========================================

info "Đang cài đặt các công cụ quản lý Database (GUI)..."

# DBeaver Community - "Trùm cuối" quản lý đa loại DB (Postgre, MySQL, SQLite,...)
if ! has_command "dbeaver-ce"; then
    info "Cài đặt DBeaver (Universal Database Tool)..."
    sudo snap install dbeaver-ce
fi

# pgAdmin 4 - Bản Desktop chính chủ cho Postgesql
if ! has_command "pgadmin4"; then
    info "Đang thiết lập Repo pgAdmin 4 (Link mới)..."
    
    # Tải khóa public mới nhất
    curl -fsS https://www.pgadmin.org/static/packages_pgadmin_org.pub | sudo gpg --dearmor -o /usr/share/keyrings/packages-pgadmin-org.gpg

    # Tạo file cấu hình repo và update
    sudo sh -c 'echo "deb [signed-by=/usr/share/keyrings/packages-pgadmin-org.gpg] https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" > /etc/apt/sources.list.d/pgadmin4.list'
    
    sudo apt update
    
    info "Đang cài đặt pgadmin4-desktop..."
    sudo apt install -y pgadmin4-desktop
else
    info "pgAdmin 4 đã có sẵn."
fi

# MySQL Workbench - Thiết kế lược đồ (Schema) cho MySQL
if ! has_command "mysql-workbench"; then
    info "Cài đặt MySQL Workbench..."
    sudo snap install mysql-workbench-community
fi

# DB Browser for SQLite - Cực nhẹ, chuyên để soi file .db của Android/Flutter
if ! has_command "sqlitebrowser"; then
    info "Cài đặt DB Browser for SQLite..."
    install_apt "sqlitebrowser"
fi


success "=== HOÀN THÀNH STEP 4: DATABASE STACK ĐÃ SẴN SÀNG ==="

