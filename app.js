/* =================================================================
 * Smart Mushroom Farm — Master UI state engine
 * ================================================================= */

(() => {
  "use strict";

  const API = "api.php";
  const POLL_INTERVAL_MS = 8000;
  const ALERT_CYCLE_MS = 4500;
  const MANUAL_RESUME_MS = 15000;
  const CCTV_CACHE_VERSION = "20260524";
  const USE_SINGLE_DUMMY_CCTV_IMAGE = true;
  const ACTION_LOG_KEY = "mushroomFarmActionLog";

  const APP_PAGES = ["dashboard", "diagnostics", "logging"];

  const PHASES = [
    "seeding",
    "colonisation",
    "initiation",
    "fruiting",
    "harvest",
  ];
  const PHASE_LABEL = {
    seeding: "Seeding",
    colonisation: "Colonisation",
    initiation: "Initiation",
    fruiting: "Fruiting",
    harvest: "Harvest",
  };

  const state = {
    activeRoomId: null,
    activeRoomMeta: null,
    roomData: null,
    alerts: [],
    alertIdx: 0,
    alertMode: "auto",
    alertTimer: null,
    resumeTimer: null,
    pollTimer: null,
  };

  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));

  const els = {
    themeToggle: $("#themeToggle"),
    appNavItems: $$(".topbar-nav-item"),

    appViews: $$(".app-view"),

    logList: $("#logList"),
    clearLogsBtn: $("#clearLogsBtn"),

    alertTrack: $("#alertTrack"),
    alertPrev: $("#alertPrev"),
    alertNext: $("#alertNext"),
    alertMode: $("#alertMode"),

    roomTabs: $$(".room-tab"),
    roomHeader: $("#activeRoomHeader"),

    kpiCards: {
      temperature: $('.kpi-card[data-kpi="temperature"]'),
      humidity: $('.kpi-card[data-kpi="humidity"]'),
      lighting: $('.kpi-card[data-kpi="lighting"]'),
      co2: $('.kpi-card[data-kpi="co2"]'),
      airflow: $('.kpi-card[data-kpi="airflow"]'),
      cycle: $('.kpi-card[data-kpi="cycle"]'),
    },

    cycleBar: $("#cycleBar"),
    phaseBtn: $("#phaseActionBtn"),
    overdueBadge: $("#overdueBadge"),
    cycleDue: $("#cycleDue"),

    thrForm: $("#thresholdForm"),
    thrStatus: $("#thrStatus"),

    cctvCells: $$(".cctv-cell"),
    cctvModal: $("#cctvModal"),
    cctvClose: $("#cctvClose"),
    modalTitle: $("#modalTitle"),
    modalFeed: $("#modalFeed"),

    clock: $("#clock"),
    lastSync: $("#lastSync"),
  };

  const fmt = {
    num: (v, d = 1) =>
      v === null || v === undefined || v === "" ? "--" : Number(v).toFixed(d),
    int: (v) =>
      v === null || v === undefined ? "--" : Math.round(v).toString(),
    time: (ts) => {
      if (!ts) return "";
      const d =
        typeof ts === "string" ? new Date(ts.replace(" ", "T")) : new Date(ts);
      return d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    },
    date: (ts) => {
      if (!ts) return "—";
      const d = new Date(ts.replace(" ", "T"));
      return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    },
  };

  function escapeHtml(s) {
    return String(s ?? "").replace(
      /([&<>"'])/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "<",
          ">": ">",
          '"': '"',
          "'": "&#39;",
        })[c],
    );
  }

  function setActiveNav(viewName) {
    if (!APP_PAGES.includes(viewName)) return;

    els.appViews.forEach((view) => {
      view.classList.toggle("hidden", view.dataset.view !== viewName);
    });

    els.appNavItems.forEach((btn) => {
      btn.setAttribute(
        "aria-current",
        btn.dataset.nav === viewName ? "page" : "false",
      );
    });
  }

  els.appNavItems.forEach((btn) => {
    btn.addEventListener("click", () => setActiveNav(btn.dataset.nav));
  });

  function getActionLogs() {
    try {
      return JSON.parse(localStorage.getItem(ACTION_LOG_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function formatLogTime(date = new Date()) {
    const two = (value) => String(value).padStart(2, "0");
    return `${two(date.getHours())}:${two(date.getMinutes())} ${two(date.getDate())}-${two(
      date.getMonth() + 1,
    )}-${date.getFullYear()}`;
  }

  function addActionLog(message) {
    const logs = getActionLogs();
    logs.unshift({
      message,
      timestamp: new Date().toISOString(),
      displayTime: formatLogTime(),
    });
    localStorage.setItem(ACTION_LOG_KEY, JSON.stringify(logs.slice(0, 80)));
    renderActionLogs();
  }

  function renderActionLogs() {
    if (!els.logList) return;
    const logs = getActionLogs();

    if (!logs.length) {
      els.logList.innerHTML = `
        <div class="log-empty">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>No user actions logged yet.</span>
        </div>`;
      return;
    }

    els.logList.innerHTML = logs
      .map(
        (log) => `
        <article class="log-entry">
          <i class="fa-solid fa-circle-check"></i>
          <div>
            <strong>${escapeHtml(log.message)}</strong>
            <time>at ${escapeHtml(log.displayTime || formatLogTime(new Date(log.timestamp)))}</time>
          </div>
        </article>`,
      )
      .join("");
  }

  els.clearLogsBtn?.addEventListener("click", () => {
    localStorage.removeItem(ACTION_LOG_KEY);
    renderActionLogs();
  });

  async function apiGet(action, params = {}) {
    const url = new URL(API, window.location.href);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { cache: "no-store" });
    return res.json();
  }

  async function apiPost(action, body = {}) {
    const url = new URL(API, window.location.href);
    url.searchParams.set("action", action);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  function tickClock() {
    if (!els.clock) return;
    els.clock.innerHTML = `<i class="fa-regular fa-clock"></i> ${new Date().toLocaleTimeString()}`;
  }
  setInterval(tickClock, 1000);
  tickClock();

  function renderAlertItem(a) {
    const sev = (a.severity || "info").toLowerCase();
    const icon =
      sev === "danger"
        ? "fa-triangle-exclamation"
        : sev === "warning"
          ? "fa-circle-exclamation"
          : "fa-circle-info";

    const room = a.mushroom_type
      ? `Room ${a.room_number} · ${a.mushroom_type}`
      : "";

    return `
      <div class="alert-item active sev-${sev}">
        <i class="severity-icon fa-solid ${icon}"></i>
        <div class="alert-meta">
          <span class="msg">${escapeHtml(a.alert_message)}</span>
          <span class="sub">${escapeHtml(room)} · ${fmt.date(a.timestamp)}</span>
        </div>
      </div>`;
  }

  function showAlert(idx) {
    if (!els.alertTrack) return;

    if (!state.alerts.length) {
      els.alertTrack.innerHTML = `
        <div class="alert-item placeholder">
          <i class="fa-solid fa-leaf"></i>
          <span>All clear — no active alerts.</span>
        </div>`;
      return;
    }

    state.alertIdx =
      ((idx % state.alerts.length) + state.alerts.length) % state.alerts.length;
    els.alertTrack.innerHTML = renderAlertItem(state.alerts[state.alertIdx]);
  }

  function startAutoCycle() {
    stopAutoCycle();
    if (state.alerts.length <= 1) return;
    state.alertTimer = setInterval(
      () => showAlert(state.alertIdx + 1),
      ALERT_CYCLE_MS,
    );
  }

  function stopAutoCycle() {
    if (state.alertTimer) {
      clearInterval(state.alertTimer);
      state.alertTimer = null;
    }
  }

  function setMode(mode) {
    state.alertMode = mode;
    if (els.alertMode) {
      els.alertMode.textContent = mode.toUpperCase();
      els.alertMode.classList.toggle("manual", mode === "manual");
    }
    if (mode === "auto") startAutoCycle();
    else stopAutoCycle();
  }

  function scheduleAutoResume() {
    if (state.resumeTimer) clearTimeout(state.resumeTimer);
    state.resumeTimer = setTimeout(() => setMode("auto"), MANUAL_RESUME_MS);
  }

  function manualNav(dir) {
    setMode("manual");
    showAlert(state.alertIdx + dir);
    scheduleAutoResume();
  }

  els.alertPrev?.addEventListener("click", () => manualNav(-1));
  els.alertNext?.addEventListener("click", () => manualNav(+1));
  els.alertMode?.addEventListener("click", () =>
    setMode(state.alertMode === "auto" ? "manual" : "auto"),
  );

  async function refreshAlerts() {
    try {
      const r = await apiGet("get_all_alerts");
      if (!r.success) return;
      state.alerts = r.alerts || [];

      if (state.alertMode === "auto") {
        showAlert(state.alertIdx);
        startAutoCycle();
      } else if (!state.alerts.length) {
        showAlert(0);
      }
    } catch (e) {
      console.warn("alerts refresh failed", e);
    }
  }

  function machineText(kind, val, thr) {
    if (val === null || val === undefined) return ["—", ""];
    const v = Number(val);

    switch (kind) {
      case "temperature":
        if (v < +thr.temp_min) return ["Heater is turned ON", "state-on"];
        if (v > +thr.temp_max)
          return ["Cooling Fan is turned ON", "state-warn"];
        return ["Fan is idle", ""];
      case "humidity":
        if (v < +thr.humidity_min)
          return ["Humidifier is turned ON", "state-on"];
        if (v > +thr.humidity_max)
          return ["Passive vent engaged", "state-warn"];
        return ["Humidifier is idle", ""];
      case "lighting":
        if (v < +thr.light_min) return ["Grow lights are ON", "state-on"];
        if (v > +thr.light_max) return ["Lights dimmed", "state-warn"];
        return ["Lighting optimal", ""];
      case "co2":
        if (v > +thr.co2_max) return ["Exhaust fan is ON", "state-alert"];
        if (v < +thr.co2_min) return ["CO₂ below baseline", "state-warn"];
        return ["CO₂ levels balanced", ""];
      case "airflow":
        if (v < +thr.airflow_min) return ["Ventilation is ON", "state-on"];
        if (v > +thr.airflow_max)
          return ["Ventilation throttled", "state-warn"];
        return ["Airflow is steady", ""];
    }

    return ["—", ""];
  }

  function paintKpi(card, value, unit, range, state_text, state_class) {
    if (!card) return;
    card.querySelector(".kpi-value .num").textContent = value;
    if (unit) card.querySelector(".kpi-value small").textContent = unit;
    card.querySelector(".kpi-range .rng").textContent = range;

    const f = card.querySelector(".machine-state");
    if (!f) return;

    f.textContent = state_text;
    f.classList.remove("state-on", "state-warn", "state-alert");
    if (state_class) f.classList.add(state_class);
  }

  function paintCycle(cycle) {
    const lis = $$("#phaseTrack li");
    const curIdx = PHASES.indexOf(cycle.current_phase);

    lis.forEach((li, i) => {
      li.classList.remove("done", "active", "overdue");
      if (i < curIdx) li.classList.add("done");
      if (i === curIdx) {
        li.classList.add("active");
        if (cycle.is_overdue) li.classList.add("overdue");
      }
    });

    if (els.cycleDue && cycle.phase_due_date) {
      const due = new Date(cycle.phase_due_date.replace(" ", "T"));
      els.cycleDue.textContent =
        (cycle.is_overdue ? "Overdue · " : "Due ") + due.toLocaleString();
      els.cycleDue.classList.toggle("due-overdue", !!cycle.is_overdue);
    }

    els.overdueBadge?.classList.toggle("hidden", !cycle.is_overdue);

    const btn = els.phaseBtn;
    if (!btn) return;

    btn.classList.remove("btn-danger", "btn-moss");
    if (cycle.current_phase === "harvest") {
      btn.dataset.mode = "restart";
      btn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> <span>Restart Cycle</span>`;
      btn.classList.add("btn-moss");
    } else {
      btn.dataset.mode = "advance";
      const label = `Done ${PHASE_LABEL[cycle.current_phase].toLowerCase()} phase`;
      btn.innerHTML = `<i class="fa-solid fa-arrow-right"></i> <span>${label}</span>`;
      if (cycle.is_overdue) btn.classList.add("btn-danger");
    }
  }

  els.phaseBtn?.addEventListener("click", async () => {
    if (!state.activeRoomId) return;
    const mode = els.phaseBtn.dataset.mode;
    const currentPhase = state.roomData?.cycle?.current_phase;
    const roomNumber = state.activeRoomMeta?.room_number ?? state.activeRoomId;
    const phaseLabel = PHASE_LABEL[currentPhase] || "growth";

    els.phaseBtn.disabled = true;
    try {
      const action = mode === "restart" ? "restart_cycle" : "advance_phase";
      const r = await apiPost(action, { room_id: state.activeRoomId });
      if (!r.success) alert(r.error || "Failed");
      else {
        addActionLog(
          mode === "restart"
            ? `Restarted cycle for Room ${roomNumber}`
            : `Done ${phaseLabel.toLowerCase()} phase for Room ${roomNumber}`,
        );
      }
      await loadRoom(state.activeRoomId);
      await refreshAlerts();
    } finally {
      els.phaseBtn.disabled = false;
    }
  });

  function fillThresholds(thr) {
    if (!thr || !els.thrForm) return;
    const f = els.thrForm;
    [
      "temp_min",
      "temp_max",
      "humidity_min",
      "humidity_max",
      "light_min",
      "light_max",
      "co2_min",
      "co2_max",
      "airflow_min",
      "airflow_max",
    ].forEach((k) => {
      if (f.elements[k]) f.elements[k].value = thr[k];
    });
  }

  els.thrForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.activeRoomId) return;

    const fd = new FormData(els.thrForm);
    const body = { room_id: state.activeRoomId };
    for (const [k, v] of fd.entries()) body[k] = parseFloat(v);

    els.thrStatus?.classList.remove("err");
    if (els.thrStatus) els.thrStatus.textContent = "Saving…";

    try {
      const r = await apiPost("update_thresholds", body);
      if (r.success) {
        if (els.thrStatus) els.thrStatus.textContent = "✓ Thresholds saved.";
        addActionLog(
          `Saved thresholds for Room ${state.activeRoomMeta?.room_number ?? state.activeRoomId}`,
        );
        await loadRoom(state.activeRoomId);
        await refreshAlerts();
      } else {
        els.thrStatus?.classList.add("err");
        if (els.thrStatus)
          els.thrStatus.textContent = "⚠ " + (r.error || "Failed");
      }
    } catch {
      els.thrStatus?.classList.add("err");
      if (els.thrStatus) els.thrStatus.textContent = "⚠ Network error.";
    }

    setTimeout(() => {
      if (els.thrStatus) els.thrStatus.textContent = "";
    }, 4000);
  });

  function cctvImageFor(roomNumber = 1, zone = 1) {
    if (USE_SINGLE_DUMMY_CCTV_IMAGE) {
      return `images/image_01_01.png?v=${CCTV_CACHE_VERSION}`;
    }

    const roomPart = String(roomNumber || 1).padStart(2, "0");
    const zonePart = String(zone || 1).padStart(2, "0");
    return `images/image_${roomPart}_${zonePart}.png?v=${CCTV_CACHE_VERSION}`;
  }

  function paintCctvFeeds() {
    els.cctvCells.forEach((cell) => {
      const feed = $(".cctv-feed", cell);
      if (!feed) return;
      feed.style.backgroundImage = `url("${cctvImageFor(state.activeRoomMeta?.room_number, cell.dataset.zone)}")`;
    });
  }

  function openCctv(zone) {
    if (!els.modalTitle || !els.modalFeed || !els.cctvModal) return;
    els.modalTitle.textContent = `Zone 0${zone} — Room ${state.activeRoomMeta?.room_number ?? "?"} · ${state.activeRoomMeta?.mushroom_type ?? ""}`;
    els.modalFeed.style.backgroundImage = `url("${cctvImageFor(state.activeRoomMeta?.room_number, zone)}")`;
    els.cctvModal.classList.remove("hidden");
  }

  function closeCctv() {
    els.cctvModal?.classList.add("hidden");
  }

  els.cctvCells.forEach((cell) => {
    cell.addEventListener("click", () => openCctv(cell.dataset.zone));
    cell.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCctv(cell.dataset.zone);
      }
    });
  });

  els.cctvClose?.addEventListener("click", closeCctv);
  els.cctvModal?.addEventListener("click", (e) => {
    if (e.target === els.cctvModal) closeCctv();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCctv();
  });

  async function loadRoom(roomId) {
    state.activeRoomId = roomId;

    els.roomTabs.forEach((t) => {
      const active = parseInt(t.dataset.roomId, 10) === roomId;
      t.classList.toggle("active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });

    try {
      const r = await apiGet("get_room_data", { room_id: roomId });
      if (r.success) paintRoom(r);
      else console.warn(r.error);
    } catch (e) {
      console.warn("room load failed", e);
    }
  }

  function paintRoom(data) {
    state.roomData = data;
    state.activeRoomMeta = data.room;

    const r = data.room;
    const env = data.env;
    const thr = data.thresholds;
    const cycle = data.cycle;

    if (els.roomHeader) {
      els.roomHeader.innerHTML = `
        <i class="fa-solid fa-warehouse"></i>
        Incubation Room ${r.room_number}
        <span class="mushroom-tag"><i class="fa-solid fa-seedling"></i> ${escapeHtml(r.mushroom_type)}</span>
      `;
    }

    let [t, c] = machineText("temperature", env.temperature, thr);
    paintKpi(
      els.kpiCards.temperature,
      fmt.num(env.temperature, 1),
      "°C",
      `${thr.temp_min}–${thr.temp_max} °C`,
      t,
      c,
    );

    [t, c] = machineText("humidity", env.humidity, thr);
    paintKpi(
      els.kpiCards.humidity,
      fmt.num(env.humidity, 1),
      "%",
      `${thr.humidity_min}–${thr.humidity_max} %`,
      t,
      c,
    );

    [t, c] = machineText("lighting", env.lighting, thr);
    paintKpi(
      els.kpiCards.lighting,
      fmt.int(env.lighting),
      "Lux",
      `${thr.light_min}–${thr.light_max}`,
      t,
      c,
    );

    [t, c] = machineText("co2", env.co2_level, thr);
    paintKpi(
      els.kpiCards.co2,
      fmt.int(env.co2_level),
      "ppm",
      `${thr.co2_min}–${thr.co2_max}`,
      t,
      c,
    );

    [t, c] = machineText("airflow", env.air_flow, thr);
    paintKpi(
      els.kpiCards.airflow,
      fmt.num(env.air_flow, 1),
      "m³/h",
      `${thr.airflow_min}–${thr.airflow_max}`,
      t,
      c,
    );

    const cd = parseInt(env.cycle_day_current || 1, 10);
    const ct = parseInt(env.cycle_day_total || 35, 10);
    const cycCard = els.kpiCards.cycle;

    if (cycCard) {
      cycCard.querySelector(".kpi-value .num").textContent = `Day ${cd}`;
      cycCard.querySelector(".kpi-value small").textContent = `/ ${ct}`;
      if (els.cycleBar)
        els.cycleBar.style.width = Math.min(100, (cd / ct) * 100) + "%";

      const cf = cycCard.querySelector(".machine-state");
      if (cf) {
        cf.textContent = `Phase: ${PHASE_LABEL[cycle.current_phase] || "—"}`;
        cf.classList.remove("state-on", "state-warn", "state-alert");
        if (cycle.is_overdue) cf.classList.add("state-alert");
        else cf.classList.add("state-on");
      }
    }

    fillThresholds(thr);
    paintCycle(cycle);
    paintCctvFeeds();

    if (els.lastSync)
      els.lastSync.textContent =
        "last sync " + fmt.time(env.last_updated || new Date());
  }

  els.roomTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const id = parseInt(tab.dataset.roomId, 10);
      if (id !== state.activeRoomId) loadRoom(id);
    });
  });

  function startPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(async () => {
      if (state.activeRoomId) await loadRoom(state.activeRoomId);
      await refreshAlerts();
    }, POLL_INTERVAL_MS);
  }

  function initTheme() {
    const saved = localStorage.getItem("mushroomFarmTheme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon(saved);
  }

  function updateThemeIcon(theme) {
    if (!els.themeToggle) return;
    const icon = els.themeToggle.querySelector("i");
    if (theme === "light") {
      icon.className = "fa-solid fa-sun";
    } else {
      icon.className = "fa-solid fa-moon";
    }
  }

  els.themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("mushroomFarmTheme", next);
    updateThemeIcon(next);
  });

  (async function init() {
    initTheme();
    setActiveNav("dashboard");

    renderActionLogs();
    setMode("auto");

    const firstTab = els.roomTabs[0];
    if (firstTab) {
      const firstId = parseInt(firstTab.dataset.roomId, 10);
      await loadRoom(firstId);
      await refreshAlerts();
      startPolling();
    }
  })();
})();
