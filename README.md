# 🥤 Maracumango – MVP Sistema de Pedidos

> Electiva II: Arquitectura Empresarial de TI · Santa Marta 2025

## Arquitectura

```
Cliente (Web/Móvil)
       │
       ▼
   React App (puerto 3000)
       │  HTTP GET/POST
       ▼
  Node.js + Express API (puerto 3001)
       │
       ▼
  PostgreSQL (BD)
       │
  ngrok (túnel público)
```

## Requisitos previos

- Node.js 18+
- PostgreSQL 14+
- Cuenta gratuita en [ngrok.com](https://ngrok.com)

## 🚀 Instalación rápida (una sola vez)

```bash
# 1. Clonar o descomprimir el proyecto
cd maracumango

# 2. Dar permisos al script
chmod +x start.sh

# 3. Crear carpeta de logs
mkdir -p logs

# 4. Ejecutar todo
bash start.sh
```

El script hace automáticamente:
- Crea la base de datos
- Ejecuta las migraciones (tablas)
- Inserta datos iniciales (productos, sedes, usuarios)
- Instala dependencias de backend y frontend
- Inicia el servidor Express
- Inicia la app React
- Abre un túnel ngrok para acceso desde otras redes

## Instalación manual (si el script falla)

### Backend
```bash
cd backend
cp .env.example .env        # Edita con tus credenciales de PostgreSQL
npm install
node src/db/migrate.js      # Crea las tablas
node src/db/seed.js         # Inserta datos iniciales
npm start                   # Inicia en puerto 3001
```

### Frontend
```bash
cd frontend
cp .env.example .env        # Pon la URL del backend
npm install
npm start                   # Inicia en puerto 3000
```

### ngrok
```bash
# Instalar: https://ngrok.com/download
ngrok config add-authtoken TU_TOKEN
ngrok http 3001             # Abre túnel al backend

# Copia la URL https://xxxx.ngrok.io
# Pégala en frontend/.env como REACT_APP_API_URL
# Reinicia el frontend
```

## Rutas de la aplicación

| Ruta | Descripción | Usuario |
|------|-------------|---------|
| `/` | Menú principal | Todos |
| `/chatbot` | Chatbot de pedidos | Clientes |
| `/pos` | POS presencial | Mesera |
| `/cocina` | Pantalla en tiempo real | Cocinero |
| `/dashboard` | Dashboard de ventas | Dueña |

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login de usuario |
| GET | `/api/clientes/:telefono` | Buscar cliente |
| POST | `/api/clientes` | Crear cliente |
| GET | `/api/productos` | Listar productos |
| GET | `/api/recomendaciones/:telefono` | Recomendaciones personalizadas |
| POST | `/api/pedidos` | Crear pedido |
| GET | `/api/pedidos/pendientes?sede_id=1` | Pedidos para cocina |
| PATCH | `/api/pedidos/:id/estado` | Actualizar estado |
| GET | `/api/ventas?sede=all&fecha=2025-05-31` | Ventas del día |
| GET | `/api/inventario?sede_id=1` | Inventario por sede |
| POST | `/api/inventario` | Actualizar inventario |
| GET | `/api/health` | Estado del servidor |

## Credenciales de prueba

```
Admin:   admin@maracumango.com    / maracumango2025
Mesera:  mesera1@maracumango.com  / maracumango2025
Cocina:  cocina1@maracumango.com  / maracumango2025
```

## Estructura del proyecto

```
maracumango/
├── start.sh                    ← Script de inicio todo-en-uno
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js            ← Servidor Express
│       ├── db/
│       │   ├── connection.js   ← Conexión PostgreSQL
│       │   ├── migrate.js      ← Crear tablas
│       │   └── seed.js         ← Datos iniciales
│       ├── middleware/
│       │   └── auth.js         ← JWT middleware
│       └── routes/
│           ├── auth.js
│           ├── clientes.js
│           ├── productos.js
│           ├── recomendaciones.js
│           ├── pedidos.js
│           ├── ventas.js
│           └── inventario.js
└── frontend/
    ├── package.json
    ├── .env.example
    └── src/
        ├── App.jsx             ← Rutas principales
        ├── index.js
        ├── index.css           ← Variables de marca
        ├── services/
        │   └── api.js          ← Axios + todos los endpoints
        ├── components/
        │   ├── Chatbot.jsx     ← Chatbot de pedidos
        │   └── Chatbot.css
        └── pages/
            ├── Cocina.jsx      ← Pantalla cocina
            ├── Cocina.css
            ├── Dashboard.jsx   ← Panel admin
            ├── Dashboard.css
            ├── POS.jsx         ← POS presencial
            └── POS.css
```

## Para la demo del 1 de junio

1. Ejecutar `bash start.sh`
2. Copiar la URL de ngrok que aparece
3. Abrir en el proyector: `http://localhost:3000`
4. Mostrar flujo completo:
   - `/chatbot` → pedir con número de celular → ver recomendaciones
   - `/cocina` → ver pedido aparecer en tiempo real
   - `/pos` → tomar pedido presencial
   - `/dashboard` → mostrar ventas del día

---
*Maracumango · Santa Marta · Electiva II: Arquitectura Empresarial de TI · 2025*
