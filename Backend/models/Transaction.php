<?php
/**
 * Transaction.php
 * Acceso a la tabla `transactions`. Incluye tanto el CRUD básico
 * como las consultas agregadas (sumas por mes, por categoría) que
 * usa reports.php — se calculan en SQL para no traer filas de más
 * al PHP ni al front-end.
 */

class Transaction
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Lista transacciones de un usuario, con filtros opcionales de
     * tipo, categoría y rango de fechas. Todos los filtros llegan
     * como parámetros ligados (prepared statement), nunca concatenados.
     */
    public function listar(int $usuarioId, array $filtros): array
    {
        $condiciones = ['user_id = :user_id'];
        $params = ['user_id' => $usuarioId];

        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $condiciones[] = 'tipo = :tipo';
            $params['tipo'] = $filtros['tipo'];
        }
        if (!empty($filtros['categoria_id']) && $filtros['categoria_id'] !== 'todas') {
            $condiciones[] = 'categoria_id = :categoria_id';
            $params['categoria_id'] = (int) $filtros['categoria_id'];
        }
        if (!empty($filtros['desde'])) {
            $condiciones[] = 'fecha >= :desde';
            $params['desde'] = $filtros['desde'];
        }
        if (!empty($filtros['hasta'])) {
            $condiciones[] = 'fecha <= :hasta';
            $params['hasta'] = $filtros['hasta'];
        }

        $sql = 'SELECT id, tipo, categoria_id, monto, descripcion, fecha
                FROM transactions
                WHERE ' . implode(' AND ', $condiciones) . '
                ORDER BY fecha DESC, id DESC';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function crear(int $usuarioId, array $datos): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO transactions (user_id, categoria_id, tipo, monto, descripcion, fecha)
             VALUES (:user_id, :categoria_id, :tipo, :monto, :descripcion, :fecha)'
        );
        $stmt->execute([
            'user_id' => $usuarioId,
            'categoria_id' => $datos['categoria_id'],
            'tipo' => $datos['tipo'],
            'monto' => $datos['monto'],
            'descripcion' => $datos['descripcion'],
            'fecha' => $datos['fecha'],
        ]);

        return array_merge(['id' => (int) $this->db->lastInsertId()], $datos);
    }

    /**
     * Elimina una transacción, pero solo si pertenece al usuario que
     * la pide — evita que alguien borre movimientos ajenos adivinando IDs.
     */
    public function eliminar(int $id, int $usuarioId): bool
    {
        $stmt = $this->db->prepare(
            'DELETE FROM transactions WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $id, 'user_id' => $usuarioId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Resumen del mes en curso: balance total histórico, ingresos y
     * gastos del mes actual. Usado por las tarjetas KPI.
     */
    public function resumenMensual(int $usuarioId): array
    {
        $balanceStmt = $this->db->prepare(
            "SELECT COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) AS balance
             FROM transactions WHERE user_id = :user_id"
        );
        $balanceStmt->execute(['user_id' => $usuarioId]);
        $balance = (float) $balanceStmt->fetchColumn();

        $mesStmt = $this->db->prepare(
            "SELECT
                COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
                COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END), 0) AS gastos
             FROM transactions
             WHERE user_id = :user_id
               AND fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01')"
        );
        $mesStmt->execute(['user_id' => $usuarioId]);
        $mes = $mesStmt->fetch();

        return [
            'balance' => $balance,
            'ingresos' => (float) $mes['ingresos'],
            'gastos' => (float) $mes['gastos'],
        ];
    }

    /**
     * Gasto acumulado del mes en curso, agrupado por categoría.
     * Usado tanto para las barras de presupuesto como para el
     * gráfico de distribución.
     */
    public function gastoPorCategoriaDelMes(int $usuarioId): array
    {
        $stmt = $this->db->prepare(
            "SELECT categoria_id, SUM(monto) AS total
             FROM transactions
             WHERE user_id = :user_id
               AND tipo = 'gasto'
               AND fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
             GROUP BY categoria_id"
        );
        $stmt->execute(['user_id' => $usuarioId]);
        return $stmt->fetchAll();
    }

    /**
     * Ingresos y gastos agrupados por mes, para el gráfico de
     * evolución (por defecto, últimos 6 meses).
     */
    public function evolucionMensual(int $usuarioId, int $meses = 6): array
    {
        $stmt = $this->db->prepare(
            "SELECT
                DATE_FORMAT(fecha, '%Y-%m') AS mes,
                COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) AS ingresos,
                COALESCE(SUM(CASE WHEN tipo = 'gasto' THEN monto ELSE 0 END), 0) AS gastos
             FROM transactions
             WHERE user_id = :user_id
               AND fecha >= DATE_SUB(CURDATE(), INTERVAL :meses MONTH)
             GROUP BY mes
             ORDER BY mes"
        );
        $stmt->bindValue(':user_id', $usuarioId, PDO::PARAM_INT);
        $stmt->bindValue(':meses', $meses, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}
