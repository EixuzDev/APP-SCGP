# Control de Gastos Personales

Aplicación one-page para registrar ingresos y gastos, organizarlos por
categoría, controlar un presupuesto mensual y visualizar la actividad
económica con gráficos e historial filtrable.

## Estructura del proyecto

```
proyecto-finanzas/
├── frontend/            → HTML, CSS y JS (sin dependencias de build)
│   ├── index.html
│   ├── css/
│   │   ├── variables.css   → paleta de color, tipografía, espaciado
│   │   ├── layout.css      → nav, grillas, estructura general
│   │   └── components.css  → tarjetas, botones, modal, historial
│   ├── js/
│   │   ├── utils.js         → formateo de moneda y fechas
│   │   ├── api.js           → única capa que habla con el backend
│   │   ├── auth.js           → login / registro / sesión
│   │   ├── charts.js         → gráficos (Chart.js)
│   │   ├── dashboard.js      → KPIs, presupuesto por categoría
│   │   ├── transactions.js   → historial, filtros, alta y borrado
│   │   └── app.js            → orquesta la inicialización
│   └── assets/logo.png
├── backend/              → API en PHP
│   ├── config/
│   │   ├── config.php       → sesión, headers, helpers de respuesta
│   │   └── database.php     → conexión PDO (singleton)
│   ├── models/
│   │   ├── User.php
│   │   ├── Category.php
│   │   └── Transaction.php
│   └── api/
│       ├── auth.php          → registro, login, sesión, logout
│       ├── categories.php    → listar / crear categorías
│       ├── transactions.php  → listar (con filtros) / crear / eliminar
│       └── reports.php       → resumen, distribución, evolución mensual
└── database/
    └── schema.sql        → tablas users, categories, transactions
```

## Cómo ponerlo en marcha

1. **Base de datos**: crear el esquema con
   ```bash
   mysql -u root -p < database/schema.sql
   ```
2. **Backend**: completar las credenciales reales en
   `backend/config/database.php` (host, usuario, password) y servir la
   carpeta `backend/` con PHP (por ejemplo `php -S localhost:8000 -t backend`
   para probar en local, o Apache/Nginx en un servidor real).
3. **Frontend**: abrir `frontend/index.html` en el navegador.
   - Mientras el backend no esté conectado, `frontend/js/api.js` trabaja
     en **modo demo** (`USE_MOCK_DATA = true`) con datos de ejemplo
     guardados en `localStorage`, así se puede krevisar toda la interfaz
     sin tener PHP corriendo.
   - Para conectar el front-end al backend real: en `api.js`, poner
     `USE_MOCK_DATA = false` y ajustar `BASE_URL` a la URL donde quedó
     publicado el backend (por ejemplo `http://localhost:8000/api`).

## Decisiones de diseño a tener en cuenta

- **Seguridad**: contraseñas con `password_hash()` / `password_verify()`,
  consultas siempre con *prepared statements* (PDO), y cada endpoint de
  transacciones/categorías valida que el recurso pertenezca al usuario
  de la sesión antes de tocarlo.
- **Cálculos en SQL, no en PHP ni en JS**: los reportes (`reports.php`)
  agregan datos con `SUM`/`GROUP BY` en la base, para que el rendimiento
  no se degrade a medida que crece el historial de un usuario.
- **Escalabilidad del front-end**: cada archivo JS tiene una sola
  responsabilidad (API, auth, gráficos, dashboard, historial). Para
  agregar una funcionalidad nueva (por ejemplo, exportar a CSV), lo
  natural es sumar un módulo nuevo en `js/` en vez de tocar los
  existentes.
- **Categorías por usuario**: no son globales — cada usuario tiene las
  suyas (se crean unas por defecto al registrarse, ver
  `Category::crearCategoriasPorDefecto`), lo que permite personalizarlas
  sin afectar a otras cuentas.

## Posibles próximos pasos

- Exportar el historial filtrado a CSV/PDF.
- Transacciones recurrentes (sueldo, alquiler) que se autogeneren cada mes.
- Notificaciones cuando una categoría supera el 80% de su presupuesto.
- Editar una transacción existente (hoy solo se puede crear o eliminar).
