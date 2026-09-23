/* ============================================================
   API.JS
   Única capa que sabe hablar con el backend. El resto del
   front-end (dashboard.js, transactions.js, auth.js) nunca
   hace fetch() directo: siempre pasa por las funciones de
   este archivo. Así, si mañana cambia la URL del backend o
   el formato de la respuesta, se toca un solo archivo.

   MODO DEMO:
   Como este front-end puede abrirse sin tener el backend PHP
   corriendo (por ejemplo para revisarlo o hacer una demo),
   USE_MOCK_DATA controla si las funciones devuelven datos de
   ejemplo guardados en memoria/localStorage en vez de pegarle
   a la API real. En producción, poner esto en `false`.
   ============================================================ */

const API = (() => {
  // Cambiar a `false` cuando el backend PHP esté desplegado.
  const USE_MOCK_DATA = false;

  // Ajustar según dónde se despliegue el backend (ver backend/api/*.php).
  const BASE_URL = 'http://localhost:8000/api';

  /* ------------------------------------------------------------
     Helper genérico de fetch con manejo de errores consistente.
     ------------------------------------------------------------ */
  async function request(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include', // envía la cookie de sesión PHP
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      // Respuesta sin cuerpo JSON (ej. 204 No Content).
    }

    if (!res.ok) {
      const mensaje = (body && body.error) || `Error de red (${res.status})`;
      throw new Error(mensaje);
    }
    return body;
  }

  /* ------------------------------------------------------------
     MOCK STORE: datos de ejemplo persistidos en localStorage
     para que la demo sobreviva a un refresh de página.
     ------------------------------------------------------------ */
  const MOCK_KEY = 'finora_mock_v1';

  function seedMockData() {
    const hoy = new Date();
    const fecha = (offsetDias) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() - offsetDias);
      return d.toISOString().slice(0, 10);
    };

    return {
      usuario: { id: 1, nombre: 'Cuenta Demo', email: 'demo@finora.app' },
      categorias: [
        { id: 1, nombre: 'Sueldo', tipo: 'ingreso' },
        { id: 2, nombre: 'Freelance', tipo: 'ingreso' },
        { id: 3, nombre: 'Comida', tipo: 'gasto', presupuesto: 400 },
        { id: 4, nombre: 'Transporte', tipo: 'gasto', presupuesto: 120 },
        { id: 5, nombre: 'Ocio', tipo: 'gasto', presupuesto: 150 },
        { id: 6, nombre: 'Vivienda', tipo: 'gasto', presupuesto: 600 },
      ],
      transacciones: [
        { id: 1, tipo: 'ingreso', categoria_id: 1, monto: 2200, descripcion: 'Sueldo mensual', fecha: fecha(20) },
        { id: 2, tipo: 'ingreso', categoria_id: 2, monto: 350, descripcion: 'Proyecto freelance', fecha: fecha(12) },
        { id: 3, tipo: 'gasto', categoria_id: 6, monto: 600, descripcion: 'Alquiler', fecha: fecha(18) },
        { id: 4, tipo: 'gasto', categoria_id: 3, monto: 85.5, descripcion: 'Supermercado', fecha: fecha(14) },
        { id: 5, tipo: 'gasto', categoria_id: 3, monto: 42, descripcion: 'Almuerzo fuera', fecha: fecha(9) },
        { id: 6, tipo: 'gasto', categoria_id: 4, monto: 60, descripcion: 'Nafta', fecha: fecha(7) },
        { id: 7, tipo: 'gasto', categoria_id: 5, monto: 38, descripcion: 'Cine', fecha: fecha(5) },
        { id: 8, tipo: 'gasto', categoria_id: 3, monto: 55.2, descripcion: 'Supermercado', fecha: fecha(2) },
        { id: 9, tipo: 'gasto', categoria_id: 4, monto: 25, descripcion: 'Transporte público', fecha: fecha(1) },
      ],
    };
  }

  function getMockStore() {
    const raw = localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw);
    const seed = seedMockData();
    localStorage.setItem(MOCK_KEY, JSON.stringify(seed));
    return seed;
  }

  function saveMockStore(store) {
    localStorage.setItem(MOCK_KEY, JSON.stringify(store));
  }

  /* ------------------------------------------------------------
     AUTENTICACIÓN
     ------------------------------------------------------------ */
  async function login(email, password) {
    if (USE_MOCK_DATA) {
      const store = getMockStore();
      return store.usuario; // Demo: cualquier credencial "funciona".
    }
    return request('/auth.php?action=login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async function registrar(nombre, email, password) {
    if (USE_MOCK_DATA) {
      const store = getMockStore();
      store.usuario = { id: 1, nombre, email };
      saveMockStore(store);
      return store.usuario;
    }
    return request('/auth.php?action=register', {
      method: 'POST',
      body: JSON.stringify({ nombre, email, password }),
    });
  }

  async function obtenerSesion() {
    if (USE_MOCK_DATA) {
      return getMockStore().usuario;
    }
    return request('/auth.php?action=session');
  }

  async function cerrarSesion() {
    if (USE_MOCK_DATA) return true;
    return request('/auth.php?action=logout', { method: 'POST' });
  }

  /* ------------------------------------------------------------
     CATEGORÍAS
     ------------------------------------------------------------ */
  async function obtenerCategorias() {
    if (USE_MOCK_DATA) return getMockStore().categorias;
    return request('/categories.php');
  }

  /* ------------------------------------------------------------
     TRANSACCIONES
     ------------------------------------------------------------ */
  async function obtenerTransacciones(filtros = {}) {
    if (USE_MOCK_DATA) {
      let lista = getMockStore().transacciones;
      if (filtros.tipo && filtros.tipo !== 'todos') {
        lista = lista.filter((t) => t.tipo === filtros.tipo);
      }
      if (filtros.categoria_id && filtros.categoria_id !== 'todas') {
        lista = lista.filter((t) => String(t.categoria_id) === String(filtros.categoria_id));
      }
      if (filtros.desde) {
        lista = lista.filter((t) => t.fecha >= filtros.desde);
      }
      if (filtros.hasta) {
        lista = lista.filter((t) => t.fecha <= filtros.hasta);
      }
      return [...lista].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    }

    const params = new URLSearchParams(filtros).toString();
    return request(`/transactions.php?${params}`);
  }

  async function crearTransaccion(datos) {
    if (USE_MOCK_DATA) {
      const store = getMockStore();
      const nuevoId = Math.max(0, ...store.transacciones.map((t) => t.id)) + 1;
      const nueva = { id: nuevoId, ...datos };
      store.transacciones.push(nueva);
      saveMockStore(store);
      return nueva;
    }
    return request('/transactions.php', {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  }

  async function eliminarTransaccion(id) {
    if (USE_MOCK_DATA) {
      const store = getMockStore();
      store.transacciones = store.transacciones.filter((t) => t.id !== id);
      saveMockStore(store);
      return true;
    }
    return request(`/transactions.php?id=${id}`, { method: 'DELETE' });
  }

  /* ------------------------------------------------------------
     REPORTES (datos agregados para KPIs y gráficos)
     ------------------------------------------------------------ */
  async function obtenerResumenMensual() {
    // En modo real, este endpoint hace las sumas en SQL en vez de
    // traer todas las transacciones al front-end (ver reports.php).
    if (USE_MOCK_DATA) {
      const store = getMockStore();
      const inicioMes = new Date();
      inicioMes.setDate(1);
      const inicioMesStr = inicioMes.toISOString().slice(0, 10);

      const delMes = store.transacciones.filter((t) => t.fecha >= inicioMesStr);
      const ingresos = delMes.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
      const gastos = delMes.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);
      const balance = store.transacciones.reduce(
        (s, t) => s + (t.tipo === 'ingreso' ? t.monto : -t.monto),
        0
      );

      return { balance, ingresos, gastos };
    }
    return request('/reports.php?action=resumen');
  }

  return {
    login,
    registrar,
    obtenerSesion,
    cerrarSesion,
    obtenerCategorias,
    obtenerTransacciones,
    crearTransaccion,
    eliminarTransaccion,
    obtenerResumenMensual,
    USE_MOCK_DATA,
  };
})();
