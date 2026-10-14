# Inside Out — упрощённая версия

Тайм-менеджмент для школьников и студентов: фокус-сессии (Pomodoro) под lo-fi,
план задач на день с недельной статистикой.

Оригинал (React + TypeScript + Vite + Tailwind + shadcn) переписан в простую
структуру: **бэкенд на Python (Flask + SQLite)** и **фронтенд на чистых
HTML/CSS/JS** — без Node.js, без сборки, без фреймворков.

## Структура

```
app/
├── run.py                  # запуск сервера из корня: python run.py
├── backend/
│   ├── app.py              # Flask: раздаёт фронтенд + REST API /api/...
│   ├── database.py         # SQLite: задачи
│   └── requirements.txt    # flask
├── frontend/
│   ├── index.html          # одна страница: Главная / Фокус / Задачи
│   ├── css/style.css       # вся стилизация (бывший Tailwind)
│   ├── js/app.js           # роутинг, таймер, задачи (бывший React)
│   └── media/              # видео/звуки/логотипы (скопировать из оригинала)
└── README.md
```

## Запуск

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scriptsctivate
pip install -r backend/requirements.txt
python run.py
```

Открыть http://localhost:5000

## API

| Метод  | Путь               | Описание                              |
|--------|--------------------|---------------------------------------|
| GET    | /api/tasks?date=   | задачи на день + статистика           |
| POST   | /api/tasks         | добавить задачу {date, text}          |
| PATCH  | /api/tasks/<id>    | отметить выполненной {done: true}     |
| DELETE | /api/tasks/<id>    | удалить задачу                        |
| GET    | /api/week?date=    | статистика за неделю (пн–вс)          |

Даты в формате YYYY-MM-DD. База — `backend/tasks.db`, создаётся автоматически.

## Медиа

Скопируй файлы из `public/media` оригинального репозитория в `frontend/media/`
(команды — в `frontend/media/README.txt`). Без них приложение тоже работает:
вместо видео — градиент, кнопки звуков просто отключатся.
