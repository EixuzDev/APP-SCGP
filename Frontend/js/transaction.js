/* ============================================================
   TRANSACTIONS.JS
   Todo lo relacionado al historial de movimientos: filtros,
   listado, y el formulario del modal "Nueva transacción".
   Cuando algo cambia (alta o borrado), le pide a Dashboard que
   recalcule KPIs/presupuesto/gráficos — así nunca se desincronizan.
   ============================================================ */

const Transactions = (() => {
  const listaEl = document.getElementById('tx-list');
  const emptyEl = document.getElementById('tx-empty');

  const filtroTipo = document.getElementById('filtro-tipo');
  const filtroCategoria = document.getElementById('filtro-categoria');
  const filtroDesde = document.getElementById('filtro-desde');
  const filtroHasta = document.getElementById('filtro-hasta');

  const modal = document.getElementById('modal-transaccion');
  const form = document.getElementById('form-transaccion');
  const btnNueva = document.getElementById('btn-nueva-transaccion');
  const selectCategoriaForm = document.getElementById('tx-categoria');
  const inputTipoOculto = document.getElementById('tx-tipo');
  const formError = document.getElementById('tx-form-error');

  const panelCategoriaNueva = document.getElementById('tx-categoria-nueva');
  const inputCategoriaNuevaNombre = document.getElementById('tx-categoria-nueva-nombre');
  const inputCategoriaNuevaPresupuesto = document.getElementById('tx-categoria-nueva-presupuesto');
  const wrapCategoriaNuevaPresupuesto = document.getElementById('tx-categoria-nueva-presupuesto-wrap');
  const errorCategoriaNueva = document.getElementById('tx-categoria-nueva-error');
  const btnCrearCategoria = document.getElementById('btn-crear-categoria');

  const VALOR_NUEVA_CATEGORIA = '__nueva__';

  /* ------------------------------------------------------------
     Íconos simples (flecha arriba/abajo) para diferenciar
     ingresos y gastos en cada fila del historial.
     ------------------------------------------------------------ */
  const ICONO_INGRESO = '↑';
  const ICONO_GASTO = '↓';

  function renderFila(tx, nombreCategoria) {
    const esIngreso = tx.tipo === 'ingreso';
    return `
      <div class="tx-row" data-id="${tx.id}">
        <span class="tx-row__icon ${esIngreso ? '' : 'tx-row__icon--expense'}">
          ${esIngreso ? ICONO_INGRESO : ICONO_GASTO}
        </span>
        <span class="tx-row__main">
          <div class="tx-row__desc">${tx.descripcion}</div>
          <div class="tx-row__meta">${nombreCategoria}</div>
        </span>
        <span class="tx-row__amount ${esIngreso ? 'tx-row__amount--income' : 'tx-row__amount--expense'}">
          ${esIngreso ? '+' : '-'}${Utils.formatMoney(tx.monto)}
        </span>
        <span class="tx-row__date">
          ${Utils.formatDate(tx.fecha)}
          <button class="btn--danger-text" data-borrar="${tx.id}" title="Eliminar" aria-label="Eliminar transacción">&times;</button>
        </span>
      </div>`;
  }

  async function pintarHistorial() {
    const filtros = {
      tipo: filtroTipo.value,
      categoria_id: filtroCategoria.value,
      desde: filtroDesde.value || undefined,
      hasta: filtroHasta.value || undefined,
    };

    const transacciones = await API.obtenerTransacciones(filtros);
    const categorias = Dashboard.getCategorias();

    if (transacciones.length === 0) {
      listaEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    listaEl.innerHTML = transacciones
      .map((tx) => {
        const cat = categorias.find((c) => c.id === tx.categoria_id);
        return renderFila(tx, cat ? cat.nombre : 'Sin categoría');
      })
      .join('');
  }

  /* ------------------------------------------------------------
     Poblar los <select> de categoría (filtro + formulario) según
     el tipo elegido.
     ------------------------------------------------------------ */
  function poblarSelectFiltroCategoria() {
    const categorias = Dashboard.getCategorias();
    filtroCategoria.innerHTML =
      '<option value="todas">Todas las categorías</option>' +
      categorias.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join('');
  }

  function poblarSelectFormulario(tipo) {
    const categorias = Dashboard.getCategorias().filter((c) => c.tipo === tipo);
    selectCategoriaForm.innerHTML =
      categorias.map((c) => `<option value="${c.id}">${c.nombre}</option>`).join('') +
      `<option value="${VALOR_NUEVA_CATEGORIA}">+ Agregar categoría nueva…</option>`;
    ocultarFormularioNuevaCategoria();
  }

  /* ------------------------------------------------------------
     Mini-formulario para crear una categoría nueva sin salir del
     modal de "Nueva transacción".
     ------------------------------------------------------------ */
  function mostrarFormularioNuevaCategoria() {
    panelCategoriaNueva.hidden = false;
    // El presupuesto solo tiene sentido para categorías de gasto
    // (ver Category::crear en el backend).
    wrapCategoriaNuevaPresupuesto.hidden = inputTipoOculto.value !== 'gasto';
    inputCategoriaNuevaNombre.focus();
  }

  function ocultarFormularioNuevaCategoria() {
    panelCategoriaNueva.hidden = true;
    errorCategoriaNueva.hidden = true;
    inputCategoriaNuevaNombre.value = '';
    inputCategoriaNuevaPresupuesto.value = '';
  }

  function manejarCambioSelectCategoria() {
    if (selectCategoriaForm.value === VALOR_NUEVA_CATEGORIA) {
      mostrarFormularioNuevaCategoria();
    } else {
      ocultarFormularioNuevaCategoria();
    }
  }

  async function manejarCrearCategoria() {
    errorCategoriaNueva.hidden = true;

    const nombre = inputCategoriaNuevaNombre.value.trim();
    const presupuestoRaw = inputCategoriaNuevaPresupuesto.value;
    const presupuesto = presupuestoRaw ? Number(presupuestoRaw) : null;

    if (!nombre) {
      errorCategoriaNueva.textContent = 'Ponele un nombre a la categoría.';
      errorCategoriaNueva.hidden = false;
      return;
    }

    let nueva;
    try {
      nueva = await API.crearCategoria(nombre, inputTipoOculto.value, presupuesto);
    } catch (err) {
      errorCategoriaNueva.textContent = err.message || 'No se pudo crear la categoría.';
      errorCategoriaNueva.hidden = false;
      return;
    }

    // La categoría ya quedó creada en la base en este punto. Lo que
    // sigue es solo refrescar la UI — si algo de esto falla (por
    // ejemplo, un gráfico), no debe parecer que la categoría no se
    // creó, así que va en su propio try/catch, aparte.
    try {
      // Refrescamos la lista de categorías que tiene Dashboard en
      // memoria, para que la nueva quede disponible en todos los
      // selects (este formulario, el filtro del historial, etc.).
      await Dashboard.actualizar();
    } catch (err) {
      console.warn('La categoría se creó, pero no se pudo refrescar el dashboard:', err.message);
    }
    poblarSelectFormulario(inputTipoOculto.value);
    poblarSelectFiltroCategoria();
    selectCategoriaForm.value = String(nueva.id);
  }

  /* ------------------------------------------------------------
     Modal: abrir / cerrar / alternar tipo ingreso-gasto
     ------------------------------------------------------------ */
  function abrirModal() {
    document.getElementById('tx-fecha').valueAsDate = new Date();
    poblarSelectFormulario(inputTipoOculto.value);
    modal.hidden = false;
  }

  function cerrarModal() {
    modal.hidden = true;
    form.reset();
    formError.hidden = true;
    ocultarFormularioNuevaCategoria();
  }

  function bindToggleTipo() {
    const botones = document.querySelectorAll('.type-toggle button');
    botones.forEach((btn) => {
      btn.addEventListener('click', () => {
        botones.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        inputTipoOculto.value = btn.dataset.type === 'ingreso' ? 'ingreso' : 'gasto';
        poblarSelectFormulario(inputTipoOculto.value);
      });
    });
  }

  async function manejarSubmit(e) {
    e.preventDefault();
    formError.hidden = true;

    const datos = {
      tipo: inputTipoOculto.value,
      categoria_id: Number(selectCategoriaForm.value),
      monto: Number(document.getElementById('tx-monto').value),
      descripcion: document.getElementById('tx-descripcion').value.trim(),
      fecha: document.getElementById('tx-fecha').value,
    };

    if (selectCategoriaForm.value === VALOR_NUEVA_CATEGORIA) {
      formError.textContent = 'Primero creá la categoría nueva con el botón de abajo, o elegí una existente.';
      formError.hidden = false;
      return;
    }
    if (!datos.categoria_id || !datos.monto || !datos.descripcion || !datos.fecha) {
      formError.textContent = 'Completá todos los campos.';
      formError.hidden = false;
      return;
    }

    try {
      await API.crearTransaccion(datos);
    } catch (err) {
      formError.textContent = err.message || 'No se pudo guardar la transacción.';
      formError.hidden = false;
      return;
    }

    // La transacción ya se guardó en este punto. Cerramos el modal y
    // refrescamos la UI aparte, para que un fallo acá (ej. un
    // gráfico) no dé la falsa impresión de que no se guardó nada.
    cerrarModal();
    try {
      await Dashboard.actualizar();
    } catch (err) {
      console.warn('La transacción se guardó, pero no se pudo refrescar el dashboard:', err.message);
    }
    poblarSelectFiltroCategoria();
    try {
      await pintarHistorial();
    } catch (err) {
      console.warn('La transacción se guardó, pero no se pudo refrescar el historial:', err.message);
    }
  }

  async function manejarClickLista(e) {
    const id = e.target.dataset.borrar;
    if (!id) return;

    try {
      await API.eliminarTransaccion(Number(id));
    } catch (err) {
      console.warn('No se pudo eliminar la transacción:', err.message);
      return;
    }

    try {
      await Dashboard.actualizar();
    } catch (err) {
      console.warn('La transacción se eliminó, pero no se pudo refrescar el dashboard:', err.message);
    }
    try {
      await pintarHistorial();
    } catch (err) {
      console.warn('La transacción se eliminó, pero no se pudo refrescar el historial:', err.message);
    }
  }

  function bindEventos() {
    btnNueva.addEventListener('click', abrirModal);
    form.addEventListener('submit', manejarSubmit);
    listaEl.addEventListener('click', manejarClickLista);

    [filtroTipo, filtroCategoria, filtroDesde, filtroHasta].forEach((el) =>
      el.addEventListener('change', pintarHistorial)
    );

    selectCategoriaForm.addEventListener('change', manejarCambioSelectCategoria);
    btnCrearCategoria.addEventListener('click', manejarCrearCategoria);

    bindToggleTipo();
  }

  async function init() {
    bindEventos();
    poblarSelectFiltroCategoria();
    await pintarHistorial();
  }

  return { init, pintarHistorial, cerrarModal };
})();