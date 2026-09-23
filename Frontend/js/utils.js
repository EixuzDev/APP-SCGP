/* ============================================================
   UTILS.JS
   Funciones puras y pequeñas, sin estado, usadas por varios
   módulos (dashboard, transactions, charts).
   ============================================================ */

const Utils = (() => {
  const formatoMoneda = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

  function formatMoney(valor) {
    return formatoMoneda.format(valor || 0);
  }

  function formatDate(fechaISO) {
    // fechaISO viene como "YYYY-MM-DD"
    const [anio, mes, dia] = fechaISO.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  function nombreMes(fecha) {
    return fecha.toLocaleDateString('es-AR', { month: 'short' });
  }

  return { formatMoney, formatDate, nombreMes };
})();
