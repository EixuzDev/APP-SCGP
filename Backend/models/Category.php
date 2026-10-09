<?php
/**
 * Category.php
 * Acceso a la tabla `categories`. Cada categoría pertenece a un
 * usuario (no son globales), tiene un tipo (ingreso/gasto) y,
 * opcionalmente, un presupuesto mensual si es de tipo gasto.
 */

class Category
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function listarPorUsuario(int $usuarioId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, nombre, tipo, presupuesto
             FROM categories
             WHERE user_id = :user_id
             ORDER BY tipo, nombre'
        );
        $stmt->execute(['user_id' => $usuarioId]);

        // PDO devuelve las columnas DECIMAL como texto ("400.00"). Las
        // pasamos a número para que el JSON tenga el tipo correcto y el
        // front-end pueda sumar/comparar sin sorpresas.
        return array_map(function (array $fila): array {
            $fila['id'] = (int) $fila['id'];
            $fila['presupuesto'] = $fila['presupuesto'] !== null ? (float) $fila['presupuesto'] : null;
            return $fila;
        }, $stmt->fetchAll());
    }

    public function crear(int $usuarioId, string $nombre, string $tipo, ?float $presupuesto = null): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO categories (user_id, nombre, tipo, presupuesto)
             VALUES (:user_id, :nombre, :tipo, :presupuesto)'
        );
        $stmt->execute([
            'user_id' => $usuarioId,
            'nombre' => $nombre,
            'tipo' => $tipo,
            'presupuesto' => $presupuesto,
        ]);

        return [
            'id' => (int) $this->db->lastInsertId(),
            'nombre' => $nombre,
            'tipo' => $tipo,
            'presupuesto' => $presupuesto,
        ];
    }

    /**
     * Cuántas transacciones del usuario usan esta categoría. Se usa antes
     * de eliminarla: la tabla `transactions` tiene una FOREIGN KEY con
     * ON DELETE RESTRICT, así que la base no deja borrar una categoría
     * que todavía tenga movimientos asociados.
     */
    public function contarTransacciones(int $categoriaId, int $usuarioId): int
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) FROM transactions
             WHERE categoria_id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $categoriaId, 'user_id' => $usuarioId]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Elimina una categoría, pero solo si pertenece al usuario que la
     * pide. Devuelve false si no existía o era de otra cuenta.
     */
    public function eliminar(int $categoriaId, int $usuarioId): bool
    {
        $stmt = $this->db->prepare(
            'DELETE FROM categories WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $categoriaId, 'user_id' => $usuarioId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Verifica que una categoría exista y pertenezca al usuario dado.
     * Se usa antes de crear una transacción, para que un usuario no
     * pueda registrar movimientos contra categorías ajenas.
     */
    public function perteneceAUsuario(int $categoriaId, int $usuarioId): bool
    {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM categories WHERE id = :id AND user_id = :user_id'
        );
        $stmt->execute(['id' => $categoriaId, 'user_id' => $usuarioId]);
        return (bool) $stmt->fetchColumn();
    }

    /**
     * Categorías iniciales para que un usuario recién registrado
     * tenga algo con qué empezar a cargar transacciones.
     */
    public function crearCategoriasPorDefecto(int $usuarioId): void
    {
        $porDefecto = [
            ['Sueldo', 'ingreso', null],
            ['Otros ingresos', 'ingreso', null],
            ['Vivienda', 'gasto', 600],
            ['Comida', 'gasto', 400],
            ['Transporte', 'gasto', 120],
            ['Ocio', 'gasto', 150],
        ];

        foreach ($porDefecto as [$nombre, $tipo, $presupuesto]) {
            $this->crear($usuarioId, $nombre, $tipo, $presupuesto);
        }
    }
}
