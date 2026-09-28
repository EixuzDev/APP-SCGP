<?php
/**
 * User.php
 * Todo el acceso a la tabla `users` vive acá. auth.php nunca
 * escribe SQL directamente: le pide los datos a este modelo.
 */

class User
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function buscarPorEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $usuario = $stmt->fetch();
        return $usuario ?: null;
    }

    public function buscarPorId(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, nombre, username, email, fecha_registro
             FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $usuario = $stmt->fetch();
        return $usuario ?: null;
    }

    public function buscarPorUsername(string $username): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);
        $usuario = $stmt->fetch();
        return $usuario ?: null;
    }


    public function crear(string $nombre, string $username, string $email, string $password): array
    {
        // password_hash con el algoritmo por defecto (bcrypt/argon2 según la
        // versión de PHP) — nunca se guarda la contraseña en texto plano.
        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $this->db->prepare(
            'INSERT INTO users (nombre, username, email, password_hash, fecha_registro)
             VALUES (:nombre, :username, :email, :hash, NOW())'
        );
        $stmt->execute([
            'nombre' => $nombre,
            'username' => $username,
            'email' => $email,
            'hash' => $hash,
        ]);

        $id = (int) $this->db->lastInsertId();

        // Al crear el usuario, le damos categorías por defecto para que
        // el dashboard no arranque vacío (ver Category::crearCategoriasPorDefecto).
        (new Category($this->db))->crearCategoriasPorDefecto($id);

        return $this->buscarPorId($id);
    }

    public function verificarPassword(array $usuario, string $password): bool
    {
        return password_verify($password, $usuario['password_hash']);
    }

    /**
     * Usado por el flujo de "olvidé mi contraseña" para fijar una
     * contraseña nueva una vez validado el código de recuperación.
     */
    public function actualizarPassword(int $usuarioId, string $nuevaPassword): void
    {
        $hash = password_hash($nuevaPassword, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
        $stmt->execute(['hash' => $hash, 'id' => $usuarioId]);
    }
}