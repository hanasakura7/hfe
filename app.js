(() => {
  "use strict";

  const API = "api.php";
  const POLL_INTERVAL_MS = 8000;
  const ALERT_CYCLE_MS = 4500;
  const MANUAL_RESUME_MS = 15000;
  const CCTV_CACHE_VERSION = "20260524";
  const ACTION_LOG_KEY = "mushroomFarmActionLog";
  const CURRENT_OPERATOR = "Operator A";
  const APP_PAGES = ["dashboard", "diagnostics", "logs", "analytics"];
  const PHASES = ["seeding", "colonisation", "initiation", "fruiting", "harvest"];

  const PHASE_LABEL = {
    seeding: "Seeding",
    colonisation: "Colonisation",
    initiation: "Initiation",
    fruiting: "Fruiting",
    harvest: "Harvest",
  };

  const PHASE_GUIDANCE = {
    seeding: {
      guide: "Confirm clean bags, stable substrate temperature, and labelled batch trays before advancing.",
      ranges: "Target: 20-24 C, 85-95% RH, low light, CO2 500-1000 ppm.",
    },
    colonisation: {
      guide: "Keep disturbance low, inspect for contamination, and avoid unnecessary lighting changes.",
      ranges: "Target: 22-26 C, 88-96% RH, low light, CO2 600-1100 ppm.",
    },
    initiation: {
      guide: "Increase fresh air exchange and verify humidity recovery after each ventilation cycle.",
      ranges: "Target: 20-24 C, 90-96% RH, moderate light, CO2 500-900 ppm.",
    },
    fruiting: {
      guide: "Watch cap formation, keep humidity stable, and respond quickly to CO2 spikes.",
      ranges: "Target: 19-23 C, 88-95% RH, 250-550 lux, CO2 below 900 ppm.",
    },
    harvest: {
      guide: "Complete maturity inspection, record yield, clean trays, and reset only after supervisor check.",
      ranges: "Target: stable humidity, clean airflow, and no unresolved critical equipment faults.",
    },
  };

  const MOCK_ROOMS = [
    { id: 1, room: 1, type: "Grey Oyster", status: "Critical", temp: 25.8, humidity: 91, co2: 1280, airflow: 18, lighting: 420, maintenance: "Exhaust fan inspection due" },
    { id: 2, room: 2, type: "Black Jelly", status: "Warning", temp: 23.6, humidity: 87, co2: 820, airflow: 20, lighting: 260, maintenance: "Humidifier filter due tomorrow" },
    { id: 3, room: 3, type: "White Oyster", status: "Normal", temp: 21.4, humidity: 92, co2: 680, airflow: 22, lighting: 360, maintenance: "No open maintenance" },
  ];

  const MOCK_ALERTS = [
    {
      severity: "danger",
      room_number: 1,
      mushroom_type: "Grey Oyster",
      alert_message: "CO2 high -> exhaust fan activated.",
      timestamp: new Date().toISOString(),
      response: "Check exhaust fan in Room 1, verify airflow path, and inspect intake vent.",
    },
    {
      severity: "warning",
      room_number: 2,
      mushroom_type: "Black Jelly",
      alert_message: "Humidity low -> humidifier running in auto mode.",
      timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
      response: "Check misting line pressure and confirm water tank level.",
    },
    {
      severity: "info",
      room_number: 3,
      mushroom_type: "White Oyster",
      alert_message: "Lighting above target -> light array dimmed.",
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      response: "Inspect light timer settings during the next routine round.",
    },
  ];

  const MOCK_TRENDS = {
    Temperature: [21, 22, 23, 25, 24, 26, 25],
    Humidity: [92, 91, 88, 86, 89, 91, 93],
    CO2: [620, 720, 910, 1180, 1260, 1040, 880],
    Airflow: [22, 21, 19, 18, 17, 20, 22],
    Lighting: [240, 250, 290, 520, 480, 430, 310],
  };

  const MOCK_EQUIPMENT = [
    { type: "system", icon: "fa-server", name: "Controller Gateway", status: "Healthy", detail: "CPU 12%, storage 74% free", due: "Inspect 29-05-2026", className: "state-on" },
    { type: "system", icon: "fa-wifi", name: "Telemetry Link", status: "Healthy", detail: "Packet loss 0.01%", due: "Inspect 31-05-2026", className: "state-on" },
    { type: "system", icon: "fa-bolt", name: "Backup Power UPS", status: "Critical", detail: "Battery Cell #3 fault", due: "Repair today", className: "state-alert" },
    { type: "equipment", icon: "fa-fan", name: "Ventilation Fans", status: "Operational", detail: "6 units online, Room 1 exhaust flagged", due: "Service 27-05-2026", className: "state-warn" },
    { type: "equipment", icon: "fa-faucet-drip", name: "Humidifiers", status: "Maintenance Needed", detail: "HM-03 valve error history: 2 faults", due: "Service today", className: "state-alert" },
    { type: "equipment", icon: "fa-lightbulb", name: "Grow Light Arrays", status: "Degraded", detail: "Array-R2 flicker detected", due: "Inspect 28-05-2026", className: "state-warn" },
    { type: "equipment", icon: "fa-temperature-half", name: "Sensor Health", status: "Healthy", detail: "All probes reporting within 8 seconds", due: "Calibrate 02-06-2026", className: "state-on" },
  ];

  const state = {
    activeRoomId: null,
    activeRoomMeta: null,
    roomData: null,
    alerts: MOCK_ALERTS,
    alertIdx: 0,
    alertMode: "auto",
    alertTimer: null,
    resumeTimer: null,
    pollTimer: null,
    lastFocus: null,
    acknowledgedAlerts: new Set(),
  };

  const $ = (q, r = document) => r.querySelector(q);
  const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
  const els = {
    themeToggle: $("#themeToggle"),
    sidebarToggle: $("#sidebarToggle"),
    sidebar: $(".sidebar"),
    appShell: $(".app-shell"),
    appNavItems: $$(".sidebar-nav-item"),
    appViews: $$(".app-view"),
    logList: $("#logList"),
    clearLogsBtn: $("#clearLogsBtn"),
    alertTrack: $("#alertTrack"),
    alertPrev: $("#alertPrev"),
    alertNext: $("#alertNext"),
    alertMode: $("#alertMode"),
    automationGrid: $("#automationGrid"),
    phaseGuidance: $("#phaseGuidance"),
    phaseRangeCard: $("#phaseRangeCard"),
    alertResponseList: $("#alertResponseList"),
    roomComparison: $("#roomComparison"),
    trendGrid: $("#trendGrid"),
    systemHealthList: $("#systemHealthList"),
    equipmentConditionList: $("#equipmentConditionList"),
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
    num: (v, d = 1) => v === null || v === undefined || v === "" ? "--" : Number(v).toFixed(d),
    int: (v) => v === null || v === undefined ? "--" : Math.round(v).toString(),
    time: (ts) => {
      if (!ts) return "";
      const d = typeof ts === "string" ? new Date(ts.replace(" ", "T")) : new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    },
    date: (ts) => {
      if (!ts) return "-";
      const d = typeof ts === "string" ? new Date(ts.replace(" ", "T")) : new Date(ts);
      return d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    },
  };

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[c]);
  }

  function apiGet(action, params = {}) {
    const url = new URL(API, window.location.href);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return fetch(url.toString(), { cache: "no-store" }).then((res) => res.json());
  }

  function apiPost(action, body = {}) {
    const url = new URL(API, window.location.href);
    url.searchParams.set("action", action);
    return fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((res) => res.json());
  }

  function setActiveNav(viewName) {
    if (!APP_PAGES.includes(viewName)) return;
    els.appViews.forEach((view) => view.classList.toggle("hidden", view.dataset.view !== viewName));
    els.appNavItems.forEach((btn) => {
      btn.setAttribute("aria-current", btn.dataset.nav === viewName ? "page" : "false");
    });
  }

  function tickClock() {
    if (els.clock) els.clock.innerHTML = `<i class="fa-regular fa-clock"></i> ${new Date().toLocaleTimeString()}`;
  }

  function getActionLogs() {
    try {
      return JSON.parse(localStorage.getItem(ACTION_LOG_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function formatLogTime(date = new Date()) {
    const two = (value) => String(value).padStart(2, "0");
    return `${two(date.getHours())}:${two(date.getMinutes())} ${two(date.getDate())}-${two(date.getMonth() + 1)}-${date.getFullYear()}`;
  }

  function addActionLog(message) {
    const logs = getActionLogs();
    logs.unshift({
      message,
      operator: CURRENT_OPERATOR,
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
    els.logList.innerHTML = logs.map((log) => `
      <article class="log-entry">
        <i class="fa-solid fa-circle-check"></i>
        <div>
          <strong>${escapeHtml(log.message)}</strong>
          <time>${escapeHtml(log.operator || CURRENT_OPERATOR)} · ${escapeHtml(log.displayTime || formatLogTime(new Date(log.timestamp)))}</time>
        </div>
      </article>`).join("");
  }

  function recommendResponse(a) {
    if (a.response) return a.response;
    const msg = String(a.alert_message || "").toLowerCase();
    const room = a.room_number ? `Room ${a.room_number}` : "the affected room";
    if (msg.includes("co")) return `Check exhaust fan and ventilation path in ${room}.`;
    if (msg.includes("humidity")) return `Check humidifier, misting line, and water supply in ${room}.`;
    if (msg.includes("temperature")) return `Inspect heater/cooling fan and door seal in ${room}.`;
    if (msg.includes("light")) return `Verify grow light timer and dimmer state in ${room}.`;
    if (msg.includes("air flow")) return `Inspect fan speed and blocked intake in ${room}.`;
    return `Inspect ${room} and acknowledge the condition after correction.`;
  }

  function alertKey(a) {
    return `${a.room_number}-${a.alert_message}`;
  }

  function activeAlerts() {
    return state.alerts.filter(a => !state.acknowledgedAlerts.has(alertKey(a)));
  }

  function acknowledgeAlert(key, roomNum, msg) {
    state.acknowledgedAlerts.add(key);
    addActionLog(`Acknowledged alert: "${msg}" for Room ${roomNum}`);

    const remaining = activeAlerts();
    if (remaining.length === 0) {
      // All clear — show empty state
      if (els.alertTrack) {
        els.alertTrack.innerHTML = `
          <div class="alert-item active sev-acknowledged">
            <i class="severity-icon fa-solid fa-circle-check"></i>
            <div class="alert-meta">
              <span class="msg" style="color:var(--moss);font-weight:600;">All alerts acknowledged</span>
              <span class="sub">No active alerts — system monitoring continues.</span>
            </div>
          </div>`;
      }
      stopAutoCycle();
    } else {
      // Move to next unacknowledged alert
      state.alertIdx = state.alertIdx % remaining.length;
      showAlert(state.alertIdx);
      if (state.alertMode === "auto") startAutoCycle();
    }
  }

  function renderAlertItem(a) {
    const sev = (a.severity || "info").toLowerCase();
    const icon = sev === "danger" ? "fa-triangle-exclamation" : sev === "warning" ? "fa-circle-exclamation" : "fa-circle-info";
    const room = a.mushroom_type ? `Room ${a.room_number} · ${a.mushroom_type}` : "";
    const key = alertKey(a);
    const isAcknowledged = state.acknowledgedAlerts.has(key);

    if (isAcknowledged) {
      return `
        <div class="alert-item active sev-acknowledged">
          <i class="severity-icon fa-solid fa-circle-check"></i>
          <div class="alert-meta">
            <span class="msg acknowledged-msg">${escapeHtml(a.alert_message)}</span>
            <span class="sub">${escapeHtml(room)} · ${fmt.date(a.timestamp)}</span>
            <span class="ack-badge"><i class="fa-solid fa-check"></i> Acknowledged — no further action needed</span>
          </div>
        </div>`;
    }

    return `
      <div class="alert-item active sev-${sev}">
        <i class="severity-icon fa-solid ${icon}"></i>
        <div class="alert-meta">
          <span class="msg">${escapeHtml(a.alert_message)}</span>
          <span class="sub">${escapeHtml(room)} · ${fmt.date(a.timestamp)}</span>
          <span class="sub"><strong>Response:</strong> ${escapeHtml(recommendResponse(a))}</span>
        </div>
        <button type="button" class="alert-ack-btn" data-ack-key="${escapeHtml(key)}" data-room="${a.room_number}" data-msg="${escapeHtml(a.alert_message)}">
          <i class="fa-solid fa-check"></i> Acknowledge
        </button>
      </div>`;
  }

  function showAlert(idx) {
    if (!els.alertTrack) return;
    const alerts = activeAlerts().length ? activeAlerts() : (state.alerts.length ? state.alerts : MOCK_ALERTS);
    state.alertIdx = ((idx % alerts.length) + alerts.length) % alerts.length;
    els.alertTrack.innerHTML = renderAlertItem(alerts[state.alertIdx]);
  }

  function startAutoCycle() {
    stopAutoCycle();
    if (activeAlerts().length > 1) state.alertTimer = setInterval(() => showAlert(state.alertIdx + 1), ALERT_CYCLE_MS);
  }

  function stopAutoCycle() {
    if (state.alertTimer) clearInterval(state.alertTimer);
    state.alertTimer = null;
  }

  function setMode(mode) {
    state.alertMode = mode;
    if (els.alertMode) {
      els.alertMode.textContent = mode.toUpperCase();
      els.alertMode.classList.toggle("manual", mode === "manual");
    }
    mode === "auto" ? startAutoCycle() : stopAutoCycle();
  }

  function scheduleAutoResume() {
    if (state.resumeTimer) clearTimeout(state.resumeTimer);
    state.resumeTimer = setTimeout(() => setMode("auto"), MANUAL_RESUME_MS);
  }

  async function refreshAlerts() {
    state.alerts = MOCK_ALERTS;
    const remaining = activeAlerts();
    if (remaining.length > 0) {
      showAlert(state.alertIdx);
      if (state.alertMode === "auto") startAutoCycle();
    }
  }

  function renderPriorityAlerts() {
    const critical = state.alerts.find((a) => (a.severity || "").toLowerCase() === "danger") || MOCK_ALERTS[0];
    if (els.criticalPriority) {
      const card = $(".priority-alert-card", els.criticalPriority);
      if (card) {
        card.innerHTML = `
          <strong><i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(critical.alert_message)}</strong>
          <span>${escapeHtml(`Recommended response: ${recommendResponse(critical)}`)}</span>`;
      }
    }
    if (els.alertResponseList) {
      els.alertResponseList.innerHTML = MOCK_ALERTS.map((a) => `
        <article class="response-card sev-${a.severity}">
          <div>
            <strong><i class="fa-solid ${a.severity === "danger" ? "fa-triangle-exclamation" : a.severity === "warning" ? "fa-circle-exclamation" : "fa-circle-info"}"></i> ${escapeHtml(a.alert_message)}</strong>
            <span>Room ${a.room_number} · ${escapeHtml(a.mushroom_type)} · ${fmt.date(a.timestamp)}</span>
            <p>${escapeHtml(a.response)}</p>
          </div>
          <button type="button" class="btn-secondary mock-action"><i class="fa-solid fa-check"></i> Acknowledge</button>
        </article>`).join("");
    }
  }

  function machineText(kind, val, thr) {
    if (val === null || val === undefined) return ["Unavailable", "state-warn"];
    const v = Number(val);
    switch (kind) {
      case "temperature":
        if (v < +thr.temp_min) return ["Low", "state-warn"];
        if (v > +thr.temp_max) return ["High", "state-alert"];
        return ["Stable", "state-on"];
      case "humidity":
        if (v < +thr.humidity_min) return ["Low", "state-warn"];
        if (v > +thr.humidity_max) return ["High", "state-alert"];
        return ["Stable", "state-on"];
      case "lighting":
        if (v < +thr.light_min) return ["Low", "state-warn"];
        if (v > +thr.light_max) return ["High", "state-warn"];
        return ["Optimal", "state-on"];
      case "co2":
        if (v > +thr.co2_max) return ["Critical", "state-alert"];
        if (v < +thr.co2_min) return ["Low", "state-warn"];
        return ["Normal", "state-on"];
      case "airflow":
        if (v < +thr.airflow_min) return ["Weak", "state-warn"];
        if (v > +thr.airflow_max) return ["High", "state-warn"];
        return ["Steady", "state-on"];
      default:
        return ["Unknown", "state-warn"];
    }
  }

  function paintKpi(card, value, unit, range, text, className) {
    if (!card) return;
    card.querySelector(".kpi-value .num").textContent = value;
    card.querySelector(".kpi-value small").textContent = unit;
    card.querySelector(".kpi-range .rng").textContent = range;
    const footer = card.querySelector(".machine-state");
    footer.innerHTML = `<span class="status-pill ${className}">${escapeHtml(text)}</span>`;
    footer.classList.remove("state-on", "state-warn", "state-alert");
    if (className) footer.classList.add(className);
  }

  const PHASE_PRESETS = {
    seeding:      { temp_min: 20, temp_max: 24, humidity_min: 85, humidity_max: 95, light_min: 150, light_max: 400, co2_min: 500,  co2_max: 1000, airflow_min: 15, airflow_max: 25 },
    colonisation: { temp_min: 22, temp_max: 26, humidity_min: 88, humidity_max: 96, light_min: 150, light_max: 400, co2_min: 600,  co2_max: 1100, airflow_min: 15, airflow_max: 25 },
    initiation:   { temp_min: 20, temp_max: 24, humidity_min: 90, humidity_max: 96, light_min: 300, light_max: 600, co2_min: 500,  co2_max: 900,  airflow_min: 18, airflow_max: 28 },
    fruiting:     { temp_min: 19, temp_max: 23, humidity_min: 88, humidity_max: 95, light_min: 250, light_max: 550, co2_min: 400,  co2_max: 900,  airflow_min: 18, airflow_max: 28 },
    harvest:      { temp_min: 20, temp_max: 24, humidity_min: 85, humidity_max: 95, light_min: 200, light_max: 500, co2_min: 500,  co2_max: 1000, airflow_min: 15, airflow_max: 25 },
  };

  function initSteppers() {
    if (!els.thrForm) return;

    // Wire quick preset buttons
    document.querySelectorAll(".thr-preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const preset = PHASE_PRESETS[btn.dataset.preset];
        if (!preset) return;
        Object.entries(preset).forEach(([k, v]) => {
          if (els.thrForm.elements[k]) els.thrForm.elements[k].value = v;
        });
        document.querySelectorAll(".thr-preset-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  function fillThresholds(thr) {
    if (!thr || !els.thrForm) return;
    ["temp_min", "temp_max", "humidity_min", "humidity_max", "light_min", "light_max", "co2_min", "co2_max", "airflow_min", "airflow_max"]
      .forEach((k) => {
        if (els.thrForm.elements[k]) els.thrForm.elements[k].value = thr[k];
      });
  }

  function paintCycle(cycle) {
    const current = cycle.current_phase || "fruiting";
    const curIdx = PHASES.indexOf(current);
    $$("#phaseTrack li").forEach((li, i) => {
      li.classList.remove("done", "active", "overdue");
      if (i < curIdx) li.classList.add("done");
      if (i === curIdx) li.classList.add("active");
      if (i === curIdx && cycle.is_overdue) li.classList.add("overdue");
    });
    if (els.cycleDue) {
      els.cycleDue.textContent = `${cycle.is_overdue ? "Overdue" : "Due"} · ${fmt.date(cycle.phase_due_date || new Date(Date.now() + 86400000 * 5))}`;
      els.cycleDue.classList.toggle("due-overdue", !!cycle.is_overdue);
    }
    els.overdueBadge?.classList.toggle("hidden", !cycle.is_overdue);
    const guide = PHASE_GUIDANCE[current] || PHASE_GUIDANCE.fruiting;
    if (els.phaseGuidance) {
      els.phaseGuidance.innerHTML = `<strong><i class="fa-solid fa-list-check"></i> ${PHASE_LABEL[current]} guidance</strong><span>${escapeHtml(guide.guide)}</span>`;
    }
    if (els.phaseRangeCard) {
      els.phaseRangeCard.innerHTML = `<strong><i class="fa-solid fa-bullseye"></i> Phase-specific target range</strong><span>${escapeHtml(guide.ranges)}</span>`;
    }
    if (els.phaseBtn) {
      els.phaseBtn.classList.remove("btn-danger", "btn-moss");
      if (current === "harvest") {
        els.phaseBtn.dataset.mode = "restart";
        els.phaseBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> <span>Restart Cycle</span>`;
        els.phaseBtn.classList.add("btn-moss");
      } else {
        els.phaseBtn.dataset.mode = "advance";
        els.phaseBtn.innerHTML = `<i class="fa-solid fa-arrow-right"></i> <span>Done ${PHASE_LABEL[current].toLowerCase()} phase</span>`;
        if (cycle.is_overdue) els.phaseBtn.classList.add("btn-danger");
      }
    }

    // ── Harvest panel visibility ─────────────────────────────────────
    const harvestPanel = document.querySelector(".harvest-panel");
    if (harvestPanel) {
      const isFruiting = current === "fruiting";
      const isHarvest  = current === "harvest";

      if (isFruiting || isHarvest) {
        harvestPanel.style.display = "";
        // Reset any previous locked state
        harvestPanel.querySelectorAll("input, button").forEach(el => el.disabled = false);
        harvestPanel.style.opacity = "1";

        // Update header to reflect exact phase context
        const heading = harvestPanel.querySelector("h4");
        if (heading) {
          heading.innerHTML = isFruiting
            ? `<i class="fa-solid fa-basket-shopping"></i> Prepare harvest checklist`
            : `<i class="fa-solid fa-basket-shopping"></i> Harvest checklist &amp; yield record`;
        }

        // Show/hide the yield row — only relevant at harvest phase
        const yieldRow = harvestPanel.querySelector(".yield-row");
        if (yieldRow) yieldRow.style.display = isHarvest ? "" : "none";

      } else {
        // Not yet fruiting — show locked placeholder instead
        harvestPanel.style.opacity = "0.45";
        harvestPanel.querySelectorAll("input, button").forEach(el => el.disabled = true);

        const PRE_HARVEST_PHASES = ["seeding", "colonisation", "initiation"];
        const msg = PRE_HARVEST_PHASES.includes(current)
          ? `Harvest checklist will be available when the room reaches the <strong>Fruiting</strong> phase. Currently in <strong>${PHASE_LABEL[current]}</strong>.`
          : `Harvest checklist is not applicable in the current phase.`;

        const heading = harvestPanel.querySelector("h4");
        if (heading) heading.innerHTML = `<i class="fa-solid fa-lock"></i> Harvest checklist &amp; yield record`;

        // Show inline notice if not already there
        let notice = harvestPanel.querySelector(".harvest-phase-notice");
        if (!notice) {
          notice = document.createElement("p");
          notice.className = "harvest-phase-notice";
          notice.style.cssText = "font-size:12px;color:var(--text-mute);margin:6px 0 0;font-style:italic;";
          harvestPanel.insertBefore(notice, harvestPanel.querySelector("label"));
        }
        notice.innerHTML = msg;
      }

      // Remove stale notice when phase is active
      if (isFruiting || isHarvest) {
        const notice = harvestPanel.querySelector(".harvest-phase-notice");
        if (notice) notice.remove();
      }
    }
  }

  function cctvImageFor(roomNumber = 1, zone = 1) {
    const prefixes = { 1: "GO", 2: "BJ", 3: "WO" };
    return `images/${prefixes[roomNumber] || "GO"}_${String(zone || 1).padStart(2, "0")}.png?v=${CCTV_CACHE_VERSION}`;
  }

  function paintCctvFeeds() {
    els.cctvCells.forEach((cell) => {
      const feed = $(".cctv-feed", cell);
      if (feed) feed.style.backgroundImage = `url("${cctvImageFor(state.activeRoomMeta?.room_number, cell.dataset.zone)}")`;
    });
  }

  function renderAutomationPanel(env = {}, thr = {}) {
    if (!els.automationGrid) return;
    const items = [
      ["temperature", "fa-temperature-half", "Temperature", env.temperature],
      ["humidity", "fa-droplet", "Humidity", env.humidity],
      ["co2", "fa-wind", "CO2", env.co2_level],
      ["airflow", "fa-fan", "Airflow", env.air_flow],
      ["lighting", "fa-sun", "Lighting", env.lighting],
    ];
    els.automationGrid.innerHTML = items.map(([kind, icon, label, value]) => {
      const [text, cls] = machineText(kind, value, thr);
      const offline = label === "CO2" && cls === "state-alert" ? `<span class="control-note"><i class="fa-solid fa-plug-circle-xmark"></i> Actuator check required</span>` : "";
      return `
        <article class="automation-card ${cls}">
          <strong><i class="fa-solid ${icon}"></i> ${label}</strong>
          <span>${escapeHtml(text)}</span>
          ${offline}
          <button type="button" class="btn-secondary manual-override" data-control="${kind}">
            <i class="fa-solid fa-hand"></i> Manual override
          </button>
        </article>`;
    }).join("");
  }

  function renderRoomSummaries() {
    if (!els.roomSummaryGrid) return;
    els.roomSummaryGrid.innerHTML = MOCK_ROOMS.map((r) => {
      const sev = r.status === "Critical" ? "danger" : r.status === "Warning" ? "warning" : "normal";
      const icon = sev === "danger" ? "fa-triangle-exclamation" : sev === "warning" ? "fa-circle-exclamation" : "fa-circle-check";
      return `
        <article class="room-summary-card sev-${sev}">
          <header><span><i class="fa-solid ${icon}"></i> Room ${r.room}</span><strong>${r.status}</strong></header>
          <p>${escapeHtml(r.type)} · ${escapeHtml(r.maintenance)}</p>
          <div class="summary-metrics"><span>${r.temp} C</span><span>${r.humidity}% RH</span><span>${r.co2} ppm</span></div>
        </article>`;
    }).join("");
  }

  // ─── Mutable per-room cycle state ────────────────────────────────────────
  // Keyed by roomId. Initialised lazily from mockRoomState defaults.
  const roomCycleState = {};

  function getRoomCycle(roomId) {
    if (!roomCycleState[roomId]) {
      const base = MOCK_ROOMS.find((r) => r.id === roomId) || MOCK_ROOMS[0];
      roomCycleState[roomId] = {
        current_phase: base.room === 2 ? "colonisation" : "fruiting",
        phase_due_date: new Date(Date.now() + 86400000 * 6).toISOString(),
        is_overdue: false,
        cycle_day_current: base.room === 2 ? 4 : 23,
        cycle_day_total: 35,
      };
    }
    return roomCycleState[roomId];
  }

  function advanceRoomCycle(roomId) {
    const c = getRoomCycle(roomId);
    const idx = PHASES.indexOf(c.current_phase);
    if (idx < PHASES.length - 1) {
      c.current_phase = PHASES[idx + 1];
      c.phase_due_date = new Date(Date.now() + 86400000 * (GROWTH_PHASE_DAYS[idx + 1] || 5)).toISOString();
      c.is_overdue = false;
      // Update cycle day to match new phase start
      c.cycle_day_current = GROWTH_PHASE_DAYS.slice(0, idx + 1).reduce((a, b) => a + b, 0) + 1;
    }
  }

  function restartRoomCycle(roomId) {
    const c = getRoomCycle(roomId);
    c.current_phase = PHASES[0];
    c.phase_due_date = new Date(Date.now() + 86400000 * GROWTH_PHASE_DAYS[0]).toISOString();
    c.is_overdue = false;
    c.cycle_day_current = 1;
  }


  function mockRoomState(roomId) {
    const base = MOCK_ROOMS.find((r) => r.id === roomId) || MOCK_ROOMS[0];
    const cycle = getRoomCycle(roomId);
    return {
      room: { id: base.id, room_number: base.room, mushroom_type: base.type },
      env: {
        temperature: base.temp,
        humidity: base.humidity,
        lighting: base.lighting,
        co2_level: base.co2,
        air_flow: base.airflow,
        cycle_day_current: cycle.cycle_day_current,
        cycle_day_total: cycle.cycle_day_total,
        last_updated: new Date().toISOString(),
      },
      thresholds: {
        temp_min: 20,
        temp_max: base.room === 2 ? 26 : 24,
        humidity_min: 85,
        humidity_max: 95,
        light_min: 200,
        light_max: 500,
        co2_min: 500,
        co2_max: base.room === 2 ? 1100 : 1000,
        airflow_min: 15,
        airflow_max: 25,
      },
      cycle: {
        current_phase: cycle.current_phase,
        phase_due_date: cycle.phase_due_date,
        is_overdue: cycle.is_overdue,
      },
    };
  }

  function paintRoom(data) {
    state.roomData = data;
    state.activeRoomMeta = data.room;
    const { room: r, env, thresholds: thr, cycle } = data;
    if (els.roomHeader) {
      els.roomHeader.innerHTML = `<i class="fa-solid fa-warehouse"></i> Incubation Room ${r.room_number}<span class="mushroom-tag"><i class="fa-solid fa-seedling"></i> ${escapeHtml(r.mushroom_type)}</span>`;
    }

    let stateText = machineText("temperature", env.temperature, thr);
    paintKpi(els.kpiCards.temperature, fmt.num(env.temperature, 1), "C", `${thr.temp_min}-${thr.temp_max} C`, stateText[0], stateText[1]);
    stateText = machineText("humidity", env.humidity, thr);
    paintKpi(els.kpiCards.humidity, fmt.num(env.humidity, 1), "%", `${thr.humidity_min}-${thr.humidity_max} %`, stateText[0], stateText[1]);
    stateText = machineText("lighting", env.lighting, thr);
    paintKpi(els.kpiCards.lighting, fmt.int(env.lighting), "Lux", `${thr.light_min}-${thr.light_max}`, stateText[0], stateText[1]);
    stateText = machineText("co2", env.co2_level, thr);
    paintKpi(els.kpiCards.co2, fmt.int(env.co2_level), "ppm", `${thr.co2_min}-${thr.co2_max}`, stateText[0], stateText[1]);
    stateText = machineText("airflow", env.air_flow, thr);
    paintKpi(els.kpiCards.airflow, fmt.num(env.air_flow, 1), "m3/h", `${thr.airflow_min}-${thr.airflow_max}`, stateText[0], stateText[1]);

    if (els.kpiCards.cycle) {
      const cd = parseInt(env.cycle_day_current || 1, 10);
      const ct = parseInt(env.cycle_day_total || 35, 10);
      els.kpiCards.cycle.querySelector(".kpi-value .num").textContent = `Day ${cd}`;
      els.kpiCards.cycle.querySelector(".kpi-value small").textContent = `/ ${ct}`;
      if (els.cycleBar) els.cycleBar.style.width = `${Math.min(100, (cd / ct) * 100)}%`;
      const footer = els.kpiCards.cycle.querySelector(".machine-state");
      footer.textContent = `Phase: ${PHASE_LABEL[cycle.current_phase] || "-"}`;
      footer.classList.remove("state-on", "state-warn", "state-alert");
      footer.classList.add(cycle.is_overdue ? "state-alert" : "state-on");
    }

    fillThresholds(thr);
    paintCycle(cycle);
    paintCctvFeeds();
    renderAutomationPanel(env, thr);
    if (els.lastSync) els.lastSync.textContent = `last sync ${fmt.time(env.last_updated || new Date())}`;
  }

  async function loadRoom(roomId) {
    state.activeRoomId = roomId;
    els.roomTabs.forEach((tab) => {
      const active = parseInt(tab.dataset.roomId, 10) === roomId;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    paintRoom(mockRoomState(roomId));
  }

  // ─── Analytics state & helpers ──────────────────────────────────────────────

  const analyticsState = { room: "all", metric: "Temperature", range: 7 };

  const TREND_META = {
    Temperature: { unit: "°C",   tMin: 20,  tMax: 24,   icon: "fa-temperature-half" },
    Humidity:    { unit: "%",    tMin: 85,  tMax: 95,   icon: "fa-droplet"          },
    CO2:         { unit: "ppm",  tMin: 500, tMax: 1000, icon: "fa-wind"             },
    Airflow:     { unit: "m³/h", tMin: 15,  tMax: 25,   icon: "fa-fan"              },
    Lighting:    { unit: "Lux",  tMin: 200, tMax: 500,  icon: "fa-sun"              },
  };

  const ROOM_COLORS = { 1: "#c0822a", 2: "#5d7a4f", 3: "#7a6a9c" };

  function seededRng(seed) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  function genTrend(metric, roomId, days = 30) {
    const m = TREND_META[metric];
    const rng = seededRng(roomId * 997 + metric.charCodeAt(0) * 31);
    const mid = (m.tMin + m.tMax) / 2;
    const swing = (m.tMax - m.tMin) * 0.18;
    let v = mid;
    return Array.from({ length: days }, () => {
      v += (rng() - 0.49) * swing;
      v = Math.max(m.tMin * 0.82, Math.min(m.tMax * 1.18, v));
      return Math.round(v * 10) / 10;
    });
  }

  // Pre-generate 30 days for all rooms & metrics
  const TREND_DB = {};
  [1, 2, 3].forEach((rid) => {
    TREND_DB[rid] = {};
    Object.keys(TREND_META).forEach((m) => { TREND_DB[rid][m] = genTrend(m, rid, 30); });
  });

  function dayLabels(days) {
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(Date.now() - (days - 1 - i) * 86400000);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    });
  }

  function buildLineChart(series, meta, days) {
    const W = 760, H = 230, PL = 52, PR = 52, PT = 16, PB = 42;
    const cW = W - PL - PR, cH = H - PT - PB;

    const allVals = series.flatMap((s) => s.values);
    const pad = (meta.tMax - meta.tMin) * 0.18;
    const vMin = Math.min(...allVals, meta.tMin) - pad;
    const vMax = Math.max(...allVals, meta.tMax) + pad;
    const vRng = vMax - vMin || 1;

    const xs = (i) => PL + (i / Math.max(days - 1, 1)) * cW;
    const ys = (v) => PT + cH - ((v - vMin) / vRng) * cH;

    const labels = dayLabels(days);

    // Horizontal grid lines
    const gridCnt = 5;
    const grid = Array.from({ length: gridCnt }, (_, i) => {
      const v = vMin + (vRng / (gridCnt - 1)) * i;
      const y = ys(v).toFixed(1);
      const lbl = Math.abs(v) >= 100 ? Math.round(v) : v.toFixed(1);
      return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="var(--line)" stroke-dasharray="3 4" stroke-width="1"/>
              <text x="${PL - 6}" y="${(+y + 4).toFixed(0)}" text-anchor="end" font-size="10" fill="var(--text-mute)">${lbl}</text>`;
    }).join("");

    // X-axis date labels
    const step = Math.max(1, Math.floor(days / 8));
    const xAxis = labels.map((l, i) => {
      if (i % step !== 0 && i !== days - 1) return "";
      return `<text x="${xs(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="10" fill="var(--text-mute)">${l}</text>`;
    }).join("");

    // Threshold band
    const thrTop  = Math.min(ys(meta.tMax), ys(meta.tMin)).toFixed(1);
    const thrH    = Math.abs(ys(meta.tMax) - ys(meta.tMin)).toFixed(1);
    const thrMaxY = ys(meta.tMax).toFixed(1);
    const thrMinY = ys(meta.tMin).toFixed(1);

    const showDots = days <= 14;

    // Pre-compute end-label Y positions and resolve collisions
    const LABEL_MIN_GAP = 13;
    const endLabels = series.map(({ color, values }, si) => {
      const lastVal = values[days - 1];
      return { si, color, lastVal, idealY: Math.max(PT + 10, +ys(lastVal) - 5) };
    });
    const sortedLabels = [...endLabels].sort((a, b) => a.idealY - b.idealY);
    sortedLabels.forEach((item, i) => {
      if (i === 0) { item.resolvedY = item.idealY; return; }
      item.resolvedY = Math.max(item.idealY, sortedLabels[i - 1].resolvedY + LABEL_MIN_GAP);
    });
    const resolvedMainY = {};
    sortedLabels.forEach(item => { resolvedMainY[item.si] = item.resolvedY; });

    const paths = series.map(({ color, values }, si) => {
      const pts = values.map((v, i) => `${xs(i).toFixed(1)},${ys(v).toFixed(1)}`);
      const linePath = `M ${pts.join(" L ")}`;
      const areaPath = `M ${xs(0).toFixed(1)},${(PT + cH).toFixed(1)} L ${pts.join(" L ")} L ${xs(days - 1).toFixed(1)},${(PT + cH).toFixed(1)} Z`;
      const dots = showDots
        ? values.map((v, i) => `<circle cx="${xs(i).toFixed(1)}" cy="${ys(v).toFixed(1)}" r="3.5" fill="${color}" stroke="var(--bg-1)" stroke-width="1.5"/>`).join("")
        : "";
      const lastVal = values[days - 1];
      const rawLx = +xs(days - 1) + 5;
      const lx = Math.min(rawLx, W - PR - 2).toFixed(0);
      const ly = resolvedMainY[si].toFixed(0);
      const tag = `<text x="${lx}" y="${ly}" font-size="10" font-weight="700" fill="${color}" text-anchor="start">${lastVal}</text>`;
      return `<path d="${areaPath}" fill="${color}" opacity="0.08"/>
              <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
              ${dots}${tag}`;
    }).join("");

    return `<svg viewBox="0 0 ${W} ${H}" class="line-chart-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Sensor trend chart">
      ${grid}
      ${xAxis}
      <rect x="${PL}" y="${thrTop}" width="${cW}" height="${thrH}" fill="var(--moss)" opacity="0.10" rx="2"/>
      <line x1="${PL}" y1="${thrMaxY}" x2="${W - PR}" y2="${thrMaxY}" stroke="var(--moss)" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>
      <text x="${(W - PR + 3)}" y="${(+thrMaxY + 4).toFixed(0)}" font-size="9" fill="var(--moss)" opacity="0.8">max</text>
      <line x1="${PL}" y1="${thrMinY}" x2="${W - PR}" y2="${thrMinY}" stroke="var(--moss)" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>
      <text x="${(W - PR + 3)}" y="${(+thrMinY + 4).toFixed(0)}" font-size="9" fill="var(--moss)" opacity="0.8">min</text>
      ${paths}
      <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${(PT + cH).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>
      <line x1="${PL}" y1="${(PT + cH).toFixed(1)}" x2="${W - PR}" y2="${(PT + cH).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>
    </svg>`;
  }

  function renderMainChart() {
    const chartEl = document.getElementById("mainChart");
    const titleEl = document.getElementById("chartTitle");
    const kickerEl = document.getElementById("chartKicker");
    const legendEl = document.getElementById("chartLegend");
    if (!chartEl) return;

    const { room, metric, range } = analyticsState;
    const meta = TREND_META[metric];

    const series =
      room === "all"
        ? [1, 2, 3].map((rid) => ({ label: `Room ${rid}`, color: ROOM_COLORS[rid], values: TREND_DB[rid][metric].slice(-range) }))
        : [{ label: `Room ${room}`, color: ROOM_COLORS[+room], values: TREND_DB[+room][metric].slice(-range) }];

    if (titleEl) titleEl.innerHTML = `<i class="fa-solid ${meta.icon}"></i> ${escapeHtml(metric)} — Last ${range} Days`;
    if (kickerEl) kickerEl.textContent = `${room === "all" ? "All Rooms" : "Room " + room} · ${meta.unit}`;
    if (legendEl) {
      legendEl.innerHTML = series
        .map((s) => `<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${escapeHtml(s.label)}</span>`)
        .join("");
    }

    chartEl.innerHTML = buildLineChart(series, meta, range);
  }

  function renderAnalytics() {
    // Room comparison table
    if (els.roomComparison) {
      els.roomComparison.innerHTML = `
        <div class="comparison-row comparison-head">
          <span>Room</span><span>Status</span><span>Temp</span><span>RH</span><span>CO2</span><span>Maintenance</span>
        </div>
        ${MOCK_ROOMS.map((r) => `
          <div class="comparison-row">
            <span>Room ${r.room}<small>${escapeHtml(r.type)}</small></span>
            <span class="status-text status-${r.status.toLowerCase()}">
              <i class="fa-solid ${r.status === "Critical" ? "fa-triangle-exclamation" : r.status === "Warning" ? "fa-circle-exclamation" : "fa-circle-check"}"></i>
              ${r.status}
            </span>
            <span>${r.temp} C</span><span>${r.humidity}%</span><span>${r.co2} ppm</span>
            <span>${escapeHtml(r.maintenance)}</span>
          </div>`).join("")}`;
    }

    // Wire all analytics tab/chip listeners exactly once, then do initial renders
    initAnalyticsListeners();
    renderSparkCards();
    renderMainChart();
    renderGrowthChart();
  }

  function renderSparkCards() {
    if (!els.trendGrid) return;
    // When a specific room is selected show that room's data; for "all", show room 1 as representative
    const activeRoom = analyticsState.room === "all" ? 1 : parseInt(analyticsState.room, 10);
    els.trendGrid.innerHTML = Object.entries(TREND_META).map(([name, meta]) => {
        const vals = TREND_DB[activeRoom][name].slice(-7);
        const mx = Math.max(...vals), mn = Math.min(...vals), rng = mx - mn || 1;
        const last = vals[vals.length - 1], prev = vals[vals.length - 2];
        const dir = last > prev ? "up" : last < prev ? "down" : "flat";
        const dirIcon  = dir === "up" ? "fa-arrow-trend-up" : dir === "down" ? "fa-arrow-trend-down" : "fa-minus";
        const dirColor = dir === "up" ? "var(--honey)" : dir === "down" ? "var(--crimson)" : "var(--text-mute)";
        const isActive = name === analyticsState.metric;
        // For a specific room tab, show the room colour badge
        const roomBadge = analyticsState.room !== "all"
          ? `<span class="spark-room-badge" style="background:${ROOM_COLORS[activeRoom]}22;color:${ROOM_COLORS[activeRoom]};border:1px solid ${ROOM_COLORS[activeRoom]}44;">Room ${activeRoom}</span>`
          : "";
        return `
          <article class="trend-card trend-card-clickable${isActive ? " trend-card-active" : ""}" data-metric="${name}" title="View ${name} in detail chart">
            <div class="trend-card-top">
              <strong>${escapeHtml(name)}</strong>
              <i class="fa-solid ${dirIcon}" style="color:${dirColor};font-size:12px" aria-hidden="true"></i>
            </div>
            <div class="spark-bars" aria-label="${escapeHtml(name)} trend">
              ${vals.map((v) => `<span style="height:${Math.max(16, ((v - mn) / rng) * 100 || 50)}%"></span>`).join("")}
            </div>
            <div class="spark-footer"><small>${last} ${meta.unit}</small>${roomBadge}</div>
          </article>`;
      }).join("");

    // Re-wire trend card clicks after every re-render (DOM replaced)
    els.trendGrid.querySelectorAll(".trend-card-clickable").forEach((card) => {
      card.addEventListener("click", () => {
        analyticsState.metric = card.dataset.metric;
        document.querySelectorAll("#filterMetrics .chip").forEach((c) =>
          c.classList.toggle("active", c.dataset.metric === card.dataset.metric));
        els.trendGrid.querySelectorAll(".trend-card-clickable").forEach((c) =>
          c.classList.toggle("trend-card-active", c.dataset.metric === card.dataset.metric));
        renderMainChart();
      });
    });
  }

  function initAnalyticsListeners() {
    // Wire Room tabs — registered once on init, never duplicated
    document.querySelectorAll("#filterRooms .an-room-tab").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelectorAll("#filterRooms .an-room-tab").forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        analyticsState.room = btn.dataset.room;
        // Both charts + spark cards must all update together
        renderSparkCards();
        renderMainChart();
        renderGrowthChart();
      }));

    // Wire Metric filter chips — registered once
    document.querySelectorAll("#filterMetrics .chip").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelectorAll("#filterMetrics .chip").forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        analyticsState.metric = btn.dataset.metric;
        // Sync active state on spark cards too
        els.trendGrid?.querySelectorAll(".trend-card-clickable").forEach((c) =>
          c.classList.toggle("trend-card-active", c.dataset.metric === btn.dataset.metric));
        renderMainChart();
      }));

    // Wire Range filter chips — registered once
    document.querySelectorAll("#filterRange .chip").forEach((btn) =>
      btn.addEventListener("click", () => {
        document.querySelectorAll("#filterRange .chip").forEach((c) => c.classList.remove("active"));
        btn.classList.add("active");
        analyticsState.range = parseInt(btn.dataset.range, 10);
        renderMainChart();
      }));
  }

  // Growth-to-Harvest chart

  const GROWTH_PHASES = ["Seeding", "Colonisation", "Initiation", "Fruiting", "Harvest"];
  const GROWTH_PHASE_DAYS = [3, 10, 5, 8, 4];
  const GROWTH_COLORS = { 1: "#c0822a", 2: "#5d7a4f", 3: "#7a6a9c" };

  function genGrowthData(roomId) {
    const rng = seededRng(roomId * 53 + 7);
    const yieldPeak = [520, 480, 560][roomId - 1];
    const phaseRates = [0.2, 0.8, 6, 18, 3];
    const result = [];
    let total = 0, d = 0;
    GROWTH_PHASE_DAYS.forEach((pDays, pi) => {
      for (let i = 0; i < pDays; i++) {
        const base = phaseRates[pi];
        const noise = (rng() - 0.45) * base * 0.6;
        total += Math.max(0, base + noise) * (yieldPeak / 200);
        result.push({ day: d++, value: Math.round(total * 10) / 10 });
      }
    });
    return result;
  }

  function renderGrowthChart() {
    const chartEl = document.getElementById("growthChart");
    const legendEl = document.getElementById("growthLegend");
    const phaseEl = document.getElementById("growthPhaseLabels");
    const statsEl = document.getElementById("growthStats");
    if (!chartEl) return;

    const W = 760, H = 254, PL = 56, PR = 68, PT = 28, PB = 8;
    const cW = W - PL - PR, cH = H - PT - PB;

    // ── Respect the room tab filter ──────────────────────────────────
    const activeRoom = analyticsState.room;
    const roomIds = activeRoom === "all" ? [1, 2, 3] : [parseInt(activeRoom, 10)];

    const allSeries = roomIds.map((rid) => ({
      id: rid, color: GROWTH_COLORS[rid], label: "Room " + rid, data: genGrowthData(rid),
    }));

    const totalDays = allSeries[0].data.length;
    const allVals = allSeries.flatMap((s) => s.data.map((d) => d.value));
    const vMax = Math.max(...allVals) * 1.1;
    const xs = (day) => PL + (day / (totalDays - 1)) * cW;
    const ys = (v) => PT + cH - (v / vMax) * cH;

    const gridCnt = 5;
    const grid = Array.from({ length: gridCnt }, (_, i) => {
      const v = (vMax / (gridCnt - 1)) * i;
      const y = ys(v).toFixed(1);
      const lbl = Math.round(v);
      return '<line x1="' + PL + '" y1="' + y + '" x2="' + (W - PR) + '" y2="' + y + '" stroke="var(--line)" stroke-dasharray="3 4" stroke-width="1"/>' +
             '<text x="' + (PL - 6) + '" y="' + (+y + 4).toFixed(0) + '" text-anchor="end" font-size="10" fill="var(--text-mute)">' + lbl + 'g</text>';
    }).join("");

    let dayStart = 0;
    const phaseBands = GROWTH_PHASE_DAYS.map((pDays, pi) => {
      const x1 = xs(dayStart).toFixed(1);
      const x2 = xs(Math.min(dayStart + pDays - 1, totalDays - 1)).toFixed(1);
      const bandW = Math.max(0, +x2 - +x1).toFixed(1);
      const fill = pi % 2 === 0 ? "rgba(212,163,115,0.05)" : "rgba(138,169,122,0.06)";
      dayStart += pDays;
      return '<rect x="' + x1 + '" y="' + PT + '" width="' + bandW + '" height="' + cH + '" fill="' + fill + '"/>';
    }).join("");

    dayStart = 0;
    const phaseXPos = GROWTH_PHASE_DAYS.map((pDays, pi) => {
      const cx = xs(dayStart + Math.floor(pDays / 2));
      dayStart += pDays;
      return { label: GROWTH_PHASES[pi], cx };
    });

    const phaseLabelsInSvg = phaseXPos.map((p) =>
      '<text x="' + p.cx.toFixed(1) + '" y="' + (PT - 4) + '" text-anchor="middle" font-size="9" font-weight="700" fill="var(--text-mute)" letter-spacing="0.08em" text-transform="uppercase">' + p.label.toUpperCase() + '</text>'
    ).join("");

    dayStart = 0;
    const dividers = GROWTH_PHASE_DAYS.slice(0, -1).map((pDays) => {
      dayStart += pDays;
      const x = xs(dayStart).toFixed(1);
      return '<line x1="' + x + '" y1="' + PT + '" x2="' + x + '" y2="' + (PT + cH).toFixed(1) + '" stroke="var(--line)" stroke-width="1" stroke-dasharray="2 3"/>';
    }).join("");

    const MIN_GAP = 15;
    const labelInfos = allSeries.map(({ color, data }, si) => {
      const last = data[data.length - 1];
      return { si, color, data, idealY: ys(last.value), last };
    });
    // Sort by idealY ascending (top to bottom), resolve overlaps, then restore original order
    const sorted = [...labelInfos].sort((a, b) => a.idealY - b.idealY);
    sorted.forEach((item, i) => {
      const clamped = Math.max(PT + 8, Math.min(item.idealY, PT + cH - 4));
      if (i === 0) { item.resolvedY = clamped; return; }
      item.resolvedY = Math.max(clamped, sorted[i - 1].resolvedY + MIN_GAP);
    });
    // Map back to original series order
    const resolvedYBySi = {};
    sorted.forEach(item => { resolvedYBySi[item.si] = item.resolvedY; });

    const seriesSvg = allSeries.map(({ color, data }, si) => {
      const pts = data.map((d) => xs(d.day).toFixed(1) + "," + ys(d.value).toFixed(1));
      const line = "M " + pts.join(" L ");
      const area = "M " + xs(0).toFixed(1) + "," + (PT + cH).toFixed(1) + " L " + pts.join(" L ") + " L " + xs(totalDays - 1).toFixed(1) + "," + (PT + cH).toFixed(1) + " Z";
      const last = data[data.length - 1];
      const lineEndX = xs(last.day);
      const labelX = lineEndX + 8;
      const lineEndY = ys(last.value);
      const tagY = resolvedYBySi[si];
      // Connector: short horizontal line from line-end to label
      const connector = '<line x1="' + lineEndX.toFixed(1) + '" y1="' + lineEndY.toFixed(1) +
        '" x2="' + (labelX + 2).toFixed(1) + '" y2="' + tagY.toFixed(1) +
        '" stroke="' + color + '" stroke-width="1" opacity="0.45"/>';
      const tag = '<text x="' + labelX.toFixed(1) + '" y="' + (tagY + 4).toFixed(1) +
        '" font-size="11" font-weight="700" fill="' + color + '" text-anchor="start">' + last.value + 'g</text>';
      return '<path d="' + area + '" fill="' + color + '" opacity="0.08"/>' +
             '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
             connector + tag;
    }).join("");

    chartEl.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="line-chart-svg" xmlns="http://www.w3.org/2000/svg">' +
      phaseLabelsInSvg + phaseBands + grid + dividers + seriesSvg +
      '<line x1="' + PL + '" y1="' + PT + '" x2="' + PL + '" y2="' + (PT + cH).toFixed(1) + '" stroke="var(--line)" stroke-width="1"/>' +
      '<line x1="' + PL + '" y1="' + (PT + cH).toFixed(1) + '" x2="' + (W - PR) + '" y2="' + (PT + cH).toFixed(1) + '" stroke="var(--line)" stroke-width="1"/>' +
      '</svg>';

    if (phaseEl) phaseEl.style.display = "none"; // labels now inside SVG

    if (legendEl) {
      legendEl.innerHTML = allSeries.map((s) =>
        '<span class="legend-item"><span class="legend-dot" style="background:' + s.color + '"></span>' + s.label + '</span>'
      ).join("");
    }

    if (statsEl) {
      statsEl.innerHTML = allSeries.map((s) => {
        const final = s.data[s.data.length - 1].value;
        const peak = Math.max(...s.data.map((d) => d.value));
        return '<div class="growth-stat-card">' +
          '<span class="growth-stat-dot" style="background:' + s.color + '"></span>' +
          '<div><strong>' + s.label + '</strong>' +
          '<span>Yield <b>' + final + 'g</b> &middot; Peak <b>' + peak + 'g</b></span></div>' +
          '</div>';
      }).join("");
    }
  }

  function renderDiagnosticsMock() {
    const renderItem = (item) => `
      <article class="log-entry ${item.className === "state-alert" ? "log-entry-error" : ""}">
        <i class="fa-solid ${item.icon}"></i>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <time>Status: <span class="${item.className}">${escapeHtml(item.status)}</span> · ${escapeHtml(item.detail)} · Due: ${escapeHtml(item.due)}</time>
          <div class="equipment-actions">
            <button type="button" class="btn-secondary mock-action"><i class="fa-solid fa-check"></i> Mark inspected</button>
            <button type="button" class="btn-secondary mock-action"><i class="fa-solid fa-calendar-plus"></i> Schedule repair</button>
          </div>
        </div>
      </article>`;
    if (els.systemHealthList) els.systemHealthList.innerHTML = MOCK_EQUIPMENT.filter((i) => i.type === "system").map(renderItem).join("");
    if (els.equipmentConditionList) els.equipmentConditionList.innerHTML = MOCK_EQUIPMENT.filter((i) => i.type === "equipment").map(renderItem).join("");
  }

  function openCctv(zone) {
    if (!els.modalTitle || !els.modalFeed || !els.cctvModal) return;
    state.lastFocus = document.activeElement;
    els.modalTitle.textContent = `Zone 0${zone} - Room ${state.activeRoomMeta?.room_number ?? "?"} · ${state.activeRoomMeta?.mushroom_type ?? ""}`;
    els.modalFeed.style.backgroundImage = `url("${cctvImageFor(state.activeRoomMeta?.room_number, zone)}")`;
    els.cctvModal.classList.remove("hidden");
    els.cctvClose?.focus();
  }

  function closeCctv() {
    els.cctvModal?.classList.add("hidden");
    if (state.lastFocus && document.contains(state.lastFocus)) state.lastFocus.focus();
  }

  function startPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(async () => {
      if (state.activeRoomId) await loadRoom(state.activeRoomId);
      await refreshAlerts();
    }, POLL_INTERVAL_MS);
  }

  function initSidebar() {
    const saved = localStorage.getItem("mushroomSidebarCollapsed");
    if (saved === "true") {
      els.sidebar?.classList.add("collapsed");
      els.appShell?.classList.add("sidebar-collapsed");
    }
    els.sidebarToggle?.addEventListener("click", () => {
      const isCollapsed = els.sidebar?.classList.toggle("collapsed");
      els.appShell?.classList.toggle("sidebar-collapsed", isCollapsed);
      localStorage.setItem("mushroomSidebarCollapsed", isCollapsed ? "true" : "false");
    });
  }

  function initTheme() {
    const saved = localStorage.getItem("mushroomFarmTheme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    updateThemeIcon(saved);
  }

  function updateThemeIcon(theme) {
    const icon = els.themeToggle?.querySelector("i");
    if (icon) icon.className = theme === "light" ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }

  els.alertTrack?.addEventListener("click", (e) => {
    const btn = e.target.closest(".alert-ack-btn");
    if (!btn) return;
    const key = btn.dataset.ackKey;
    const room = btn.dataset.room;
    const msg = btn.dataset.msg;
    acknowledgeAlert(key, room, msg);
  });

  els.appNavItems.forEach((btn) => btn.addEventListener("click", () => setActiveNav(btn.dataset.nav)));
  els.clearLogsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    localStorage.removeItem(ACTION_LOG_KEY);
    renderActionLogs();
  });

  // Collapsible action history
  const actionHistoryToggle = document.getElementById("actionHistoryToggle");
  actionHistoryToggle?.addEventListener("click", (e) => {
    if (e.target.closest(".log-clear-btn")) return;
    const section = document.getElementById("actionHistorySection");
    const body = document.getElementById("logList");
    const isCollapsed = section.classList.toggle("collapsed");
    actionHistoryToggle.setAttribute("aria-expanded", String(!isCollapsed));
    body.style.display = isCollapsed ? "none" : "";
  });
  actionHistoryToggle?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); actionHistoryToggle.click(); }
  });
  els.alertPrev?.addEventListener("click", () => {
    setMode("manual");
    showAlert(state.alertIdx - 1);
    scheduleAutoResume();
  });
  els.alertNext?.addEventListener("click", () => {
    setMode("manual");
    showAlert(state.alertIdx + 1);
    scheduleAutoResume();
  });
  els.alertMode?.addEventListener("click", () => setMode(state.alertMode === "auto" ? "manual" : "auto"));
  els.themeToggle?.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("mushroomFarmTheme", next);
    updateThemeIcon(next);
  });
  els.roomTabs.forEach((tab) => tab.addEventListener("click", () => loadRoom(parseInt(tab.dataset.roomId, 10))));
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
    if (e.key === "Tab" && !els.cctvModal?.classList.contains("hidden")) {
      const focusables = $$("button, [href], input, [tabindex]:not([tabindex='-1'])", els.cctvModal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  els.phaseBtn?.addEventListener("click", async () => {
    if (!state.activeRoomId) return;
    const mode = els.phaseBtn.dataset.mode;
    const roomNumber = state.activeRoomMeta?.room_number ?? state.activeRoomId;
    const currentPhase = state.roomData?.cycle?.current_phase || "fruiting";
    if (mode === "restart" && !window.confirm(`Restart the full growth cycle for Room ${roomNumber}? Confirm only after harvest checklist and yield recording are complete.`)) return;
    els.phaseBtn.disabled = true;
    try {
      if (mode === "restart") {
        restartRoomCycle(state.activeRoomId);
        addActionLog(`Restarted cycle for Room ${roomNumber}`);
      } else {
        advanceRoomCycle(state.activeRoomId);
        addActionLog(`Done ${PHASE_LABEL[currentPhase].toLowerCase()} phase for Room ${roomNumber}`);
      }
      await loadRoom(state.activeRoomId);
      await refreshAlerts();
    } finally {
      els.phaseBtn.disabled = false;
    }
  });

  els.thrForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(els.thrForm);
    const body = { room_id: state.activeRoomId };
    for (const [k, v] of fd.entries()) body[k] = parseFloat(v);

    const changes = [];
    const current = state.roomData?.thresholds || {};
    Object.entries(body).forEach(([k, v]) => {
      if (k === "room_id") return;
      const oldValue = parseFloat(current[k]);
      if (Number.isFinite(oldValue) && Number.isFinite(v) && oldValue !== v) changes.push(`${k}: ${oldValue} -> ${v}`);
    });
    const major = changes.some((line) => {
      const parts = line.match(/: ([\d.-]+) -> ([\d.-]+)/);
      return parts && Math.abs(parseFloat(parts[2]) - parseFloat(parts[1])) >= 5;
    });
    if (major && !window.confirm(`Major threshold change detected for Room ${state.activeRoomMeta?.room_number ?? state.activeRoomId}. Continue?\n\n${changes.join("\n")}`)) return;

    els.thrStatus?.classList.remove("err");
    if (els.thrStatus) els.thrStatus.textContent = "Saving...";
    addActionLog(`Saved thresholds for Room ${state.activeRoomMeta?.room_number ?? state.activeRoomId}: ${changes.length ? changes.join(", ") : "no value changes"}`);
    if (els.thrStatus) els.thrStatus.textContent = "Mock save recorded for design preview.";
    await loadRoom(state.activeRoomId);
    await refreshAlerts();
    setTimeout(() => {
      if (els.thrStatus) els.thrStatus.textContent = "";
    }, 4000);
  });

  document.addEventListener("click", (e) => {
    const manual = e.target.closest(".manual-override");
    if (manual) {
      const control = manual.dataset.control;
      if (window.confirm(`Manual override for ${control} can interrupt automatic protection. Continue with supervisor approval?`)) {
        addActionLog(`Manual override safeguard confirmed for ${control} in Room ${state.activeRoomMeta?.room_number ?? state.activeRoomId}`);
      }
    }
    const mock = e.target.closest(".mock-action");
    if (mock) {
      // Harvest Record button — show popup and validate checklist
      const isRecordBtn = mock.closest(".harvest-panel") !== null;
      if (isRecordBtn) {
        const panel = mock.closest(".harvest-panel");
        const checkboxes = Array.from(panel.querySelectorAll("input[type='checkbox']"));
        const yieldInput = panel.querySelector("#yieldKg");
        const unchecked = checkboxes.filter(cb => !cb.checked);
        const yieldVal = parseFloat(yieldInput?.value);

        if (unchecked.length > 0) {
          showToast(`⚠️ Please complete all checklist items before recording (${unchecked.length} remaining).`, "warn");
          return;
        }
        if (!yieldInput?.value || isNaN(yieldVal) || yieldVal <= 0) {
          showToast("⚠️ Please enter a valid yield estimate before recording.", "warn");
          return;
        }

        const roomNum = state.activeRoomMeta?.room_number ?? state.activeRoomId;
        addActionLog(`Harvest recorded for Room ${roomNum} — Yield: ${yieldVal} kg`);
        // Reset checklist and yield input
        checkboxes.forEach(cb => cb.checked = false);
        yieldInput.value = "";
        showToast(`✅ Harvest checklist and yield record for Room ${roomNum} has been recorded successfully.`, "success");
        return;
      }
      addActionLog(`${mock.textContent.trim()} for Room ${state.activeRoomMeta?.room_number ?? state.activeRoomId}`);
    }
  });

  function showToast(message, type = "success") {
    const existing = document.getElementById("farmToast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "farmToast";
    toast.style.cssText = `
      position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
      background: ${type === "success" ? "var(--moss-deep)" : "var(--clay)"};
      color: #fff; padding: 14px 24px; border-radius: 10px;
      font-size: 13px; font-weight: 600; box-shadow: 0 8px 28px rgba(0,0,0,0.35);
      z-index: 9999; max-width: 480px; text-align: center;
      animation: toastIn 0.25s ease;
    `;
    toast.textContent = message;

    if (!document.getElementById("toastStyle")) {
      const style = document.createElement("style");
      style.id = "toastStyle";
      style.textContent = `@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; toast.style.transition = "opacity 0.4s"; }, 3500);
    setTimeout(() => toast.remove(), 4000);
  }

  (async function init() {
    initTheme();
    initSidebar();
    initSteppers();
    tickClock();
    setInterval(tickClock, 1000);
    setActiveNav("dashboard");
    renderAnalytics();
    renderDiagnosticsMock();
    renderActionLogs();
    setMode("auto");

    const firstTab = els.roomTabs[0];
    if (firstTab) await loadRoom(parseInt(firstTab.dataset.roomId, 10));
    await refreshAlerts();
    startPolling();
  })();
})();