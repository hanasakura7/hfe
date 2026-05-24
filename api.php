<?php
/**
 * api.php
 * Consolidated routing endpoint for the Smart Mushroom Farm Dashboard.
 *
 * Supported actions (?action=...):
 *   GET  get_room_data       &room_id=N   -> room+env+thresholds+cycle+alerts
 *   GET  get_all_alerts                   -> latest unresolved alerts (all rooms)
 *   POST update_thresholds                -> JSON body: { room_id, temp_min, ... }
 *   POST advance_phase                    -> JSON body: { room_id }
 *   POST restart_cycle                    -> JSON body: { room_id }
 *   POST simulate                         -> regenerate env data for all rooms
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/db_connect.php';

// ----------------- helpers -------------------------------------------------
function json_input(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function send(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function fail(string $msg, int $code = 400): void
{
    send(['success' => false, 'error' => $msg], $code);
}

/** Ordered list of growth phases and their typical durations (days). */
function phase_plan(): array
{
    return [
        'seeding'      => 3,
        'colonisation' => 14,
        'initiation'   => 5,
        'fruiting'     => 7,
        'harvest'      => 6,
    ];
}

function next_phase(string $current): ?string
{
    $phases = array_keys(phase_plan());
    $idx = array_search($current, $phases, true);
    if ($idx === false || $idx === count($phases) - 1) {
        return null;
    }
    return $phases[$idx + 1];
}

/**
 * Generates a fresh random environmental reading for a room.
 * 75% of the time inside thresholds, 25% slightly outside to trigger alerts.
 */
function simulate_reading(array $thr): array
{
    $jitter = function (float $min, float $max, bool $force_out = false) {
        if ($force_out) {
            // push 5-10% outside one of the bounds
            $span = $max - $min;
            return (mt_rand(0, 1) === 0)
                ? $min - $span * (mt_rand(5, 12) / 100)
                : $max + $span * (mt_rand(5, 12) / 100);
        }
        $r = mt_rand(0, 10000) / 10000;
        return $min + $r * ($max - $min);
    };

    $outOfRange = mt_rand(1, 100) <= 25;
    $whichOut = $outOfRange ? mt_rand(1, 5) : 0;

    return [
        'temperature' => round($jitter((float)$thr['temp_min'], (float)$thr['temp_max'], $whichOut === 1), 2),
        'humidity'    => round($jitter((float)$thr['humidity_min'], (float)$thr['humidity_max'], $whichOut === 2), 2),
        'lighting'    => (int) round($jitter((float)$thr['light_min'], (float)$thr['light_max'], $whichOut === 3)),
        'co2_level'   => (int) round($jitter((float)$thr['co2_min'], (float)$thr['co2_max'], $whichOut === 4)),
        'air_flow'    => round($jitter((float)$thr['airflow_min'], (float)$thr['airflow_max'], $whichOut === 5), 2),
    ];
}

/** Inspect a reading against thresholds and produce alert messages. */
function detect_alerts(array $env, array $thr, string $mushroom): array
{
    $alerts = [];
    if ($env['temperature'] < $thr['temp_min']) {
        $alerts[] = ['danger',  "Temperature low in $mushroom room — heater engaged."];
    } elseif ($env['temperature'] > $thr['temp_max']) {
        $alerts[] = ['warning', "Temperature high in $mushroom room — cooling fan engaged."];
    }
    if ($env['humidity'] < $thr['humidity_min']) {
        $alerts[] = ['warning', "Humidity below target in $mushroom room — humidifier ON."];
    } elseif ($env['humidity'] > $thr['humidity_max']) {
        $alerts[] = ['info',    "Humidity above target in $mushroom room — passive vent."];
    }
    if ($env['lighting'] < $thr['light_min']) {
        $alerts[] = ['info',    "Low lighting in $mushroom room — grow lights ON."];
    } elseif ($env['lighting'] > $thr['light_max']) {
        $alerts[] = ['info',    "Lighting too bright in $mushroom room — dimming."];
    }
    if ($env['co2_level'] > $thr['co2_max']) {
        $alerts[] = ['danger',  "CO₂ level critical in $mushroom room — exhaust ON."];
    } elseif ($env['co2_level'] < $thr['co2_min']) {
        $alerts[] = ['warning', "CO₂ below baseline in $mushroom room."];
    }
    if ($env['air_flow'] < $thr['airflow_min']) {
        $alerts[] = ['warning', "Air flow weak in $mushroom room — ventilation ON."];
    } elseif ($env['air_flow'] > $thr['airflow_max']) {
        $alerts[] = ['info',    "Air flow high in $mushroom room — ventilation throttled."];
    }
    return $alerts;
}

/** Refresh stored env_data for every room and log alerts (if out of range). */
function refresh_all_rooms(PDO $pdo): void
{
    $rooms = $pdo->query(
        "SELECT r.id, r.mushroom_type,
                e.cycle_day_current, e.cycle_day_total, e.last_updated,
                t.temp_min, t.temp_max, t.humidity_min, t.humidity_max,
                t.light_min, t.light_max, t.co2_min, t.co2_max,
                t.airflow_min, t.airflow_max
         FROM rooms r
         JOIN environmental_data e ON e.room_id = r.id
         JOIN threshold_settings t ON t.room_id = r.id"
    )->fetchAll();

    $updEnv = $pdo->prepare(
        "UPDATE environmental_data
            SET temperature=?, humidity=?, lighting=?, co2_level=?, air_flow=?
          WHERE room_id=?"
    );
    $insAlert = $pdo->prepare(
        "INSERT INTO system_alerts (room_id, alert_message, severity) VALUES (?, ?, ?)"
    );

    foreach ($rooms as $r) {
        $reading = simulate_reading($r);
        $updEnv->execute([
            $reading['temperature'], $reading['humidity'], $reading['lighting'],
            $reading['co2_level'], $reading['air_flow'], $r['id'],
        ]);

        $alerts = detect_alerts($reading, $r, $r['mushroom_type']);
        foreach ($alerts as [$sev, $msg]) {
            $insAlert->execute([$r['id'], $msg, $sev]);
        }
    }

    // auto-cap alert history at ~120 rows
    $pdo->exec(
        "DELETE FROM system_alerts
          WHERE id NOT IN (
            SELECT id FROM (
              SELECT id FROM system_alerts
              ORDER BY timestamp DESC LIMIT 120
            ) t)"
    );
}

/** Build aggregated room state payload. */
function room_state(PDO $pdo, int $roomId): array
{
    $stmt = $pdo->prepare("SELECT * FROM rooms WHERE id = ?");
    $stmt->execute([$roomId]);
    $room = $stmt->fetch();
    if (!$room) {
        fail('Room not found.', 404);
    }

    $stmt = $pdo->prepare("SELECT * FROM environmental_data WHERE room_id = ?");
    $stmt->execute([$roomId]);
    $env = $stmt->fetch() ?: [];

    $stmt = $pdo->prepare("SELECT * FROM threshold_settings WHERE room_id = ?");
    $stmt->execute([$roomId]);
    $thr = $stmt->fetch() ?: [];

    $stmt = $pdo->prepare("SELECT * FROM cycle_tracker WHERE room_id = ?");
    $stmt->execute([$roomId]);
    $cycle = $stmt->fetch() ?: [];

    $cycle['is_overdue'] = !empty($cycle['phase_due_date'])
        && strtotime($cycle['phase_due_date']) < time();

    $stmt = $pdo->prepare(
        "SELECT id, alert_message, severity, timestamp
           FROM system_alerts
          WHERE room_id = ? AND is_resolved = 0
          ORDER BY timestamp DESC LIMIT 25"
    );
    $stmt->execute([$roomId]);
    $alerts = $stmt->fetchAll();

    return [
        'success'   => true,
        'room'      => $room,
        'env'       => $env,
        'thresholds'=> $thr,
        'cycle'     => $cycle,
        'alerts'    => $alerts,
    ];
}

// ----------------- routing -------------------------------------------------
$action = $_GET['action'] ?? $_POST['action'] ?? '';
$pdo = get_pdo();

try {
    switch ($action) {

        // -----------------------------------------------------------------
        case 'get_room_data':
            $roomId = (int) ($_GET['room_id'] ?? 0);
            if ($roomId < 1) fail('room_id required.');

            // refresh ALL rooms each call so global alerts stay fresh
            refresh_all_rooms($pdo);
            send(room_state($pdo, $roomId));
            break;

        // -----------------------------------------------------------------
        case 'get_all_alerts':
            $stmt = $pdo->query(
                "SELECT sa.id, sa.alert_message, sa.severity, sa.timestamp,
                        r.room_number, r.mushroom_type
                   FROM system_alerts sa
                   JOIN rooms r ON r.id = sa.room_id
                  WHERE sa.is_resolved = 0
                  ORDER BY sa.timestamp DESC
                  LIMIT 40"
            );
            send(['success' => true, 'alerts' => $stmt->fetchAll()]);
            break;

        // -----------------------------------------------------------------
        case 'update_thresholds':
            $b = json_input();
            $roomId = (int) ($b['room_id'] ?? 0);
            if ($roomId < 1) fail('room_id required.');

            $fields = ['temp_min','temp_max','humidity_min','humidity_max',
                       'light_min','light_max','co2_min','co2_max',
                       'airflow_min','airflow_max'];

            $vals = [];
            foreach ($fields as $f) {
                if (!isset($b[$f]) || !is_numeric($b[$f])) {
                    fail("Field $f must be numeric.");
                }
                $vals[$f] = $b[$f] + 0; // cast
            }
            // sanity: min <= max
            foreach ([['temp_min','temp_max'],['humidity_min','humidity_max'],
                      ['light_min','light_max'],['co2_min','co2_max'],
                      ['airflow_min','airflow_max']] as [$mn,$mx]) {
                if ($vals[$mn] > $vals[$mx]) {
                    fail("Field $mn cannot exceed $mx.");
                }
            }

            $stmt = $pdo->prepare(
                "UPDATE threshold_settings
                    SET temp_min=?, temp_max=?, humidity_min=?, humidity_max=?,
                        light_min=?, light_max=?, co2_min=?, co2_max=?,
                        airflow_min=?, airflow_max=?
                  WHERE room_id=?"
            );
            $stmt->execute([
                $vals['temp_min'], $vals['temp_max'],
                $vals['humidity_min'], $vals['humidity_max'],
                $vals['light_min'], $vals['light_max'],
                $vals['co2_min'], $vals['co2_max'],
                $vals['airflow_min'], $vals['airflow_max'],
                $roomId,
            ]);

            $pdo->prepare(
                "INSERT INTO system_alerts (room_id, alert_message, severity)
                 VALUES (?, ?, 'info')"
            )->execute([$roomId, 'Threshold settings updated by operator.']);

            send(['success' => true, 'message' => 'Thresholds updated.']);
            break;

        // -----------------------------------------------------------------
        case 'advance_phase':
            $b = json_input();
            $roomId = (int) ($b['room_id'] ?? 0);
            if ($roomId < 1) fail('room_id required.');

            $stmt = $pdo->prepare("SELECT * FROM cycle_tracker WHERE room_id=?");
            $stmt->execute([$roomId]);
            $cycle = $stmt->fetch();
            if (!$cycle) fail('Cycle not found.', 404);

            $current = $cycle['current_phase'];
            $next = next_phase($current);

            if ($next === null) {
                // we were in harvest -> caller should send restart_cycle instead
                fail('Cycle is already at harvest. Use restart_cycle.', 409);
            }

            $plan = phase_plan();
            $days = $plan[$next];

            $stmt = $pdo->prepare(
                "UPDATE cycle_tracker
                    SET current_phase = ?,
                        phase_start_date = NOW(),
                        phase_due_date   = DATE_ADD(NOW(), INTERVAL ? DAY)
                  WHERE room_id = ?"
            );
            $stmt->execute([$next, $days, $roomId]);

            // bump cycle day counter
            $totalDays = array_sum($plan);
            $cumulative = 0;
            foreach ($plan as $ph => $d) {
                $cumulative += $d;
                if ($ph === $next) break;
            }
            $currentDay = max(1, $cumulative - $days + 1);
            $pdo->prepare(
                "UPDATE environmental_data
                    SET cycle_day_current=?, cycle_day_total=?
                  WHERE room_id=?"
            )->execute([$currentDay, $totalDays, $roomId]);

            $pdo->prepare(
                "INSERT INTO system_alerts (room_id, alert_message, severity)
                 VALUES (?, ?, 'info')"
            )->execute([$roomId, "Phase advanced to '$next'."]);

            send(['success' => true, 'message' => "Advanced to $next.", 'next_phase' => $next]);
            break;

        // -----------------------------------------------------------------
        case 'restart_cycle':
            $b = json_input();
            $roomId = (int) ($b['room_id'] ?? 0);
            if ($roomId < 1) fail('room_id required.');

            $plan = phase_plan();

            $pdo->prepare(
                "UPDATE cycle_tracker
                    SET current_phase   = 'seeding',
                        phase_start_date= NOW(),
                        phase_due_date  = DATE_ADD(NOW(), INTERVAL ? DAY)
                  WHERE room_id = ?"
            )->execute([$plan['seeding'], $roomId]);

            $pdo->prepare(
                "UPDATE environmental_data
                    SET cycle_day_current = 1,
                        cycle_day_total   = ?
                  WHERE room_id = ?"
            )->execute([array_sum($plan), $roomId]);

            // wipe old alerts for that room
            $pdo->prepare("UPDATE system_alerts SET is_resolved=1 WHERE room_id=?")
                ->execute([$roomId]);

            $pdo->prepare(
                "INSERT INTO system_alerts (room_id, alert_message, severity)
                 VALUES (?, 'Cycle restarted — fresh seeding phase initiated.', 'info')"
            )->execute([$roomId]);

            send(['success' => true, 'message' => 'Cycle restarted.']);
            break;

        // -----------------------------------------------------------------
        case 'simulate':
            refresh_all_rooms($pdo);
            send(['success' => true, 'message' => 'Environmental data refreshed.']);
            break;

        // -----------------------------------------------------------------
        default:
            fail('Unknown action: ' . htmlspecialchars($action), 400);
    }
} catch (Throwable $e) {
    fail('Server error: ' . $e->getMessage(), 500);
}
