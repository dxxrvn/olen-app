"""Inside Out — бэкенд на Flask.

Делает две вещи:
1. Раздаёт статический фронтенд из папки ../frontend
2. Даёт REST API для задач (/api/...), данные — в SQLite

Запуск:  python app.py   (из папки backend)  или  python run.py  из корня
"""

import os
import re
from datetime import date, timedelta

from flask import Flask, jsonify, request, send_from_directory

from database import init_db, day_stats, create_task, set_done, delete_task, list_tasks

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "frontend"))

app = Flask(__name__, static_folder=None)
init_db()

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]


def parse_date(value):
    """Возвращает date из строки YYYY-MM-DD или None."""
    if not value or not DATE_RE.match(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


# ---------------- статика (фронтенд) ----------------

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def static_files(path):
    full = os.path.normpath(os.path.join(FRONTEND_DIR, path))
    if not full.startswith(FRONTEND_DIR):
        return jsonify({"error": "not found"}), 404
    return send_from_directory(FRONTEND_DIR, path)


# ---------------- API задач ----------------

@app.get("/api/tasks")
def api_tasks():
    day = parse_date(request.args.get("date")) or date.today()
    result = day_stats(day.isoformat())
    result["date"] = day.isoformat()
    return jsonify(result)


@app.post("/api/tasks")
def api_add():
    data = request.get_json(force=True, silent=True) or {}
    day = parse_date(data.get("date"))
    text = (data.get("text") or "").strip()
    if not day:
        return jsonify({"error": "некорректная дата"}), 400
    if not text or len(text) > 80:
        return jsonify({"error": "текст задачи обязателен (до 80 символов)"}), 400
    return jsonify(create_task(day.isoformat(), text)), 201


@app.patch("/api/tasks/<task_id>")
def api_toggle(task_id):
    data = request.get_json(force=True, silent=True) or {}
    set_done(task_id, bool(data.get("done")))
    return jsonify({"ok": True})


@app.delete("/api/tasks/<task_id>")
def api_delete(task_id):
    delete_task(task_id)
    return "", 204


@app.get("/api/week")
def api_week():
    day = parse_date(request.args.get("date")) or date.today()
    monday = day - timedelta(days=day.weekday())
    today = date.today().isoformat()
    days = []
    for i in range(7):
        d = monday + timedelta(days=i)
        iso = d.isoformat()
        tasks = list_tasks(iso)
        total = len(tasks)
        done = sum(1 for t in tasks if t["done"])
        days.append({
            "date": iso,
            "label": DAY_NAMES[i],
            "day_num": d.day,
            "total": total,
            "done": done,
            "percent": round(done / total * 100) if total else 0,
            "is_today": iso == today,
        })
    avg = round(sum(d["percent"] for d in days) / 7)
    return jsonify({"days": days, "avg_percent": avg})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
