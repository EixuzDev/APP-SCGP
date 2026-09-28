/* ============================================================
   AUTH.JS
   Maneja todo el modal de Cuenta: login, registro, perfil (con
   logout y el toggle de tema) y los dos pasos de recuperación de
   contraseña. También decide qué muestra el botón del nav:

   - Con sesión activa   -> iniciales del usuario (abre el perfil)
   - Sin sesión, pero ya
     usó la app antes     -> texto "Iniciar sesión"
   - Sin sesión y nunca
     tuvo cuenta acá      -> texto "Registrarse"

   El "ya usó la app antes" se guarda en localStorage — es una
   pista del navegador, no algo que dependa del backend.
   ============================================================ */

const Auth = (() => {
  const CLAVE_CONOCIDO = 'scgp_conocido';

  let usuarioActual = null;

  const modal = document.getElementById('modal-cuenta');
  const btnPerfil = document.getElementById('btn-perfil');
  const tituloModal = document.getElementById('modal-cuenta-titulo');

  const formLogin = document.getElementById('form-login');
  const formRegistro = document.getElementById('form-registro');
  const vistaPerfil = document.getElementById('vista-perfil');
  const formRecuperarSolicitud = document.getElementById('form-recuperar-solicitud');
  const formRecuperarConfirmar = document.getElementById('form-recuperar-confirmar');

  const btnIrRegistro = document.getElementById('btn-ir-registro');
  const btnIrLogin = document.getElementById('btn-ir-login');
  const btnIrRecuperar = document.getElementById('btn-ir-recuperar');
  const btnRecuperarVolver = document.getElementById('btn-recuperar-volver');
  const btnRecuperarReintentar = document.getElementById('btn-recuperar-reintentar');
  const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
  const btnCambiarTema = document.getElementById('btn-cambiar-tema');
  const btnCambiarTemaTexto = document.getElementById('btn-cambiar-tema-texto');

  const loginError = document.getElementById('login-form-error');
  const registroError = document.getElementById('registro-form-error');
  const recuperarSolicitudError = document.getElementById('recuperar-solicitud-error');
  const recuperarConfirmarError = document.getElementById('recuperar-confirmar-error');

  const inputRecuperarMetodo = document.getElementById('recuperar-metodo');
  const inputRecuperarContacto = document.getElementById('recuperar-contacto');
  const labelRecuperarContacto = document.getElementById('recuperar-contacto-label');
  const hintRecuperarConfirmar = document.getElementById('recuperar-confirmar-hint');

  // Guardamos método + contacto entre el paso 1 y el paso 2 de recuperación.
  let recuperacionEnCurso = { metodo: 'email', contacto: '' };

  const VISTAS = {
    login: formLogin,
    registro: formRegistro,
    perfil: vistaPerfil,
    'recuperar-solicitud': formRecuperarSolicitud,
    'recuperar-confirmar': formRecuperarConfirmar,
  };

  const TITULOS = {
    login: 'Iniciar sesión',
    registro: 'Crear cuenta',
    perfil: 'Mi cuenta',
    'recuperar-solicitud': 'Recuperar contraseña',
    'recuperar-confirmar': 'Confirmar código',
  };

  function esConocido() {
    return localStorage.getItem(CLAVE_CONOCIDO) === '1';
  }

  function marcarComoConocido() {
    localStorage.setItem(CLAVE_CONOCIDO, '1');
  }

  function iniciales(nombre) {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }

  /* ------------------------------------------------------------
     Botón del nav: cambia según haya sesión, y si no la hay, según
     si este navegador ya tuvo una cuenta alguna vez.
     ------------------------------------------------------------ */
  function actualizarBotonPerfil() {
    if (usuarioActual) {
      btnPerfil.textContent = iniciales(usuarioActual.nombre);
      btnPerfil.title = usuarioActual.nombre;
      btnPerfil.classList.remove('avatar--etiqueta');
    } else if (esConocido()) {
      btnPerfil.textContent = 'Iniciar sesión';
      btnPerfil.title = 'Iniciar sesión';
      btnPerfil.classList.add('avatar--etiqueta');
    } else {
      btnPerfil.textContent = 'Registrarse';
      btnPerfil.title = 'Crear una cuenta';
      btnPerfil.classList.add('avatar--etiqueta');
    }
  }

  function mostrarVista(cual) {
    Object.entries(VISTAS).forEach(([nombre, el]) => {
      el.hidden = nombre !== cual;
    });
    tituloModal.textContent = TITULOS[cual];
  }

  function abrirModal() {
    if (usuarioActual) {
      pintarPerfil();
      mostrarVista('perfil');
    } else {
      mostrarVista(esConocido() ? 'login' : 'registro');
    }
    modal.hidden = false;
  }

  function cerrarModal() {
    modal.hidden = true;
    [loginError, registroError, recuperarSolicitudError, recuperarConfirmarError].forEach(
      (el) => (el.hidden = true)
    );
  }

  /* ------------------------------------------------------------
     Perfil
     ------------------------------------------------------------ */
  function pintarPerfil() {
    document.getElementById('perfil-nombre').textContent = usuarioActual.nombre;
    document.getElementById('perfil-username').textContent = '@' + usuarioActual.username;
    document.getElementById('perfil-email').textContent = usuarioActual.email;
    document.getElementById('perfil-fecha-registro').textContent = Utils.formatFechaRegistro(
      usuarioActual.fecha_registro
    );
    actualizarTextoTema();
  }

  function actualizarTextoTema() {
    btnCambiarTemaTexto.textContent =
      Theme.actual() === 'oscuro' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  }

  /* ------------------------------------------------------------
     Sesión (carga inicial, login, registro, logout)
     ------------------------------------------------------------ */
  async function cargarSesion() {
    try {
      usuarioActual = await API.obtenerSesion();
      if (usuarioActual) marcarComoConocido();
    } catch (_) {
      usuarioActual = null;
    }
    actualizarBotonPerfil();
    return usuarioActual;
  }

  async function manejarLogin(e) {
    e.preventDefault();
    loginError.hidden = true;
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      usuarioActual = await API.login(email, password);
      marcarComoConocido();
      actualizarBotonPerfil();
      cerrarModal();
      document.dispatchEvent(new CustomEvent('sesion:cambio'));
    } catch (err) {
      loginError.textContent = err.message || 'No se pudo iniciar sesión.';
      loginError.hidden = false;
    }
  }

  async function manejarRegistro(e) {
    e.preventDefault();
    registroError.hidden = true;
    const nombre = document.getElementById('registro-nombre').value.trim();
    const username = document.getElementById('registro-username').value.trim();
    const email = document.getElementById('registro-email').value.trim();
    const password = document.getElementById('registro-password').value;

    try {
      usuarioActual = await API.registrar(nombre, username, email, password);
      marcarComoConocido();
      actualizarBotonPerfil();
      cerrarModal();
      document.dispatchEvent(new CustomEvent('sesion:cambio'));
    } catch (err) {
      registroError.textContent = err.message || 'No se pudo crear la cuenta.';
      registroError.hidden = false;
    }
  }

  async function manejarLogout() {
    try {
      await API.cerrarSesion();
    } catch (_) {
      // Si falla el pedido de logout igual limpiamos el estado local.
    }
    usuarioActual = null;
    actualizarBotonPerfil();
    mostrarVista('login'); // esConocido() ya es true, así que corresponde login.
    document.dispatchEvent(new CustomEvent('sesion:cambio'));
  }

  /* ------------------------------------------------------------
     Recuperación de contraseña (2 pasos, 2 métodos)
     ------------------------------------------------------------ */
  function bindToggleMetodoRecuperacion() {
    const botones = formRecuperarSolicitud.querySelectorAll('.type-toggle button');
    botones.forEach((btn) => {
      btn.addEventListener('click', () => {
        botones.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        const metodo = btn.dataset.metodo;
        inputRecuperarMetodo.value = metodo;
        labelRecuperarContacto.textContent = metodo ===  'Tu email';
        inputRecuperarContacto.type = metodo === 'email';
        inputRecuperarContacto.placeholder = metodo === 'email';
      });
    });
  }

  async function manejarSolicitudRecuperacion(e) {
    e.preventDefault();
    recuperarSolicitudError.hidden = true;

    const metodo = inputRecuperarMetodo.value;
    const contacto = inputRecuperarContacto.value.trim();

    try {
      const respuesta = await API.solicitarRecuperacion(metodo, contacto);
      recuperacionEnCurso = { metodo, contacto };

      // MODO DEMO: como todavía no hay email/SMS real conectado, el
      // backend devuelve el código en la respuesta para poder probar
      // el flujo. En producción esto no debería pasar — ver el TODO
      // en Backend/api/auth.php (manejarSolicitarRecuperacion).
      hintRecuperarConfirmar.textContent = respuesta.codigo_demo
        ? `Modo demo: tu código es ${respuesta.codigo_demo} (todavía no hay envío real de ${
            metodo === 'email' ? 'emails' : 'SMS'
          } configurado).`
        : `Te enviamos un código por ${metodo === 'email' ? 'email' : 'SMS'} a ${contacto}.`;

      formRecuperarSolicitud.reset();
      mostrarVista('recuperar-confirmar');
    } catch (err) {
      recuperarSolicitudError.textContent = err.message || 'No se pudo enviar el código.';
      recuperarSolicitudError.hidden = false;
    }
  }

  async function manejarConfirmarRecuperacion(e) {
    e.preventDefault();
    recuperarConfirmarError.hidden = true;

    const codigo = document.getElementById('recuperar-codigo').value.trim();
    const nuevaPassword = document.getElementById('recuperar-nueva-password').value;

    try {
      const respuesta = await API.restablecerPassword(
        recuperacionEnCurso.metodo,
        recuperacionEnCurso.contacto,
        codigo,
        nuevaPassword
      );
      if (!respuesta.ok) {
        throw new Error('El código es inválido o ya venció.');
      }

      formRecuperarConfirmar.reset();
      marcarComoConocido();
      mostrarVista('login');
      loginError.hidden = true;
    } catch (err) {
      recuperarConfirmarError.textContent = err.message || 'No se pudo restablecer la contraseña.';
      recuperarConfirmarError.hidden = false;
    }
  }

  /* ------------------------------------------------------------
     Cableado general de eventos
     ------------------------------------------------------------ */
  function bindEventos() {
    btnPerfil.addEventListener('click', abrirModal);

    btnIrRegistro.addEventListener('click', () => mostrarVista('registro'));
    btnIrLogin.addEventListener('click', () => mostrarVista('login'));
    btnIrRecuperar.addEventListener('click', () => mostrarVista('recuperar-solicitud'));
    btnRecuperarVolver.addEventListener('click', () => mostrarVista('login'));
    btnRecuperarReintentar.addEventListener('click', () => mostrarVista('recuperar-solicitud'));

    btnCerrarSesion.addEventListener('click', manejarLogout);

    btnCambiarTema.addEventListener('click', () => {
      Theme.alternar();
      actualizarTextoTema();
    });

    formLogin.addEventListener('submit', manejarLogin);
    formRegistro.addEventListener('submit', manejarRegistro);
    formRecuperarSolicitud.addEventListener('submit', manejarSolicitudRecuperacion);
    formRecuperarConfirmar.addEventListener('submit', manejarConfirmarRecuperacion);

    bindToggleMetodoRecuperacion();
  }

  function init() {
    bindEventos();
    actualizarBotonPerfil(); // estado inicial, antes de saber si hay sesión
  }

  return {
    init,
    cargarSesion,
    get usuarioActual() {
      return usuarioActual;
    },
  };
})();
