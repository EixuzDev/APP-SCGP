/* ============================================================
   CHARTS.JS
   Encapsula toda la interacción con Chart.js. dashboard.js le
   pasa datos ya calculados; este módulo solo se ocupa de
   dibujarlos y de mantener las instancias vivas para poder
   actualizarlas sin recrear el canvas cada vez.
   ============================================================ */

const Charts = (() => {
  let chartCategorias = null;
  let chartEvolucion = null;

  // Paleta para categorías de gasto: variaciones tonales que
  // conviven con el resto de la UI sin competir con los colores
  // "semánticos" (income/expense/budget), que se reservan para KPIs.
  const PALETA_CATEGORIAS = ['#1F5C56', '#6E8B72', '#D6A324', '#C1443A', '#5B6B60', '#8FAE9A'];

  function colorParaIndice(i) {
    return PALETA_CATEGORIAS[i % PALETA_CATEGORIAS.length];
  }

  /* ------------------------------------------------------------
     Gráfico de dona: distribución de gastos por categoría (mes actual)
     ------------------------------------------------------------ */
  function renderDistribucionCategorias(canvasId, legendId, datos) {
    // datos: [{ nombre, total }]
    const ctx = document.getElementById(canvasId).getContext('2d');
    const colores = datos.map((_, i) => colorParaIndice(i));

    if (chartCategorias) chartCategorias.destroy();

    chartCategorias = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: datos.map((d) => d.nombre),
        datasets: [
          {
            data: datos.map((d) => d.total),
            backgroundColor: colores,
            borderColor: '#FAFBF7',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: { legend: { display: false } },
      },
    });

    // Leyenda propia (fuera del canvas) para que combine con el resto de la UI.
    const legend = document.getElementById(legendId);
    legend.innerHTML = datos
      .map(
        (d, i) => `
        <span>
          <span class="chart-legend__dot" style="background:${colorParaIndice(i)}"></span>
          ${d.nombre}
        </span>`
      )
      .join('');
  }

  /* ------------------------------------------------------------
     Gráfico de barras: ingresos vs gastos por mes (últimos N meses)
     ------------------------------------------------------------ */
  function renderEvolucionMensual(canvasId, meses) {
    // meses: [{ etiqueta, ingresos, gastos }]
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (chartEvolucion) chartEvolucion.destroy();

    chartEvolucion = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: meses.map((m) => m.etiqueta),
        datasets: [
          {
            label: 'Ingresos',
            data: meses.map((m) => m.ingresos),
            backgroundColor: '#2F9E6B',
            borderRadius: 3,
          },
          {
            label: 'Gastos',
            data: meses.map((m) => m.gastos),
            backgroundColor: '#C1443A',
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true, grid: { color: '#DCE0D5' } },
          x: { grid: { display: false } },
        },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 8, usePointStyle: true } },
        },
      },
    });
  }

  return { renderDistribucionCategorias, renderEvolucionMensual };
})();
