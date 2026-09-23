<?php
/**
 * categories.php
 * GET  /categories.php        -> lista las categorías del usuario logueado
 * POST /categories.php        -> crea una categoría { nombre, tipo, presupuesto? }
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

responderError('Método no permitido.', 405);
