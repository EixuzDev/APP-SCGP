<?php
/**
 * reports.php
 * Endpoints de solo lectura con datos ya agregados en SQL, para
 * que el front-end no tenga que traer todas las transacciones y
 * sumarlas en JavaScript.
 *
 *   GET /reports.php?action=resumen      -> balance, ingresos y gastos del mes
 *   GET /reports.php?action=distribucion -> gasto por categoría (mes actual)
 *   GET /reports.php?action=evolucion    -> ingresos/gastos de los últimos N meses
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Transaction.php';
require_once __DIR__ . '/../models/Category.php';

$db = Database::conexion();
$transactionModel = new Transaction($db);
$categoryModel = new Category($db);
$usuarioId = requerirSesion();

$accion = $_GET['action'] ?? '';

switch ($accion) {
    case 'resumen':
        responder($transactionModel->resumenMensual($usuarioId));
        break;

    case 'distribucion':
        $porCategoria = $transactionModel->gastoPorCategoriaDelMes($usuarioId);
        $categorias = $categoryModel->listarPorUsuario($usuarioId);
        $nombresPorId = array_column($categorias, 'nombre', 'id');

        $resultado = array_map(
            fn($fila) => [
                'nombre' => $nombresPorId[$fila['categoria_id']] ?? 'Otros',
                'total' => (float) $fila['total'],
            ],
            $porCategoria
        );
        responder($resultado);
        break;

    case 'evolucion':
        $meses = (int) ($_GET['meses'] ?? 6);
        responder($transactionModel->evolucionMensual($usuarioId, $meses));
        break;

    default:
        responderError('Acción no reconocida.', 404);
}
