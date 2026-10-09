/* ============================================================
   CHARTS.JS
   Encapsula toda la interacción con Chart.js. dashboard.js le
   pasa datos ya calculados; este módulo solo se ocupa de
   dibujarlos y de mantener las instancias vivas para poder
   actualizarlas sin recrear el canvas cada vez.

   - Los colores salen de las variables CSS (var.css), así que los
     gráficos respetan el modo claro/oscuro. Para redibujarlos al
     cambiar de tema, dashboard.js escucha el evento "tema:cambio".
   - Chart.js se carga desde Frontend/js/vendor/chart.umd.js (copia
     local, sin depender de un CDN).
   ============================================================ */

const Charts = (() => {
  let chartCategorias = null;
  let chartEvolucion = null;

  // Paleta para categorías de gasto: tonos que conviven con el resto
  // de la UI sin competir con los colores "semánticos"
  // (income/expense/budget), que se reservan para KPIs y barras.
  const PALETA_CATEGORIAS = ['#2563eb', '#14b8a6', '#D6A324', '#C1443A', '#7c3aed', '#0891b2', '#6E8B72', '#ea580c'];

  function colorParaIndice(i) {
    return PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length];
  }

  /* Lee los colores actuales del tema (claro u oscuro) desde el CSS. */
  function leerTema() {
    const css = getComputedStyle(document.documentElement);
    const v = (nombre, porDefecto) => css.getPropertyValue(nombre).trim() || porDefecto;
    return {
      texto: v('--text-secondary', '#5B6B60'),
      borde: v('--border', '#DCE0D5'),
      superficie: v('--surface', '#FAFBF7'),
      ingreso: v('--income', '#2F9E6B'),
      gasto: v('--expense', '#C1443A'),
    };
  }

  /* Si el script de Chart.js no cargó, avisamos claro en consola y
     seguimos: el resto del dashboard (KPIs, historial) no se rompe. */
  function chartDisponible() {
    if (typeof Chart === 'undefined') {
      console.error(
        'Chart.js no está cargado: revisá que exista Frontend/js/vendor/chart.umd.js ' +
          'y que index.html lo incluya con <script src="js/vendor/chart.umd.js">.'
      );
      return false;
    }
    return true;
  }

  /* ------------------------------------------------------------
     Gráfico de dona: distribución de gastos por categoría (mes actual)
     ------------------------------------------------------------ */
  function renderDistribucionCategorias(canvasId, legendId, datos) {
    // datos: [{ nombre, total }]
    if (!chartDisponible()) return;

    const tema = leerTema();
    const ctx = document.getElementById(canvasId).getContext('2d');
    const legend = document.getElementById(legendId);
    const hayDatos = datos.length > 0 && datos.some((d) => d.total > 0);

    if (chartCategorias) chartCategorias.destroy();

    // Sin gastos todavía: dibujamos un anillo gris en vez de dejar el
    // panel en blanco (parece que "no renderiza" aunque no haya error).
    const etiquetas = hayDatos ? datos.map((d) => d.nombre) : ['Sin gastos este mes'];
    const valores = hayDatos ? datos.map((d) => Number(d.total)) : [1];
    const colores = hayDatos ? datos.map((_, i) => colorParaIndice(i)) : [tema.borde];

    chartCategorias = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: etiquetas,
        datasets: [
          {
            data: valores,
            backgroundColor: colores,
            borderColor: tema.superficie,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: hayDatos },
        },
      },
    });

    // Leyenda propia (fuera del canvas) para que combine con el resto de la UI.
    legend.innerHTML = hayDatos
      ? datos
          .map(
            (d, i) => `
        <span>
          <span class="chart-legend__dot" style="background:${colorParaIndice(i)}"></span>
          ${d.nombre}
        </span>`
          )
          .join('')
      : '<span>Todavía no hay gastos este mes.</span>';
  }

  /* ------------------------------------------------------------
     Gráfico de barras: ingresos vs gastos por mes (últimos N meses)
     ------------------------------------------------------------ */
  function renderEvolucionMensual(canvasId, meses) {
    // meses: [{ etiqueta, ingresos, gastos }]
    if (!chartDisponible()) return;

    const tema = leerTema();
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (chartEvolucion) chartEvolucion.destroy();

    chartEvolucion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: meses.map((m) => m.etiqueta),
        datasets: [
          {
            label: 'Ingresos',
            data: meses.map((m) => Number(m.ingresos)),
            backgroundColor: tema.ingreso,
            borderRadius: 3,
          },
          {
            label: 'Gastos',
            data: meses.map((m) => Number(m.gastos)),
            backgroundColor: tema.gasto,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: tema.borde }, ticks: { color: tema.texto } },
          x: { grid: { display: false }, ticks: { color: tema.texto } },
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 8, usePointStyle: true, color: tema.texto },
          },
        },
      },
    });
  }

  return { renderDistribucionCategorias, renderEvolucionMensual };
})();
