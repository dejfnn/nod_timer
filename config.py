"""Application configuration for TimeFlow."""

import os
from pathlib import Path

# Application
APP_NAME: str = "TimeFlow"
APP_VERSION: str = "0.1.0"

# Database
DB_DIR: Path = Path(os.environ.get("TIMEFLOW_DB_DIR", Path(__file__).parent))
DB_NAME: str = os.environ.get("TIMEFLOW_DB_NAME", "timeflow.db")
DB_PATH: Path = DB_DIR / DB_NAME

# Defaults
DEFAULT_PROJECT_COLOR: str = "#4A90D9"
TIMEZONE: str = os.environ.get("TIMEFLOW_TIMEZONE", "Europe/Prague")

# Date/time format
DATETIME_FORMAT: str = "%Y-%m-%dT%H:%M:%S"
DATE_FORMAT: str = "%Y-%m-%d"
TIME_FORMAT: str = "%H:%M:%S"
