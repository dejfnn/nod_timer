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

# Project color palette (16 preset colors, similar to Toggl)
PROJECT_COLORS: list[str] = [
    "#4A90D9",  # Blue
    "#E74C3C",  # Red
    "#2ECC71",  # Green
    "#F39C12",  # Orange
    "#9B59B6",  # Purple
    "#1ABC9C",  # Teal
    "#E67E22",  # Dark Orange
    "#3498DB",  # Light Blue
    "#E91E63",  # Pink
    "#00BCD4",  # Cyan
    "#8BC34A",  # Light Green
    "#FF5722",  # Deep Orange
    "#607D8B",  # Blue Grey
    "#795548",  # Brown
    "#FFC107",  # Amber
    "#673AB7",  # Deep Purple
]
