const cron = require('node-cron');
const { runDbBackup } = require('./scripts/db-backup');
const { runAccountsExport } = require('./scripts/accounts-export');
const { runSheetsSync } = require('./scripts/sheets-sync');

const dbBackupCron = process.env.DB_BACKUP_CRON || '0 2 * * *';
const accountsExportCron = process.env.ACCOUNTS_EXPORT_CRON || '0 3 * * *';

console.log(`[backup] DB backup scheduled:       ${dbBackupCron}`);
console.log(`[backup] Accounts export scheduled: ${accountsExportCron}`);
console.log('[backup] Container time zone (crontab is evaluated in this TZ):', Intl.DateTimeFormat().resolvedOptions().timeZone);

cron.schedule(dbBackupCron, () => {
  runDbBackup().catch((err) => console.error('[backup] DB backup job failed:', err));
});

cron.schedule(accountsExportCron, () => {
  runAccountsExport().catch((err) => console.error('[backup] Accounts export job failed:', err));
});

// Optional live sync to a Google Sheet (only when GSHEET_ID is configured)
const sheetsSyncCron = process.env.SHEETS_SYNC_CRON || '*/30 * * * *';
if (process.env.GSHEET_ID) {
  if (cron.validate(sheetsSyncCron)) {
    console.log(`[backup] Sheets sync scheduled:     ${sheetsSyncCron}`);
    cron.schedule(sheetsSyncCron, () => {
      runSheetsSync().catch((err) => console.error('[backup] Sheets sync job failed:', err.message));
    });
    // run once at startup so the sheet is populated right away
    runSheetsSync().catch((err) => console.error('[backup] Initial Sheets sync failed:', err.message));
  } else {
    console.error(`[backup] SHEETS_SYNC_CRON "${sheetsSyncCron}" is not a valid cron expression - Sheets sync disabled.`);
  }
} else {
  console.log('[backup] GSHEET_ID not set - Sheets sync disabled.');
}

// Keep the container alive; jobs run on schedule above.
console.log('[backup] Backup service running. Waiting for scheduled jobs...');
