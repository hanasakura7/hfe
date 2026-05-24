<?php
/**
 * db_connect.php
 * Secure persistent PDO connection to MySQL (XAMPP defaults).
 * Adjust DB_USER / DB_PASS if your local XAMPP has been customised.
 */

declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_PORT = 3306;
const DB_NAME = 'mushroom_farm_db';
const DB_USER = 'root';
const DB_PASS = '';
const DB_CHARSET = 'utf8mb4';

function get_pdo(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    );

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_PERSISTENT         => true,
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error'   => 'Database connection failed.',
            'detail'  => $e->getMessage(),
        ]);
        exit;
    }

    return $pdo;
}
