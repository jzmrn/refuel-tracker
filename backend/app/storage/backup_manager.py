import zipfile
from pathlib import Path
from datetime import datetime, timedelta
import asyncio


class BackupManager:
    def __init__(self, data_path: Path, backup_path: Path):
        self.data_path = data_path
        self.backup_path = backup_path
        self.backup_path.mkdir(exist_ok=True)

    async def create_backup(self) -> str:
        """Create timestamped backup of all data"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = self.backup_path / f"backup_{timestamp}.zip"

        with zipfile.ZipFile(backup_file, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_path in self.data_path.rglob("*.parquet"):
                arcname = file_path.relative_to(self.data_path)
                zipf.write(file_path, arcname)

        return str(backup_file)

    async def auto_backup(self, interval_hours: int = 24):
        """Automatic backup every N hours"""
        while True:
            try:
                backup_file = await self.create_backup()
                print(f"Backup created: {backup_file}")

                # Clean up old backups (keep last 7 days)
                await self._cleanup_old_backups(days=7)

            except Exception as e:
                print(f"Backup failed: {e}")

            await asyncio.sleep(interval_hours * 3600)

    async def _cleanup_old_backups(self, days: int):
        """Remove backups older than N days"""
        cutoff_time = datetime.now() - timedelta(days=days)

        for backup_file in self.backup_path.glob("backup_*.zip"):
            if backup_file.stat().st_mtime < cutoff_time.timestamp():
                backup_file.unlink()
