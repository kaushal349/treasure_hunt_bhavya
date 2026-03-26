import os
import zipfile
import time

DATA_DIR = "data"
BACKUP_DIR = "backups"

def create_backup():
    if not os.path.exists(DATA_DIR):
        print("No data directory found to backup.")
        return

    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)

    timestamp = int(time.time())
    zip_name = f"backup_{timestamp}.zip"
    zip_path = os.path.join(BACKUP_DIR, zip_name)

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(DATA_DIR):
            for file in files:
                filepath = os.path.join(root, file)
                # Keep filename relative to data folder
                arcname = os.path.relpath(filepath, DATA_DIR)
                zipf.write(filepath, arcname)

    print(f"Backup created: {zip_path}")

if __name__ == "__main__":
    create_backup()
