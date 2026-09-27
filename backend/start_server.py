import sys
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)

log_path = os.path.join(base_dir, "server_runtime.log")
log_file = open(log_path, "a", encoding="utf-8", buffering=1)
sys.stdout = log_file
sys.stderr = log_file

import uvicorn

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, log_level="info")
