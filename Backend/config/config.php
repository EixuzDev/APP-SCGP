<?php
/**
 * config.php
 * Se incluye al principio de cada endpoint en backend/api/.
 * Centraliza: inicio de sesión, headers comunes y funciones
 * helper para no repetir código en cada archivo de la API.
 */

// --- Sesión (se usa para saber qué usuario está autenticado) ---
session_start();

// --- Headers comunes a toda la API ---
header('Content-Type: application/json; charset=utf-8');

// CORS para desarrollo local (front-end y backend en distinto puerto).
// En producción, reemplazar '*' por el dominio real del front-end.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Las peticiones OPTIONS (preflight de CORS) no necesitan lógica.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Devuelve una respuesta JSON y termina la ejecución.
 */
function responder(array $datos, int $codigoHttp = 200): void
{
    http_response_code($codigoHttp);
    echo json_encode($datos);
    exit;
}

/**
 * Devuelve un error JSON con el formato { "error": "..." }.
 */
function responderError(string $mensaje, int $codigoHttp = 400): void
{
    responder(['error' => $mensaje], $codigoHttp);
}

/**
 * Lee y decodifica el cuerpo JSON de la petición actual.
 */
function leerCuerpoJson(): array
{
    $crudo = file_get_contents('php://input');
    $datos = json_decode($crudo, true);
    return is_array($datos) ? $datos : [];
}

/**
 * Corta la ejecución con 401 si no hay una sesión de usuario activa.
 * Devuelve el id del usuario autenticado para uso inmediato.
 */
function requerirSesion(): int
{
    if (empty($_SESSION['usuario_id'])) {
        responderError('No autenticado. Iniciá sesión para continuar.', 401);
    }
    return (int) $_SESSION['usuario_id'];
}
