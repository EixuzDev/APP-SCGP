<?php
/**
 * database.php
 * Punto único de conexión a MySQL vía PDO. Se usa un singleton
 * para no abrir una conexión nueva en cada llamada dentro del
 * mismo request.
 *
 * IMPORTANTE: completar las credenciales reales antes de desplegar,
 * o mejor aún, leerlas desde variables de entorno.
 */

class Database
{
    private static ?PDO $instancia = null;

    // --- Credenciales de conexión ---
    private const HOST = 'localhost';
    private const PUERTO = '3306';
    private const NOMBRE_BD = 'scgp';
    private const USUARIO = 'scgp';
    private const PASSWORD = '1234'; // Completar en el servidor real.

    public static function conexion(): PDO
    {
        if (self::$instancia === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                self::HOST,
                self::PUERTO,
                self::NOMBRE_BD
            );

            try {
                self::$instancia = new PDO(
                    $dsn,
                    self::USUARIO,
                    self::PASSWORD,
                    [
                        // Prepared statements reales (no emuladas) + excepciones
                        // en errores, para no tener que chequear el valor de
                        // retorno de cada query a mano.
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                    ]
                );
            } catch (PDOException $e) {
                // No exponemos el mensaje real de PDO al cliente (podría filtrar
                // detalles de la infraestructura); solo lo registramos.
                error_log('Error de conexión a la base de datos: ' . $e->getMessage());
                responderError('Error de conexión con la base de datos.', 500);
            }
        }

        return self::$instancia;
    }
}
