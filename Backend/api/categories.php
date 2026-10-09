<?php
/**
 * categories.php
 * GET  /categories.php        -> lista las categorías del usuario logueado
 * POST /categories.php        -> crea una categoría { nombre, tipo, presupuesto? }
 * DELETE /categories.php?id=7 -> elimina una categoría (solo si no tiene transacciones)
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Category.php';

$db = Database::conexion();
$categoryModel = new Category($db);
$usuarioId = requerirSesion();

$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    responder($categoryModel->listarPorUsuario($usuarioId));
}

if ($metodo === 'POST') {
    $datos = leerCuerpoJson();
    $nombre = trim($datos['nombre'] ?? '');
    $tipo = $datos['tipo'] ?? '';
    $presupuesto = isset($datos['presupuesto']) ? (float) $datos['presupuesto'] : null;

    if ($nombre === '' || !in_array($tipo, ['ingreso', 'gasto'], true)) {
        responderError('Nombre y tipo ("ingreso" o "gasto") son obligatorios.');
    }

    $categoria = $categoryModel->crear($usuarioId, $nombre, $tipo, $presupuesto);
    responder($categoria, 201);
}

if ($metodo === 'DELETE') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        responderError('Falta el id de la categoría a eliminar.');
    }

    // Primero verificamos que exista Y sea de este usuario (si no, 404:
    // no revelamos si el id pertenece a otra cuenta).
    if (!$categoryModel->perteneceAUsuario($id, $usuarioId)) {
        responderError('Categoría no encontrada.', 404);
    }

    // La base no permite borrar una categoría con movimientos asociados
    // (FOREIGN KEY ... ON DELETE RESTRICT). Lo chequeamos antes para
    // poder devolver un mensaje claro en vez de un error de SQL.
    $cantidad = $categoryModel->contarTransacciones($id, $usuarioId);
    if ($cantidad > 0) {
        $texto = $cantidad === 1 ? '1 transacción asociada' : "$cantidad transacciones asociadas";
        responderError(
            "No se puede eliminar: la categoría tiene $texto. Eliminá o cambiá esas transacciones primero.",
            409
        );
    }

    $categoryModel->eliminar($id, $usuarioId);
    responder(['ok' => true]);
}

responderError('Método no permitido.', 405);
