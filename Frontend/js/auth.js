/* ============================================================
   AUTH.JS
   Maneja el modal de Cuenta/Perfil (login + registro) y expone
   el usuario actual al resto de la app a través de Auth.usuarioActual.
   ============================================================ */

const Auth = (() => {
  let usuarioActual = null;

  const modal = document.getElementById('modal-cuenta');
  const btnPerfil = document.getElementById('btn-perfil');
  const formLogin = document.getElementById('form-login');
  const formRegistro = document.getElementById('form-registro');
  const btnIrRegistro = document.getElementById('btn-ir-registro');
  const btnIrLogin = document.getElementById('btn-ir-login');
  const loginError = document.getElementById('login-form-error');
  const registroError = document.getElementById('registro-form-error');

  function iniciales(nombre) {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }

  function actualizarBotonPerfil() {
    btnPerfil.textContent = usuarioActual ? iniciales(usuarioActual.nombre) : '--';
    btnPerfil.title = usuarioActual ? usuarioActual.nombre : 'Iniciar sesión';
  }

  function mostrarFormulario(cual) {
    const esLogin = cual === 'login';
    formLogin.hidden = !esLogin;
    formRegistro.hidden = esLogin;
    document.getElementById('modal-cuenta-titulo').textContent = esLogin
      ? 'Iniciar sesión'
      : 'Crear cuenta';
  }

  function abrirModal() {
    modal.hidden = false;
  }

  function cerrarModal() {
    modal.hidden = true;
    loginError.hidden = true;
    registroError.hidden = true;
  }

  async function cargarSesion() {
    try {
      usuarioActual = await API.obtenerSesion();
    } catch (_) {
      usuarioActual = null;
    }
    actualizarBotonPerfil();
    return usuarioActual;
  }

  function bindEventos() {
    btnPerfil.addEventListener('click', abrirModal);
    btnIrRegistro.addEventListener('click', () => mostrarFormulario('registro'));
    btnIrLogin.addEventListener('click', () => mostrarFormulario('login'));

    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginError.hidden = true;
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        usuarioActual = await API.login(email, password);
        actualizarBotonPerfil();
        cerrarModal();
        document.dispatchEvent(new CustomEvent('sesion:cambio'));
      } catch (err) {
        loginError.textContent = err.message || 'No se pudo iniciar sesión.';
        loginError.hidden = false;
      }
    });

    formRegistro.addEventListener('submit', async (e) => {
      e.preventDefault();
      registroError.hidden = true;
      const nombre = document.getElementById('registro-nombre').value.trim();
      const email = document.getElementById('registro-email').value.trim();
      const password = document.getElementById('registro-password').value;

      try {
        usuarioActual = await API.registrar(nombre, email, password);
        actualizarBotonPerfil();
        cerrarModal();
        document.dispatchEvent(new CustomEvent('sesion:cambio'));
      } catch (err) {
        registroError.textContent = err.message || 'No se pudo crear la cuenta.';
        registroError.hidden = false;
      }
    });
  }

  function init() {
    bindEventos();
    mostrarFormulario('login');
  }

  return {
    init,
    cargarSesion,
    get usuarioActual() {
      return usuarioActual;
    },
  };
})();
