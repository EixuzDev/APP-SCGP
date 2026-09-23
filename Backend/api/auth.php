<?php
/**
 * auth.php
 * Endpoints de autenticación. Se distinguen por el parámetro
 * ?action=, ya que las cuatro operaciones son livianas y no
 * justifican un archivo por separado:
 *
 *   POST /auth.php?action=register  { nombre, email, password }
 *   POST /auth.php?action=login     { email, password }
 *   GET  /auth.php?action=session
 *   POST /auth.php?action=logout
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Category.php';

$db = Database::conexion();
$userModel = new User($db);
$accion = $_GET['action'] ?? '';

switch ($accion) {
    case 'register':
        manejarRegistro($userModel);
        break;

    case 'login':
        manejarLogin($userModel);
        break;

    case 'session':
        manejarSesionActual($userModel);
        break;

    case 'logout':
        manejarLogout();
        break;

    default:
        responderError('Acción no reconocida.', 404);
}

function manejarRegistro(User $userModel): void
{
    $datos = leerCuerpoJson();
    $nombre = trim($datos['nombre'] ?? '');
    $email = trim(strtolower($datos['email'] ?? ''));
    $password = $datos['password'] ?? '';

    if ($nombre === '' || $email === '' || strlen($password) < 6) {
        responderError('Nombre, email y una contraseña de al menos 6 caracteres son obligatorios.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        responderError('El email no es válido.');
    }
    if ($userModel->buscarPorEmail($email)) {
        responderError('Ya existe una cuenta con ese email.', 409);
    }

    $usuario = $userModel->crear($nombre, $email, $password);
    $_SESSION['usuario_id'] = $usuario['id'];

    responder($usuario, 201);
}

function manejarLogin(User $userModel): void
{
    $datos = leerCuerpoJson();
    $email = trim(strtolower($datos['email'] ?? ''));
    $password = $datos['password'] ?? '';

    $usuario = $userModel->buscarPorEmail($email);

    // Mensaje genérico a propósito: no distinguimos "email no existe" de
    // "contraseña incorrecta" para no facilitar enumeración de cuentas.
    if (!$usuario || !$userModel->verificarPassword($usuario, $password)) {
        responderError('Email o contraseña incorrectos.', 401);
    }

    $_SESSION['usuario_id'] = $usuario['id'];

    responder([
        'id' => $usuario['id'],
        'nombre' => $usuario['nombre'],
        'email' => $usuario['email'],
    ]);
}

function manejarSesionActual(User $userModel): void
{
    if (empty($_SESSION['usuario_id'])) {
        responderError('No hay sesión activa.', 401);
    }

    $usuario = $userModel->buscarPorId((int) $_SESSION['usuario_id']);
    if (!$usuario) {
        responderError('No hay sesión activa.', 401);
    }

    responder($usuario);
}

function manejarLogout(): void
{
    $_SESSION = [];
    session_destroy();
    responder(['ok' => true]);
}
