/* ============================================================
   Inside Out — логика фронтенда (бывший React, теперь vanilla JS)
   Роутинг по хэшу: #/home, #/focus, #/tasks
   ============================================================ */

"use strict";

const $ = (sel) => document.querySelector(sel);

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayISO() { return toISO(new Date()); }
function formatLong(iso) {
  const s = new Date(iso + "T00:00:00").toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
async function api(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.status === 204 ? null : r.json();
}

/* ================= РОУТЕР ================= */

const ROUTES = { home: "view-home", focus: "view-focus", tasks: "view-tasks" };

function currentPage() {
  const h = location.hash.replace("#/", "");
  return ROUTES[h] ? h : "home";
}

function renderRoute() {
  const page = currentPage();
  Object.entries(ROUTES).forEach(([key, id]) =>
    document.getElementById(id).classList.toggle("active", key === page));
  document.querySelectorAll("[data-nav]").forEach((a) =>
    a.classList.toggle("active", a.dataset.nav === page));
  document.body.dataset.page = page;
  window.scrollTo(0, 0);
  if (page === "tasks") Tasks.load();
}

window.addEventListener("hashchange", renderRoute);
window.addEventListener("scroll", () =>
  document.body.classList.toggle("scrolled", window.scrollY > 24), { passive: true });

/* ================= ЗАДАЧИ ================= */

const Tasks = {
  selected: todayISO(),

  async load() {
    $("#date-picker").value = this.selected;
    try {
      const [day, week] = await Promise.all([
        api(`/api/tasks?date=${this.selected}`),
        api(`/api/week?date=${this.selected}`),
      ]);
      this.renderWeek(week.days);
      this.renderDay(day);
      this.renderChart(week.days, week.avg_percent);
    } catch (e) {
      $("#task-list").innerHTML =
        `<li class="task-empty">Не удалось связаться с сервером</li>`;
    }
  },

  renderWeek(days) {
    const strip = $("#week-strip");
    strip.innerHTML = "";
    days.forEach((d) => {
      const btn = document.createElement("button");
      btn.className = "day-btn"
        + (d.date === this.selected ? " active" : "")
        + (d.is_today && d.date !== this.selected ? " today" : "");
      btn.innerHTML =
        `<span class="d-label">${d.label}</span>` +
        `<span class="d-num">${d.day_num}</span>` +
        `<span class="d-dot">${d.total > 0 ? "<i></i>" : ""}</span>`;
      btn.addEventListener("click", () => this.select(d.date));
      strip.appendChild(btn);
    });
  },

  renderDay(day) {
    $("#day-title").textContent = formatLong(day.date);
    $("#day-summary").textContent = day.total === 0
      ? "Пока пусто — добавь первую задачу"
      : `${day.done} из ${day.total} выполнено`;

    const progress = $("#day-progress");
    progress.hidden = day.total === 0;
    $("#progress-fill").style.width = day.percent + "%";
    $("#progress-pct").textContent = day.percent + "%";

    const list = $("#task-list");
    list.innerHTML = "";
    if (day.tasks.length === 0) {
      const li = document.createElement("li");
      li.className = "task-empty";
      li.textContent = "Свободный день — или отличное время что-то запланировать";
      list.appendChild(li);
      return;
    }
    day.tasks.forEach((t) => {
      const li = document.createElement("li");
      li.innerHTML =
        `<input type="checkbox" ${t.done ? "checked" : ""}>` +
        `<span class="task-text ${t.done ? "done" : ""}">${escapeHtml(t.text)}</span>` +
        `<button class="task-del" title="Удалить задачу">&#10005;</button>`;
      li.querySelector("input").addEventListener("change", async (e) => {
        await api(`/api/tasks/${t.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ done: e.target.checked }),
        });
        this.load();
      });
      li.querySelector(".task-del").addEventListener("click", async () => {
        await api(`/api/tasks/${t.id}`, { method: "DELETE" });
        this.load();
      });
      list.appendChild(li);
    });
  },

  renderChart(days, avg) {
    const chart = $("#week-chart");
    chart.innerHTML = "";
    days.forEach((d) => {
      const col = document.createElement("button");
      col.className = "chart-col" + (d.date === this.selected ? " active" : "");
      col.title = `${d.label}: ${d.percent}%`;
      col.innerHTML =
        `<span class="chart-pct">${d.total > 0 ? d.percent + "%" : ""}</span>` +
        `<span class="chart-track"><span class="chart-fill" style="height:${d.percent}%"></span></span>` +
        `<span class="chart-label">${d.label}</span>`;
      col.addEventListener("click", () => this.select(d.date));
      chart.appendChild(col);
    });
    $("#week-avg").textContent = avg + "%";
  },

  select(date) {
    this.selected = date;
    this.load();
  },

  init() {
    $("#date-picker").addEventListener("change", (e) => {
      if (e.target.value) this.select(e.target.value);
    });
    const input = $("#task-input");
    const btn = $("#task-add");
    input.addEventListener("input", () => { btn.disabled = !input.value.trim(); });
    btn.disabled = true;
    $("#task-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      await api("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: this.selected, text }),
      });
      input.value = "";
      btn.disabled = true;
      this.load();
    });
  },
};

/* ================= ФОКУС (Pomodoro) ================= */

const Focus = {
  phase: "setup",   // setup | work | break
  workMin: 25,
  breakMin: 5,
  left: 0,
  paused: false,
  interval: null,
  audios: {},

  init() {
    $("#focus-start").addEventListener("click", () => this.start());
    $("#focus-pause").addEventListener("click", () => this.pauseToggle());
    $("#focus-stop").addEventListener("click", () => this.stop());
    document.querySelectorAll(".sound-btn").forEach((btn) => {
      const audio = new Audio(btn.dataset.src);
      audio.loop = true;
      audio.volume = 0.55;
      audio.addEventListener("error", () => {
        btn.disabled = true;
        btn.title = "Файл не найден — положи его в frontend/media";
      });
      this.audios[btn.dataset.sound] = audio;
      btn.addEventListener("click", () => this.toggleSound(btn));
    });
  },

  start() {
    this.workMin = clamp(parseInt($("#work-min").value) || 25, 1, 180);
    this.breakMin = clamp(parseInt($("#break-min").value) || 5, 1, 60);
    this.phase = "work";
    this.left = this.workMin * 60;
    this.paused = false;
    $("#focus-setup").hidden = true;
    $("#focus-session").hidden = false;
    this.showToast("Фокус-сессия началась. Удачной работы!");
    clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), 1000);
    this.render();
  },

  tick() {
    if (this.paused) return;
    this.left -= 1;
    if (this.left <= 0) {
      if (this.phase === "work") {
        this.phase = "break";
        this.left = this.breakMin * 60;
        this.showToast("Время сделать небольшой перерыв — потянись, выпей воды");
      } else {
        this.phase = "work";
        this.left = this.workMin * 60;
        this.showToast("Перерыв окончен — возвращаемся к делу");
      }
    }
    this.render();
  },

  render() {
    const isBreak = this.phase === "break";
    $("#focus-session").classList.toggle("break", isBreak);
    $("#timer").textContent = formatTime(this.left);
    $("#phase-label").innerHTML =
      `<span class="dot"></span>${isBreak ? "Перерыв — отдохни" : "Фокус — работаем"}`;
    $("#timer-sub").textContent = isBreak
      ? `следующая фокус-фаза — ${this.workMin} мин`
      : `перерыв через ${formatTime(this.left)} · длина ${this.breakMin} мин`;
    $("#focus-pause").textContent = this.paused ? "Продолжить" : "Пауза";
  },

  pauseToggle() {
    this.paused = !this.paused;
    this.render();
  },

  stop() {
    clearInterval(this.interval);
    this.phase = "setup";
    this.paused = false;
    Object.values(this.audios).forEach((a) => a.pause());
    document.querySelectorAll(".sound-btn").forEach((b) => b.classList.remove("on"));
    $("#focus-session").hidden = true;
    $("#focus-setup").hidden = false;
  },

  toggleSound(btn) {
    const audio = this.audios[btn.dataset.sound];
    if (btn.classList.contains("on")) {
      btn.classList.remove("on");
      audio.pause();
    } else {
      btn.classList.add("on");
      audio.play().catch(() => {});
    }
  },

  showToast(msg) {
    $("#toast-text").textContent = msg;
    const toast = $("#toast");
    toast.hidden = false;
    toast.classList.remove("show");
    void toast.offsetWidth; // перезапуск CSS-анимации
    toast.classList.add("show");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { toast.hidden = true; }, 6200);
    chime();
  },
};

/* мягкий «колокольчик» через WebAudio */
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + i * 0.18 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 1.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 1.5);
    });
    setTimeout(() => ctx.close(), 2500);
  } catch (e) { /* звук недоступен — не критично */ }
}

/* ================= СТАРТ ================= */

Tasks.init();
Focus.init();
renderRoute();
