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
        $stmt = $this->db->prepare('SELECT id, nombre, email FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $usuario = $stmt->fetch();
        return $usuario ?: null;
    }

    public function crear(string $nombre, string $email, string $password): array
    {
        // password_hash con el algoritmo por defecto (bcrypt/argon2 según la
        // versión de PHP) — nunca se guarda la contraseña en texto plano.
        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $this->db->prepare(
            'INSERT INTO users (nombre, email, password_hash, fecha_registro)
             VALUES (:nombre, :email, :hash, NOW())'
        );
        $stmt->execute(['nombre' => $nombre, 'email' => $email, 'hash' => $hash]);

        $id = (int) $this->db->lastInsertId();

        // Al crear el usuario, le damos categorías por defecto para que
        // el dashboard no arranque vacío (ver Category::crearCategoriasPorDefecto).
        (new Category($this->db))->crearCategoriasPorDefecto($id);

        return ['id' => $id, 'nombre' => $nombre, 'email' => $email];
    }

    public function verificarPassword(array $usuario, string $password): bool
    {
        return password_verify($password, $usuario['password_hash']);
    }
}
