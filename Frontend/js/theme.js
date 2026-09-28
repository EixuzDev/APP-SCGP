/* ============================================================
   THEME.JS
   Maneja el modo claro/oscuro de toda la página. Se aplica seteando
   data-theme="oscuro" en <html>, y todo el color de la app cambia
   solo, porque var.css define las variables de color dos veces
   (una para :root normal y otra bajo [data-theme="oscuro"]).
   La preferencia se guarda en localStorage para que persista entre
   visitas, ya que es una preferencia del navegador/dispositivo, no
   un dato que tenga que vivir en la base de datos.
   ============================================================ */

const Theme = (() => {
  const CLAVE = 'scgp_tema';

  function actual() {
    return localStorage.getItem(CLAVE) || 'claro';
  }

  function aplicar(tema) {
    if (tema === 'oscuro') {
      document.documentElement.setAttribute('data-theme', 'oscuro');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem(CLAVE, tema);
  }

  function alternar() {
    const nuevo = actual() === 'oscuro' ? 'claro' : 'oscuro';
    aplicar(nuevo);
    return nuevo;
  }

  function init() {
    // Se aplica apenas carga el script (antes de pintar el resto de
    // la UI) para que no haya un "flash" de tema claro antes de pasar
    // al oscuro guardado.
    aplicar(actual());
  }

  init();

  return { actual, aplicar, alternar };
})();