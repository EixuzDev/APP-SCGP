-- ============================================================
-- migracion_perfil_recuperacion.sql
-- Para tu caso puntual: users, categories y transactions ya están
-- bien (con username/telefono incluidos). Lo único que falta es
-- esta tabla, sin FOREIGN KEY para evitar el error de constraint
-- que te venía dando en tu MySQL.
--
-- Corré esto desde MySQL Workbench, parado en la base scgp
-- (File → Open SQL Script… → Execute all).
-- ============================================================

USE scgp;

DROP TABLE IF EXISTS password_resets;

CREATE TABLE password_resets (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED      NOT NULL,
  codigo_hash VARCHAR(255)      NOT NULL,
  expira_en   DATETIME          NOT NULL,
  usado       TINYINT(1)        NOT NULL DEFAULT 0,
  creado_en   TIMESTAMP         DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_password_resets_user (user_id)
) ENGINE=InnoDB;
