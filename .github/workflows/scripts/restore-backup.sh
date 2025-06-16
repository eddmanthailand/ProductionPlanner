#!/bin/bash

# Database Restore Script
# ใช้สำหรับ restore backup จาก GitHub Actions

set -e

echo "🔄 Database Restore Script"
echo "========================="

# ตรวจสอบว่ามี DATABASE_URL หรือไม่
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is required"
    echo "   Set it with: export DATABASE_URL='your_database_url'"
    exit 1
fi

# ตรวจสอบว่ามีไฟล์ backup หรือไม่
if [ $# -eq 0 ]; then
    echo "❌ Error: Backup file is required"
    echo "   Usage: ./scripts/restore-backup.sh <backup_file>"
    echo "   Example: ./scripts/restore-backup.sh backups/backup_20250616_020000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# ตรวจสอบว่าไฟล์มีอยู่จริง
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📁 Backup file: $BACKUP_FILE"
echo "🗄️ Database: $DATABASE_URL"
echo ""

# ยืนยันการ restore
read -p "⚠️  WARNING: This will REPLACE all current data. Continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    exit 1
fi

echo "🔄 Starting restore process..."

# ตรวจสอบว่าไฟล์เป็น .gz หรือไม่
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "📦 Extracting compressed backup..."
    gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
else
    echo "📄 Restoring SQL backup..."
    psql "$DATABASE_URL" < "$BACKUP_FILE"
fi

echo ""
echo "✅ Database restore completed successfully!"
echo "🕐 Restore completed at: $(date)"
