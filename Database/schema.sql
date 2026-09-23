-- ============================================================
-- schema.sql
-- Esquema de base de datos para el sistema de control de gastos
-- personales. Ejecutar una sola vez contra una base MySQL vacía:
--
--   mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS scgp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE scgp;

-- ------------------------------------------------------------
-- Usuarios registrados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(120)      NOT NULL,
  email          VARCHAR(190)      NOT NULL,
  password_hash  VARCHAR(255)      NOT NULL,
  fecha_registro DATETIME          NOT NULL,

  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Categorías: propias de cada usuario (no globales), con tipo
-- ingreso/gasto y presupuesto mensual opcional.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED      NOT NULL,
  nombre       VARCHAR(80)       NOT NULL,
  tipo         ENUM('ingreso', 'gasto') NOT NULL,
  presupuesto  DECIMAL(12, 2)    NULL, -- solo aplica a categorías de tipo "gasto"

  CONSTRAINT fk_categories_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  INDEX idx_categories_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Transacciones: cada ingreso o gasto registrado.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED      NOT NULL,
  categoria_id  INT UNSIGNED      NOT NULL,
  tipo          ENUM('ingreso', 'gasto') NOT NULL,
  monto         DECIMAL(12, 2)    NOT NULL,
  descripcion   VARCHAR(255)      NOT NULL,
  fecha         DATE              NOT NULL,
  creado_en     TIMESTAMP         DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_transactions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_transactions_category
    FOREIGN KEY (categoria_id) REFERENCES categories(id)
    ON DELETE RESTRICT,

  -- Índices pensados para las consultas más frecuentes: listar por
  -- usuario ordenado por fecha, y agregados por usuario + mes.
  INDEX idx_transactions_user_fecha (user_id, fecha),
  INDEX idx_transactions_user_tipo (user_id, tipo)
) ENGINE=InnoDB;
