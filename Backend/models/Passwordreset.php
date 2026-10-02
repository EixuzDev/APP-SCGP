<?php
/**
 * PasswordReset.php
 * Maneja los códigos de recuperación de contraseña (por email). El
 * código nunca se guarda en texto plano — se guarda hasheado con
 * password_hash(), igual que las contraseñas.
 */

class PasswordReset
{
    private PDO $db;

    private const MINUTOS_VALIDEZ = 15;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Genera un código de 6 dígitos, invalida los códigos anteriores
     * sin usar de ese usuario, y guarda el nuevo hasheado.
     * Devuelve el código EN TEXTO PLANO — es la única vez que existe
     * así, para poder enviarlo (o, en modo demo, mostrarlo).
     */
    public function generarCodigo(int $usuarioId): string
    {
        // Invalidamos cualquier código anterior todavía vigente, para
        // que no queden códigos viejos utilizables en simultáneo.
        $invalidar = $this->db->prepare(
            'UPDATE password_resets SET usado = 1 WHERE user_id = :user_id AND usado = 0'
        );
        $invalidar->execute(['user_id' => $usuarioId]);

        $codigo = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $hash = password_hash($codigo, PASSWORD_DEFAULT);
        $expira = (new DateTime())->modify('+' . self::MINUTOS_VALIDEZ . ' minutes')->format('Y-m-d H:i:s');

        $stmt = $this->db->prepare(
            'INSERT INTO password_resets (user_id, codigo_hash, expira_en)
             VALUES (:user_id, :hash, :expira)'
        );
        $stmt->execute([
            'user_id' => $usuarioId,
            'hash' => $hash,
            'expira' => $expira,
        ]);

        return $codigo;
    }

    /**
     * Verifica el código más reciente sin usar de un usuario. Si es
     * válido, lo marca como usado (un código sirve una sola vez) y
     * devuelve true.
     */
    public function verificarYConsumir(int $usuarioId, string $codigo): bool
    {
        $stmt = $this->db->prepare(
            'SELECT id, codigo_hash, expira_en
             FROM password_resets
             WHERE user_id = :user_id AND usado = 0
             ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute(['user_id' => $usuarioId]);
        $fila = $stmt->fetch();

        if (!$fila) {
            return false;
        }
        if (new DateTime() > new DateTime($fila['expira_en'])) {
            return false; // Expiró.
        }
        if (!password_verify($codigo, $fila['codigo_hash'])) {
            return false;
        }

        $marcar = $this->db->prepare('UPDATE password_resets SET usado = 1 WHERE id = :id');
        $marcar->execute(['id' => $fila['id']]);

        return true;
    }
}
