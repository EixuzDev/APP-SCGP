/* ============================================================
   main.JS
   Único archivo que conoce a todos los módulos. Se encarga de:
   1. Cablear el cierre genérico de modales (botón X y overlay).
   2. Levantar la sesión del usuario.
   3. Inicializar dashboard, transacciones y auth en orden.
   ============================================================ */

(function bootstrap() {
  function bindCierreDeModales() {
    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay').hidden = true;
      });
    });

    // Cerrar al hacer click fuera del contenido del modal.
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.hidden = true;
      });
    });

    // Cerrar con la tecla Escape.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach((overlay) => {
          overlay.hidden = true;
        });
      }
    });
  }

  async function init() {
    bindCierreDeModales();
    Auth.init();
    await Auth.cargarSesion();

    await Dashboard.actualizar();
    await Transactions.init();

    // Si el usuario inicia sesión o se registra durante el uso,
    // recargamos los datos por si el backend real trae información
    // distinta para esa cuenta.
    document.addEventListener('sesion:cambio', async () => {
      await Dashboard.actualizar();
      await Transactions.pintarHistorial();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();