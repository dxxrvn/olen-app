"""Работа с SQLite-базой задач."""

import os
import sqlite3
import uuid
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'tasks.db')


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id         TEXT PRIMARY KEY,
                date       TEXT NOT NULL,          -- YYYY-MM-DD
                text       TEXT NOT NULL,
                done       INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )
        ''')
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date)"
        )


def list_tasks(day):
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, text, done FROM tasks WHERE date = ? ORDER BY created_at",
            (day,),
        ).fetchall()
    return [
        {"id": r["id"], "text": r["text"], "done": bool(r["done"])} for r in rows
    ]


def create_task(day, text):
    task = {"id": uuid.uuid4().hex[:12], "text": text.strip(), "done": False}
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO tasks (id, date, text, done, created_at) VALUES (?, ?, ?, 0, ?)",
            (task["id"], day, task["text"], datetime.utcnow().isoformat()),
        )
    return task


def set_done(task_id, done):
    with get_connection() as conn:
        conn.execute("UPDATE tasks SET done = ? WHERE id = ?", (int(done), task_id))


def delete_task(task_id):
    with get_connection() as conn:
        conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))


def day_stats(day):
    tasks = list_tasks(day)
    total = len(tasks)
    done = sum(1 for t in tasks if t["done"])
    return {
        "tasks": tasks,
        "total": total,
        "done": done,
        "percent": round(done / total * 100) if total else 0,
    }
