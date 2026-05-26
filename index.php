<?php
/**
 * index.php — Smart Mushroom Farm Management Dashboard
 * Pure semantic skeleton; all dynamic state is hydrated by app.js via api.php.
 */
require_once __DIR__ . '/db_connect.php';
$pdo = get_pdo();
$rooms = $pdo->query("SELECT id, room_number, mushroom_type FROM rooms ORDER BY room_number")->fetchAll();
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Smart Mushroom Farm — Control Centre</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=JetBrains+Mono:wght@400;600&family=Outfit:wght@300;400;600&family=Playfair+Display:wght@500;700&display=swap" rel="stylesheet">

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="stylesheet" href="style.css">
</head>
<body>

<header class="topbar" data-testid="topbar">
    <div class="brand">
        <span class="brand-mark"><i class="fa-solid fa-seedling"></i></span>
        <div>
            <h1>Mycelium Control Centre</h1>
            <p>Smart Mushroom Farm · 3 incubation rooms · live telemetry</p>
        </div>
    </div>

    <nav class="topbar-nav" aria-label="Global navigation">
        <button class="topbar-nav-item" type="button" data-nav="dashboard" aria-current="page">Dashboard</button>
        <button class="topbar-nav-item" type="button" data-nav="diagnostics" aria-current="false">Diagnostics</button>
        <button class="topbar-nav-item" type="button" data-nav="logging" aria-current="false">Logging</button>
    </nav>

        <div class="topbar-meta">
        <button id="themeToggle" class="theme-toggle-btn" aria-label="Toggle light/dark mode">
            <i class="fa-solid fa-moon"></i>
        </button>
        <span id="clock" data-testid="system-clock"><i class="fa-regular fa-clock"></i> --:--:--</span>

        <span class="pill pill-live"><span class="dot"></span> LIVE</span>
    </div>
</header>

<main class="dashboard app-view" data-view="dashboard" data-testid="dashboard">

    <!-- ============================================================ -->
    <!-- ROW 1 — Dual-mode alerts banner                                -->
    <!-- ============================================================ -->
    <section class="alert-banner" data-testid="alert-banner" aria-label="System alerts">
        <button class="alert-nav" id="alertPrev" data-testid="alert-prev" aria-label="Previous alert">
            <i class="fa-solid fa-chevron-left"></i>
        </button>
        <div class="alert-track" id="alertTrack" data-testid="alert-track">
            <div class="alert-item placeholder">
                <i class="fa-solid fa-satellite-dish"></i>
                <span>Establishing telemetry link…</span>
            </div>
        </div>
        <button class="alert-nav" id="alertNext" data-testid="alert-next" aria-label="Next alert">
            <i class="fa-solid fa-chevron-right"></i>
        </button>
        <div class="alert-mode" id="alertMode" data-testid="alert-mode" title="Mode">AUTO</div>
    </section>

    <!-- ============================================================ -->
    <!-- ROW 2 — Room tab selector                                      -->
    <!-- ============================================================ -->
    <section class="room-tabs" data-testid="room-tabs" role="tablist">
        <?php foreach ($rooms as $i => $r): ?>
        <button
            class="room-tab <?= $i === 0 ? 'active' : '' ?>"
            role="tab"
            data-room-id="<?= (int)$r['id'] ?>"
            data-testid="room-tab-<?= (int)$r['room_number'] ?>"
            aria-selected="<?= $i === 0 ? 'true' : 'false' ?>">
            <span class="tab-num">Room <?= (int)$r['room_number'] ?></span>
            <span class="tab-type"><?= htmlspecialchars($r['mushroom_type']) ?></span>
        </button>
        <?php endforeach; ?>
    </section>

    <h2 class="active-room-header" id="activeRoomHeader" data-testid="active-room-header">
        <i class="fa-solid fa-warehouse"></i>
        Loading active room…
    </h2>

    <!-- ============================================================ -->
    <!-- ROW 3A — KPI grid                                              -->
    <!-- ============================================================ -->
    <section class="kpi-grid" data-testid="kpi-grid">

        <article class="kpi-card" data-kpi="temperature" data-testid="kpi-temperature">
            <header><i class="fa-solid fa-temperature-half"></i><span>Temperature</span></header>
            <div class="kpi-value"><span class="num">--</span><small>°C</small></div>
            <div class="kpi-range">Range: <span class="rng">--</span></div>
            <footer class="machine-state" data-testid="footer-temperature">—</footer>
        </article>

        <article class="kpi-card" data-kpi="humidity" data-testid="kpi-humidity">
            <header><i class="fa-solid fa-droplet"></i><span>Humidity</span></header>
            <div class="kpi-value"><span class="num">--</span><small>%</small></div>
            <div class="kpi-range">Range: <span class="rng">--</span></div>
            <footer class="machine-state" data-testid="footer-humidity">—</footer>
        </article>

        <article class="kpi-card" data-kpi="lighting" data-testid="kpi-lighting">
            <header><i class="fa-solid fa-sun"></i><span>Lighting</span></header>
            <div class="kpi-value"><span class="num">--</span><small>Lux</small></div>
            <div class="kpi-range">Range: <span class="rng">--</span></div>
            <footer class="machine-state" data-testid="footer-lighting">—</footer>
        </article>

        <article class="kpi-card" data-kpi="co2" data-testid="kpi-co2">
            <header><i class="fa-solid fa-wind"></i><span>CO₂ Level</span></header>
            <div class="kpi-value"><span class="num">--</span><small>ppm</small></div>
            <div class="kpi-range">Range: <span class="rng">--</span></div>
            <footer class="machine-state" data-testid="footer-co2">—</footer>
        </article>

        <article class="kpi-card" data-kpi="airflow" data-testid="kpi-airflow">
            <header><i class="fa-solid fa-fan"></i><span>Air Flow</span></header>
            <div class="kpi-value"><span class="num">--</span><small>m³/h</small></div>
            <div class="kpi-range">Range: <span class="rng">--</span></div>
            <footer class="machine-state" data-testid="footer-airflow">—</footer>
        </article>

        <article class="kpi-card kpi-cycle" data-kpi="cycle" data-testid="kpi-cycle">
            <header><i class="fa-solid fa-calendar-days"></i><span>Cycle Day</span></header>
            <div class="kpi-value"><span class="num">--</span><small>/ --</small></div>
            <div class="cycle-progress"><div class="cycle-progress-bar" id="cycleBar"></div></div>
            <footer class="machine-state" data-testid="footer-cycle">—</footer>
        </article>
    </section>

    <!-- ============================================================ -->
    <!-- ROW 3B — CCTV + thresholds                                     -->
    <!-- ============================================================ -->
    <section class="cctv-threshold" data-testid="cctv-threshold">

        <div class="cctv-panel" data-testid="cctv-panel">
            <header>
                <h3><i class="fa-solid fa-video"></i> Live CCTV — 4 Zone Split</h3>
                <span class="pill pill-live"><span class="dot"></span> LIVE</span>
            </header>
            <div class="cctv-grid" id="cctvGrid">
                <?php for ($z = 1; $z <= 4; $z++): ?>
                <div class="cctv-cell" data-zone="<?= $z ?>" data-testid="cctv-zone-<?= $z ?>" role="button" tabindex="0">
                                        <div class="cctv-feed"></div>

                    <div class="cctv-meta">
                        <span class="zone-label">ZONE 0<?= $z ?></span>
                        <span class="bag-count"><i class="fa-solid fa-cubes-stacked"></i> 5 bags</span>
                    </div>
                    <span class="cctv-live"><span class="dot"></span> LIVE</span>
                </div>
                <?php endfor; ?>
            </div>
        </div>

        <div class="threshold-panel" data-testid="threshold-panel">
            <header>
                <h3><i class="fa-solid fa-sliders"></i> Standard Range Formulation</h3>
                <p>Adjust acceptable min/max for this room.</p>
            </header>
            <form id="thresholdForm" data-testid="threshold-form" autocomplete="off">
                <div class="thr-row">
                    <label>Temperature (°C)</label>
                    <input type="number" step="0.1" name="temp_min" data-testid="thr-temp-min" placeholder="min">
                    <input type="number" step="0.1" name="temp_max" data-testid="thr-temp-max" placeholder="max">
                </div>
                <div class="thr-row">
                    <label>Humidity (%)</label>
                    <input type="number" step="0.1" name="humidity_min" data-testid="thr-humidity-min" placeholder="min">
                    <input type="number" step="0.1" name="humidity_max" data-testid="thr-humidity-max" placeholder="max">
                </div>
                <div class="thr-row">
                    <label>Lighting (Lux)</label>
                    <input type="number" step="1" name="light_min" data-testid="thr-light-min" placeholder="min">
                    <input type="number" step="1" name="light_max" data-testid="thr-light-max" placeholder="max">
                </div>
                <div class="thr-row">
                    <label>CO₂ (ppm)</label>
                    <input type="number" step="1" name="co2_min" data-testid="thr-co2-min" placeholder="min">
                    <input type="number" step="1" name="co2_max" data-testid="thr-co2-max" placeholder="max">
                </div>
                <div class="thr-row">
                    <label>Air Flow (m³/h)</label>
                    <input type="number" step="0.1" name="airflow_min" data-testid="thr-airflow-min" placeholder="min">
                    <input type="number" step="0.1" name="airflow_max" data-testid="thr-airflow-max" placeholder="max">
                </div>
                <button type="submit" class="btn-primary" data-testid="save-thresholds">
                    <i class="fa-solid fa-floppy-disk"></i> Save Thresholds
                </button>
                <p class="thr-status" id="thrStatus" data-testid="thr-status"></p>
            </form>
        </div>
    </section>

    <!-- ============================================================ -->
    <!-- ROW 4 — Cycle wizard                                           -->
    <!-- ============================================================ -->
    <section class="cycle-wizard" data-testid="cycle-wizard">
        <header>
            <h3><i class="fa-solid fa-circle-nodes"></i> Mushroom Growth Cycle</h3>
            <span class="cycle-due" id="cycleDue" data-testid="cycle-due">—</span>
        </header>

        <ol class="phase-track" id="phaseTrack" data-testid="phase-track">
            <li data-phase="seeding"><span class="ph-dot">1</span><span class="ph-lbl">Seeding</span></li>
            <li data-phase="colonisation"><span class="ph-dot">2</span><span class="ph-lbl">Colonisation</span></li>
            <li data-phase="initiation"><span class="ph-dot">3</span><span class="ph-lbl">Initiation</span></li>
            <li data-phase="fruiting"><span class="ph-dot">4</span><span class="ph-lbl">Fruiting</span></li>
            <li data-phase="harvest"><span class="ph-dot">5</span><span class="ph-lbl">Harvest</span></li>
        </ol>

        <div class="phase-action">
            <button id="phaseActionBtn" class="btn-primary" data-testid="phase-action-btn">
                <i class="fa-solid fa-arrow-right"></i> <span>Loading…</span>
            </button>
            <span id="overdueBadge" class="overdue-badge hidden" data-testid="overdue-badge">
                <i class="fa-solid fa-triangle-exclamation"></i> OVERDUE
            </span>
        </div>
    </section>

</main>

<main class="diagnostics-view app-view hidden" data-view="diagnostics" data-testid="diagnostics-view">
    
    <!-- SECTION 1: SYSTEM HEALTH -->
    <section class="logging-panel diagnostic-section" id="systemHealthSection">
        <header>
            <div>
                <p class="log-kicker">Core Infrastructure</p>
                <h2><i class="fa-solid fa-server"></i> System Health</h2>
            </div>
            <div class="pill pill-status" id="systemStatusPill"><span class="dot"></span> <span>SYSTEM OK</span></div>
        </header>
        <div class="log-list">
            <article class="log-entry">
                <i class="fa-solid fa-microchip"></i>
                <div>
                    <strong>Controller CPU Load</strong>
                    <time>Current: 12% · Temp: 44°C</time>
                </div>
            </article>
            <article class="log-entry">
                <i class="fa-solid fa-database"></i>
                <div>
                    <strong>Database Connection</strong>
                    <time>Status: Connected · Latency: 4ms</time>
                </div>
            </article>
            <article class="log-entry log-entry-error">
                <i class="fa-solid fa-bolt"></i>
                <div>
                    <strong>Backup Power (UPS)</strong>
                    <time>Status: <span class="state-alert">Critical</span> · Battery Cell #3 Failure</time>
                </div>
            </article>
            <article class="log-entry">
                <i class="fa-solid fa-wifi"></i>
                <div>
                    <strong>Telemetry Link</strong>
                    <time>Signal: -65dBm · Packet Loss: 0.01%</time>
                </div>
            </article>
            <article class="log-entry">
                <i class="fa-solid fa-hard-drive"></i>
                <div>
                    <strong>Storage Usage</strong>
                    <time>8.2GB used of 32GB · 74% free</time>
                </div>
            </article>
        </div>
    </section>

    <!-- SECTION 2: EQUIPMENT CONDITION -->
    <section class="logging-panel diagnostic-section" id="equipmentConditionSection">
        <header>
            <div>
                <p class="log-kicker">Farm Hardware</p>
                <h2><i class="fa-solid fa-screwdriver-wrench"></i> Equipment Condition</h2>
            </div>
            <div class="pill pill-status" id="equipmentStatusPill"><span class="dot"></span> <span>EQUIPMENT ISSUES</span></div>
        </header>
        <div class="log-list">
            
            <article class="log-entry diag-card-clickable" data-equip="acu">
                <i class="fa-solid fa-snowflake"></i>
                <div>
                    <strong>Air Conditioning Units</strong>
                    <time>3 Units · <span class="state-on">All Optimal</span></time>
                </div>
                <i class="fa-solid fa-chevron-down toggle-icon"></i>
            </article>
            <div class="equip-detail-list hidden" id="detail-acu">
                <div class="detail-item"><span>ACU-01 (Room 1)</span> <span class="state-on">Optimal</span></div>
                <div class="detail-item"><span>ACU-02 (Room 2)</span> <span class="state-on">Optimal</span></div>
                <div class="detail-item"><span>ACU-03 (Room 3)</span> <span class="state-on">Optimal</span></div>
            </div>

            <article class="log-entry diag-card-clickable log-entry-error" data-equip="humidifier">
                <i class="fa-solid fa-faucet-drip"></i>
                <div>
                    <strong>Humidifiers</strong>
                    <time>3 Units · <span class="state-alert">1 Broken</span></time>
                </div>
                <i class="fa-solid fa-chevron-down toggle-icon"></i>
            </article>
            <div class="equip-detail-list hidden" id="detail-humidifier">
                <div class="detail-item"><span>HM-01 (Room 1)</span> <span class="state-on">Optimal</span></div>
                <div class="detail-item"><span>HM-02 (Room 2)</span> <span class="state-on">Optimal</span></div>
                <div class="detail-item"><span>HM-03 (Room 3)</span> <span class="state-alert">Broken (Valve Error)</span></div>
            </div>

            <article class="log-entry diag-card-clickable" data-equip="fan">
                <i class="fa-solid fa-fan"></i>
                <div>
                    <strong>Ventilation Fans</strong>
                    <time>6 Units · <span class="state-on">All Good</span></time>
                </div>
                <i class="fa-solid fa-chevron-down toggle-icon"></i>
            </article>
            <div class="equip-detail-list hidden" id="detail-fan">
                <div class="detail-item"><span>FAN-01 (Room 1)</span> <span class="state-on">Good</span></div>
                <div class="detail-item"><span>FAN-02 (Room 1)</span> <span class="state-on">Good</span></div>
                <div class="detail-item"><span>FAN-03 (Room 2)</span> <span class="state-on">Good</span></div>
                <div class="detail-item"><span>FAN-04 (Room 2)</span> <span class="state-on">Good</span></div>
                <div class="detail-item"><span>FAN-05 (Room 3)</span> <span class="state-on">Good</span></div>
                <div class="detail-item"><span>FAN-06 (Room 3)</span> <span class="state-on">Good</span></div>
            </div>

            <article class="log-entry diag-card-clickable" data-equip="lights">
                <i class="fa-solid fa-lightbulb"></i>
                <div>
                    <strong>Grow Light Arrays</strong>
                    <time>12 Panels · <span class="state-warn">Minor Degradation</span></time>
                </div>
                <i class="fa-solid fa-chevron-down toggle-icon"></i>
            </article>
            <div class="equip-detail-list hidden" id="detail-lights">
                <div class="detail-item"><span>Array-R1</span> <span class="state-on">Optimal</span></div>
                <div class="detail-item"><span>Array-R2</span> <span class="state-warn">Flicker Detected</span></div>
                <div class="detail-item"><span>Array-R3</span> <span class="state-on">Optimal</span></div>
            </div>

        </div>
    </section>
</main>


<main class="logging-view app-view hidden" data-view="logging" data-testid="logging-view">

    <section class="logging-panel">
        <header>
            <div>
                <p class="log-kicker">User Activity</p>
                <h2><i class="fa-solid fa-clipboard-list"></i> Logging</h2>
            </div>
            <button class="log-clear-btn" id="clearLogsBtn" type="button">
                <i class="fa-solid fa-trash-can"></i> Clear
            </button>
        </header>
        <div class="log-list" id="logList">
            <div class="log-empty">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>No user actions logged yet.</span>
            </div>
        </div>
    </section>
</main>

<!-- ============================================================ -->
<!-- CCTV modal                                                     -->
<!-- ============================================================ -->
<div class="cctv-modal hidden" id="cctvModal" data-testid="cctv-modal" role="dialog" aria-modal="true">
    <div class="cctv-modal-inner">
        <header>
            <h3 id="modalTitle">Zone</h3>
            <button id="cctvClose" data-testid="cctv-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </header>
                <div class="cctv-modal-feed" id="modalFeed"></div>

        <footer>
            <span><i class="fa-solid fa-circle dot-red"></i> Recording · 1920×1080 · 30fps</span>
            <span><i class="fa-solid fa-cubes-stacked"></i> 5 bags in view</span>
        </footer>
    </div>
</div>

<footer class="page-foot">

    <span>© Mycelium Control · XAMPP / PHP <?= PHP_VERSION ?></span>
    <span id="lastSync" data-testid="last-sync">last sync —</span>
</footer>

<script src="app.js"></script>
</body>
</html>

