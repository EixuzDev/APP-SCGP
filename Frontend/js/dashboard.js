/* ============================================================
   DASHBOARD.JS
   Calcula y pinta todo lo que no es el historial de transacciones:
   tarjetas KPI, barras de presupuesto por categoría y los datos
   que alimentan los gráficos (delegados a charts.js).
   ============================================================ */

const Dashboard = (() => {
  let categorias = [];
  let transacciones = [];

  /* ------------------------------------------------------------
     KPIs de la franja superior
     ------------------------------------------------------------ */
  async function pintarKpis() {
    const resumen = await API.obtenerResumenMensual();

    document.getElementById('kpi-balance').textContent = Utils.formatMoney(resumen.balance);
    document.getElementById('kpi-ingresos').textContent = Utils.formatMoney(resumen.ingresos);
    document.getElementById('kpi-gastos').textContent = Utils.formatMoney(resumen.gastos);

    const ahorro = resumen.ingresos > 0
      ? Math.round(((resumen.ingresos - resumen.gastos) / resumen.ingresos) * 100)
      : 0;
    document.getElementById('kpi-ahorro').textContent = `${ahorro}%`;
  }

  /* ------------------------------------------------------------
     Presupuesto por categoría (barras de progreso)
     ------------------------------------------------------------ */
  function pintarPresupuesto() {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().slice(0, 10);

    const categoriasGasto = categorias.filter((c) => c.tipo === 'gasto' && c.presupuesto);

    const filas = categoriasGasto.map((cat) => {
      const gastado = transacciones
        .filter((t) => t.tipo === 'gasto' && t.categoria_id === cat.id && t.fecha >= inicioMesStr)
        .reduce((s, t) => s + t.monto, 0);

      const porcentaje = Math.min(100, Math.round((gastado / cat.presupuesto) * 100));
      let claseBarra = '';
      if (porcentaje >= 100) claseBarra = 'budget-bar__fill--over';
      else if (porcentaje >= 80) claseBarra = 'budget-bar__fill--warning';

      return `
        <div class="budget-item">
          <div class="budget-item__top">
            <span class="budget-item__name">${cat.nombre}</span>
            <span class="budget-item__amounts">${Utils.formatMoney(gastado)} / ${Utils.formatMoney(cat.presupuesto)}</span>
          </div>
          <div class="budget-bar">
            <div class="budget-bar__fill ${claseBarra}" style="width:${porcentaje}%"></div>
          </div>
        </div>`;
    });

    document.getElementById('budget-list').innerHTML =
      filas.join('') || '<p class="empty-state">Todavía no configuraste presupuestos por categoría.</p>';
  }

  /* ------------------------------------------------------------
     Datos para el gráfico de distribución de gastos (mes actual)
     ------------------------------------------------------------ */
  function pintarDistribucionGastos() {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().slice(0, 10);

    const gastosDelMes = transacciones.filter((t) => t.tipo === 'gasto' && t.fecha >= inicioMesStr);

    const porCategoria = {};
    gastosDelMes.forEach((t) => {
      porCategoria[t.categoria_id] = (porCategoria[t.categoria_id] || 0) + t.monto;
    });

    const datos = Object.entries(porCategoria).map(([catId, total]) => {
      const cat = categorias.find((c) => c.id === Number(catId));
      return { nombre: cat ? cat.nombre : 'Otros', total };
    });

    Charts.renderDistribucionCategorias('chart-categorias', 'chart-categorias-legend', datos);
  }

  /* ------------------------------------------------------------
     Datos para el gráfico de evolución (últimos 6 meses)
     ------------------------------------------------------------ */
  function pintarEvolucionMensual() {
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(1);
      fecha.setMonth(fecha.getMonth() - i);
      const inicioStr = fecha.toISOString().slice(0, 10);

      const finFecha = new Date(fecha);
      finFecha.setMonth(finFecha.getMonth() + 1);
      const finStr = finFecha.toISOString().slice(0, 10);

      const delMes = transacciones.filter((t) => t.fecha >= inicioStr && t.fecha < finStr);
      const ingresos = delMes.filter((t) => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
      const gastos = delMes.filter((t) => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);

      meses.push({ etiqueta: Utils.nombreMes(fecha), ingresos, gastos });
    }

    Charts.renderEvolucionMensual('chart-evolucion', meses);
  }

  /* ------------------------------------------------------------
     Punto de entrada: carga datos base y pinta todo el dashboard.
     transactions.js llama a `Dashboard.actualizar()` cada vez que
     cambia una transacción, para mantener todo sincronizado.
     ------------------------------------------------------------ */
  async function cargarDatosBase() {
    [categorias, transacciones] = await Promise.all([
      API.obtenerCategorias(),
      API.obtenerTransacciones(),
    ]);
  }

  async function actualizar() {
    await cargarDatosBase();
    await pintarKpis();
    pintarPresupuesto();
    pintarDistribucionGastos();
    pintarEvolucionMensual();
  }

  function getCategorias() {
    return categorias;
  }

  return { actualizar, getCategorias };
})();
