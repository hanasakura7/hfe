"# Smart Mushroom Farm Management Dashboard

A dark-mode, vanilla web stack dashboard for monitoring 3 mushroom incubation
rooms. Built with **HTML5 + CSS3 (Grid/Flex) + ES6 JavaScript** on the frontend,
**PHP 8.x (PDO)** on the backend, and **MySQL** as the datastore — designed to
run on **XAMPP** locally.

## Static room ↔ mushroom mapping

| Room | Mushroom type |
| ---- | ------------- |
| 1    | Grey Oyster   |
| 2    | Black Jelly   |
| 3    | White Oyster  |

This binding is enforced in the SQL schema and never re-asked from the UI.

---

## 1. Prerequisites

- [XAMPP](https://www.apachefriends.org/) (Apache + MySQL + PHP 8.x)
- A modern browser (Chrome / Edge / Firefox)
- Internet (FontAwesome + Google Fonts are loaded via CDN)

---

## 2. Installation

1. **Copy the project** into your XAMPP `htdocs` directory:

   ```
   <XAMPP>/htdocs/mushroom_farm/
       ├── api.php
       ├── app.js
       ├── db_connect.php
       ├── index.php
       ├── README.md
       ├── schema.sql
       └── style.css
   ```

2. **Start Apache + MySQL** from the XAMPP control panel.

3. **Create the database**:
   - Open `http://localhost/phpmyadmin`
   - Click _Import_ → choose `schema.sql` → _Go_

   This creates the database `mushroom_farm_db`, all 5 tables, and pre-seeds
   the 3 rooms with their fixed mushroom types.

4. **(Optional) Adjust DB credentials** in `db_connect.php` (defaults are
   XAMPP's `root` user with empty password).

5. **Open the dashboard**:

   ```
   http://localhost/mushroom_farm/
   ```

---

## 3. Features

### Row 1 — System Alerts Banner (dual mode)

- **AUTO**: alerts fade through the active list every ~4.5 s.
- **MANUAL**: click the left/right arrows (or the `AUTO/MANUAL` pill) to
  pause and step through the full alert history. Auto resumes after 15 s of
  inactivity.

### Row 2 — Room tab selector

- Three tabs (Room 1 / Room 2 / Room 3). Clicking triggers an AJAX (`fetch`)
  call to `api.php?action=get_room_data` and rehydrates everything below
  without a page reload.

### Row 3A — 6-card KPI grid

- Temperature, Humidity, Lighting, CO₂, Air Flow, and a Cycle Day tracker
  (\"Day 14 / 35\").
- Each card has a **machine condition footer** that reacts to the live value
  vs. the room's threshold (Heater ON / Fan ON / Humidifier ON / Exhaust ON…).

### Row 3B — CCTV + Threshold panel

- **Left:** four dummy split-screen camera feeds (1 per zone of 5 mushroom
  bags). Click any zone to open a full-screen modal.
- **Right:** form to rewrite min/max thresholds. Saving fires an AJAX `POST`
  to `api.php?action=update_thresholds`.

### Row 4 — Loop-enabled cycle wizard

- Visual 5-step pipeline: _Seeding → Colonisation → Initiation → Fruiting →
  Harvest_.
- Action button changes label per phase:
  _\"Done seeding phase\" → \"Done colonisation phase\" → … → \"Restart Cycle\"_.
- If the current phase passes its `phase_due_date`, the active step pulses
  with a red overdue indicator and an `OVERDUE` badge appears.
- Clicking **Restart Cycle** (harvest only) wipes timeline metrics and resets
  the tracker to Day 1 of Seeding.

---

## 4. API reference (`api.php`)

| Method | Action              | Params (JSON body unless noted)                                                                                                                 | Description                                                                                                            |
| ------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| GET    | `get_room_data`     | `?room_id=N`                                                                                                                                    | Full state for a room. Also refreshes simulated readings for all rooms and logs alerts when readings cross thresholds. |
| GET    | `get_all_alerts`    | —                                                                                                                                               | Latest 40 unresolved alerts across all rooms.                                                                          |
| POST   | `update_thresholds` | `room_id`, `temp_min`, `temp_max`, `humidity_min`, `humidity_max`, `light_min`, `light_max`, `co2_min`, `co2_max`, `airflow_min`, `airflow_max` | Save new min/max bounds.                                                                                               |
| POST   | `advance_phase`     | `room_id`                                                                                                                                       | Move to next phase, reset due date.                                                                                    |
| POST   | `restart_cycle`     | `room_id`                                                                                                                                       | Reset cycle to Seeding day 1, resolve old alerts.                                                                      |
| POST   | `simulate`          | —                                                                                                                                               | Force a fresh sensor refresh on demand.                                                                                |

All endpoints return JSON with `success: true|false` and either the
requested payload or an `error` string.

---

## 5. Data simulation

Because this template ships without real IoT sensors, `api.php` synthesises
new readings whenever `get_room_data` is called:

- 75% of the time the value is sampled uniformly within the configured
  threshold band.
- 25% of the time one randomly chosen vector is intentionally pushed 5–12%
  outside the band, which triggers a corresponding `system_alerts` row and
  drives the live alert ticker.

This keeps the UI lively without needing hardware. Replace the
`simulate_reading()` function in `api.php` with your real telemetry pull when
you wire up actual sensors.

---

## 6. File map

| File             | Role                                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| `schema.sql`     | DDL + seed data for the 3 fixed rooms.                                          |
| `db_connect.php` | Persistent PDO helper (`get_pdo()`).                                            |
| `api.php`        | Single routing endpoint for all actions.                                        |
| `index.php`      | Semantic structural layout, dynamically lists the 3 rooms.                      |
| `style.css`      | Dark mushroom-earth tones, grid layouts, CCTV modal, ticker animations.         |
| `app.js`         | Master UI state engine (alerts, fetch loops, conditional text, cycle controls). |

---

## 7. Customising thresholds & phases

- **Phase durations** are defined in `api.php → phase_plan()` (in days).
- **Default thresholds** are seeded in `schema.sql`. They can also be edited
  live from the dashboard's _Standard Range Formulation_ panel.
  "
