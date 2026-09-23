<?php
/**
 * transactions.php
 * GET    /transactions.php?tipo=&categoria_id=&desde=&hasta=  -> listar (con filtros opcionales)
 * POST   /transactions.php  { tipo, categoria_id, monto, descripcion, fecha } -> crear
 * DELETE /transactions.php?id=123 -> eliminar
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Transaction.php';
require_once __DIR__ . '/../models/Category.php';

$db = Database::conexion();
$transactionModel = new Transaction($db);
$categoryModel = new Category($db);
$usuarioId = requerirSesion();

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $filtros = [
        'tipo' => $_GET['tipo'] ?? null,
        'categoria_id' => $_GET['categoria_id'] ?? null,
        'desde' => $_GET['desde'] ?? null,
        'hasta' => $_GET['hasta'] ?? null,
    ];
    responder($transactionModel->listar($usuarioId, $filtros));
}

if ($metodo === 'POST') {
    $datos = leerCuerpoJson();
    validarDatosTransaccion($datos, $categoryModel, $usuarioId);

    $nueva = $transactionModel->crear($usuarioId, $datos);
    responder($nueva, 201);
}

if ($metodo === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        responderError('Falta el id de la transacción a eliminar.');
    }

    $eliminada = $transactionModel->eliminar($id, $usuarioId);
    if (!$eliminada) {
        responderError('Transacción no encontrada.', 404);
    }
    responder(['ok' => true]);
}

responderError('Método no permitido.', 405);

/**
 * Valida el cuerpo recibido para crear una transacción. Corta la
 * ejecución con un error 400 si algo no es válido.
 */
function validarDatosTransaccion(array $datos, Category $categoryModel, int $usuarioId): void
{
    $tipo = $datos['tipo'] ?? '';
    $categoriaId = (int) ($datos['categoria_id'] ?? 0);
    $monto = $datos['monto'] ?? null;
    $descripcion = trim($datos['descripcion'] ?? '');
    $fecha = $datos['fecha'] ?? '';

    if (!in_array($tipo, ['ingreso', 'gasto'], true)) {
        responderError('El tipo debe ser "ingreso" o "gasto".');
    }
    if (!is_numeric($monto) || (float) $monto <= 0) {
        responderError('El monto debe ser un número mayor a 0.');
    }
    if ($descripcion === '') {
        responderError('La descripción es obligatoria.');
    }
    if (!DateTime::createFromFormat('Y-m-d', $fecha)) {
        responderError('La fecha debe tener el formato AAAA-MM-DD.');
    }
    if (!$categoryModel->perteneceAUsuario($categoriaId, $usuarioId)) {
        responderError('La categoría indicada no existe o no te pertenece.', 403);
    }
}
