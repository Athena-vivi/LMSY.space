@echo off
echo ========================================
echo R2 to Database Sync Script
echo ========================================
echo.
echo This will scan R2 path magazines/2024/
echo and insert missing records into gallery table.
echo.
npx tsx scripts/sync-r2-to-db.ts
echo.
pause
