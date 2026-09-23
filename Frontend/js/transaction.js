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
    selectCategoriaForm.innerHTML = categorias
      .map((c) => `<option value="${c.id}">${c.nombre}</option>`)
      .join('');
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

    if (!datos.categoria_id || !datos.monto || !datos.descripcion || !datos.fecha) {
      formError.textContent = 'Completá todos los campos.';
      formError.hidden = false;
      return;
    }

    try {
      await API.crearTransaccion(datos);
      cerrarModal();
      await Dashboard.actualizar();
      poblarSelectFiltroCategoria();
      await pintarHistorial();
    } catch (err) {
      formError.textContent = err.message || 'No se pudo guardar la transacción.';
      formError.hidden = false;
    }
  }

  async function manejarClickLista(e) {
    const id = e.target.dataset.borrar;
    if (!id) return;

    await API.eliminarTransaccion(Number(id));
    await Dashboard.actualizar();
    await pintarHistorial();
  }

  function bindEventos() {
    btnNueva.addEventListener('click', abrirModal);
    form.addEventListener('submit', manejarSubmit);
    listaEl.addEventListener('click', manejarClickLista);

    [filtroTipo, filtroCategoria, filtroDesde, filtroHasta].forEach((el) =>
      el.addEventListener('change', pintarHistorial)
    );

    bindToggleTipo();
  }

  async function init() {
    bindEventos();
    poblarSelectFiltroCategoria();
    await pintarHistorial();
  }

  return { init, pintarHistorial, cerrarModal };
})();
