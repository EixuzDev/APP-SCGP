<?php
/**
 * auth.php
 * Endpoints de autenticación. Se distinguen por el parámetro
 * ?action=, ya que estas operaciones son livianas y no
 * justifican un archivo por separado:
 *
 *   POST /auth.php?action=register              { nombre, username, email, password }
 *   POST /auth.php?action=login                 { email, password }
 *   GET  /auth.php?action=session
 *   POST /auth.php?action=logout
 *   POST /auth.php?action=solicitar-recuperacion   { email }
 *   POST /auth.php?action=restablecer-password     { email, codigo, nueva_password }
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Category.php';
require_once __DIR__ . '/../models/PasswordReset.php';

$db = Database::conexion();
$userModel = new User($db);
$resetModel = new PasswordReset($db);
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

    case 'solicitar-recuperacion':
        manejarSolicitarRecuperacion($userModel, $resetModel);
        break;

    case 'restablecer-password':
        manejarRestablecerPassword($userModel, $resetModel);
        break;

    default:
        responderError('Acción no reconocida.', 404);
}

function manejarRegistro(User $userModel): void
{
    $datos = leerCuerpoJson();
    $nombre = trim($datos['nombre'] ?? '');
    $username = trim($datos['username'] ?? '');
    $email = trim(strtolower($datos['email'] ?? ''));
    $password = $datos['password'] ?? '';

    if ($nombre === '' || $username === '' || $email === '' || strlen($password) < 6) {
        responderError('Nombre de usuario, email y una contraseña de al menos 6 caracteres son obligatorios.');
    }
    if (!preg_match('/^[a-zA-Z0-9_.]{3,50}$/', $username)) {
        responderError('El nombre de usuario solo puede tener letras, números, "_" y "." (mínimo 3 caracteres).');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        responderError('El email no es válido.');
    }
    if ($userModel->buscarPorEmail($email)) {
        responderError('Ya existe una cuenta con ese email.', 409);
    }
    if ($userModel->buscarPorUsername($username)) {
        responderError('Ese nombre de usuario ya está en uso.', 409);
    }

    $usuario = $userModel->crear($nombre, $username, $email, $password);
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

    responder($userModel->buscarPorId((int) $usuario['id']));
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

/**
 * Paso 1 de "olvidé mi contraseña": busca al usuario por email y
 * genera un código de 6 dígitos.
 *
 * IMPORTANTE — MODO DEMO:
 * Todavía no hay un proveedor real de email conectado, así que el
 * código se devuelve directo en la respuesta para poder probar el
 * flujo completo. Antes de llevar esto a producción hay que enviarlo
 * de verdad con PHPMailer (SMTP) en vez de devolverlo acá, y borrar
 * la línea que agrega 'codigo_demo' a la respuesta.
 */
function manejarSolicitarRecuperacion(User $userModel, PasswordReset $resetModel): void
{
    $datos = leerCuerpoJson();
    $email = trim(strtolower($datos['email'] ?? ''));

    if ($email === '') {
        responderError('Indicá el email de tu cuenta.');
    }

    $usuario = $userModel->buscarPorEmail($email);

    // Mensaje genérico a propósito: no confirmamos si el email existe
    // o no en la base, para no facilitar enumeración de cuentas.
    if (!$usuario) {
        responder(['ok' => true, 'mensaje' => 'Si el email coincide con una cuenta, vas a recibir un código.']);
    }

    $codigo = $resetModel->generarCodigo((int) $usuario['id']);

    // TODO: reemplazar esto por el envío real por SMTP y sacar
    // 'codigo_demo' de la respuesta.
    responder([
        'ok' => true,
        'mensaje' => 'Si el email coincide con una cuenta, vas a recibir un código.',
        'codigo_demo' => $codigo,
    ]);
}

/**
 * Paso 2: valida el código contra el usuario encontrado por email, y
 * si es correcto, fija la nueva contraseña.
 */
function manejarRestablecerPassword(User $userModel, PasswordReset $resetModel): void
{
    $datos = leerCuerpoJson();
    $email = trim(strtolower($datos['email'] ?? ''));
    $codigo = trim($datos['codigo'] ?? '');
    $nuevaPassword = $datos['nueva_password'] ?? '';

    if ($email === '' || $codigo === '') {
        responderError('Faltan datos para restablecer la contraseña.');
    }
    if (strlen($nuevaPassword) < 6) {
        responderError('La nueva contraseña debe tener al menos 6 caracteres.');
    }

    $usuario = $userModel->buscarPorEmail($email);

    if (!$usuario || !$resetModel->verificarYConsumir((int) $usuario['id'], $codigo)) {
        responderError('El código es inválido o ya venció.', 401);
    }

    $userModel->actualizarPassword((int) $usuario['id'], $nuevaPassword);

    responder(['ok' => true]);
}
