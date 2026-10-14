"""Точка входа: запускает сервер из корня проекта.

    python run.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from app import app  # noqa: E402

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
