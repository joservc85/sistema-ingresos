# Sistema de Ingresos

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](#)
[![Express](https://img.shields.io/badge/Express.js-4.x-black?logo=express&logoColor=white)](#)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?logo=tailwindcss&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/DB-PostgreSQL-336791?logo=postgresql&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

**Sistema de Ingresos** para registrar y consultar entradas por **categoría** y **fecha**, con **API REST** y UI responsive.

> Repo: `joservc85/sistema-ingresos`

## ✨ Características
- CRUD de **ingresos** y **categorías**
- Filtros por **rango de fechas** y búsqueda por categoría
- **API REST** (documentable con OpenAPI)
- UI con **Tailwind CSS** (o Pug/EJS/React según tu proyecto)
- Autenticación (**JWT** o sesiones) *(ajusta si aplica)*

## 🚀 Demo local

### Requisitos
- **Node.js** 18+ / 20+  
- **npm** 8+  
- **Base de datos**: PostgreSQL *(cambia a MySQL/SQLite si usas otra)*

### Instalación
```bash
npm install

Variables de entorno (.env)
PORT=3000
NODE_ENV=development

# Base de datos (ejemplo PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=sistema_ingresos

# Auth (si aplica)
JWT_SECRET=cambia_este_secreto

Scripts (ajusta a tu package.json)
{
  "scripts": {
    "dev": "webpack --watch",
    "build": "webpack --mode production",
    "start": "node index.js",
    "start:dev": "nodemon index.js",
    "lint": "eslint .",
    "test": "echo \"(agrega tus tests)\" && exit 0"
  }
}

Ejecutar
npm run dev        # assets/watch (si aplica)
npm run start:dev  # servidor con nodemon (si aplica)
# Producción:
npm run build && NODE_ENV=production npm start

🗂️ Estructura (ejemplo)
.
├─ config/            # conexión DB, env
├─ controllers/       # lógica de negocio
├─ middleware/        # auth, errores
├─ models/            # ORM/consultas
├─ routes/            # rutas Express (API)
├─ views/             # Pug/EJS (si aplica)
├─ public/            # assets generados
├─ src/js/            # JS fuente (Tailwind/webpack)
├─ index.js           # bootstrap servidor
└─ package.json

📚 Endpoints (ejemplo)
Endpoints (ejemplo)

GET /api/ingresos — listar

POST /api/ingresos — crear

GET /api/ingresos/:id — detalle

PUT /api/ingresos/:id — actualizar

DELETE /api/ingresos/:id — eliminar

GET /api/categorias — listar categorías

🔐 Autenticación (si aplica)

Login/registro, middleware authRequired, roles (opcional).

🛡️ Buenas prácticas

Validación (Joi/Zod)

Helmet + rate limit

Paginación e índices en consultas

📦 Despliegue

Nginx reverse proxy + SSL (Let’s Encrypt)

PM2/systemd

Variables de entorno seguras

CI/CD (GitHub Actions recomendado)
