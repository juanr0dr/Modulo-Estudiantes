# Microservicio de Estudiantes

Microservicio independiente para la gestión del dominio de **Estudiantes**, **Programas Académicos** y **Documentos de Identidad**.  
Desarrollado para el Laboratorio 3 de Sistemas Distribuidos (Arquitectura Modular con API Gateway) — UPTC.

---

## Descripción

Este microservicio administra el registro central de los estudiantes de la institución, los programas a los que pertenecen y la gestión de sus documentos. Funciona de manera autónoma con su propia base de datos centralizada en la nube y está diseñado para ser consumido por un API Gateway u otros microservicios de la red.

**No incluye frontend.** Toda interacción se realiza a través de:
- Documentación Swagger UI / OpenAPI
- Peticiones HTTP REST
- Base de datos relacional PostgreSQL propia (local con Docker o AWS RDS)

---

## Stack Tecnológico

| Tecnología | Rol en el proyecto |
|------------|--------------------|
| **Node.js (v24+)** | Entorno de ejecución de servidor |
| **TypeScript** | Lenguaje principal (tipado estricto) |
| **Express.js** | Framework web para el enrutamiento HTTP |
| **PostgreSQL 16** | Base de datos relacional (AWS RDS en producción) |
| **Prisma ORM** | Acceso a datos y migraciones |
| **Swagger / OpenAPI 3.0** | Documentación interactiva de la API |

---

## Arquitectura y Estructura

El proyecto sigue una arquitectura modular basada en componentes de Express:

    Petición HTTP → Rutas (Express) → Controlador → Prisma → PostgreSQL

**Estructura del Proyecto:**

    prisma/
    ├── schema.prisma   # Esquema relacional
    └── migrations/     # Migraciones SQL (npx prisma migrate deploy)
    src/
    ├── controllers/    # Lógica de negocio y validaciones
    ├── routes/         # Endpoints expuestos mediante Express Router
    ├── utils/          # Serializadores (JSON del API), validación e ids
    ├── index.ts        # Punto de entrada, middlewares (CORS) y Swagger
    └── seed.ts         # Programas iniciales con ids fijos (npm run seed)

---

## Modelo de Datos

Tablas: `programas`, `estudiantes` (con las columnas de contacto), `documentos`
y `fotografias_estudiante` (metadatos de la foto en S3, relación 1:1). Las llaves
foráneas son internas al módulo: `estudiantes.programa_id` → `programas` (no se
puede borrar un programa con estudiantes: `409`), y `documentos` / fotografía →
`estudiantes` (se borran en cascada con el estudiante).

Los ids conservan el formato de ObjectId (24 caracteres hex) y las respuestas
mantienen el mismo JSON de la versión con MongoDB (`_id`, `programa` poblado,
`contacto` anidado), por lo que el API Gateway y el frontend no requieren cambios.

### Estudiante
Entidad central. Contiene información personal y de contacto.
- `_id`: ObjectId (Autogenerado)
- `nombre`: String (Requerido)
- `apellido`: String (Requerido)
- `correo`: String (Único, Requerido)
- `fecha_nacimiento`: Date
- `programa`: ObjectId (Referencia a la colección Programas)
- `contacto`: Subdocumento (Contiene `telefono`, `direccion`, `ciudad`)
- `createdAt` / `updatedAt`: Timestamps automáticos

### Programa
Catálogo académico base.
- `_id`: ObjectId (Autogenerado)
- `nombre`: String (Requerido)
- `codigo`: String (Requerido)
- `facultad`: String (Requerido)

### Documento
Múltiples documentos asociados a un estudiante (Relación 1:N).
- `_id`: ObjectId (Autogenerado)
- `tipo`: String (Ej: CC, TI, Pasaporte)
- `numero`: String (Requerido)
- `estudiante`: ObjectId (Referencia a la colección Estudiantes)

---

## Instalación y Configuración

### 1. Clonar e Instalar

    git clone https://github.com/juanr0dr/Modulo-Estudiantes
    cd lab3-modulo-estudiantes
    npm install


### 2. Variables de Entorno
Crea un archivo `.env` local a partir de `.env.example`. **No compartas ni subas el archivo `.env` real**, ya que contiene credenciales.

    docker compose up -d     # PostgreSQL local en el puerto 5434
    npm run db:deploy        # aplica prisma/migrations (npx prisma migrate deploy)
    npm run seed             # programas con ids fijos (60d5ec49f1b2c8b1f8e4e1a1 / ...a2)

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto de exposición del servicio | `3001` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL (en RDS agregar `&sslmode=require`) | — (obligatoria) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Solo para el contenedor local de `docker-compose.yml` | — |
| `AWS_ACCESS_KEY_ID` | Credencial de AWS con permiso sobre el bucket | — (obligatoria) |
| `AWS_SECRET_ACCESS_KEY` | Secreto de la credencial de AWS | — (obligatoria) |
| `AWS_REGION` | Región del bucket (ej. `us-east-1`) | — (obligatoria) |
| `AWS_BUCKET_NAME` | Bucket de S3 para las fotografías | — (obligatoria) |
| `AWS_SESSION_TOKEN` | Solo con credenciales temporales (AWS Academy / STS) | vacío |

### Fotografía del estudiante (AWS S3)

`POST /api/estudiantes/{id}/fotografia` recibe un `multipart/form-data` con el
campo `fotografia`: solo **JPG o PNG**, máximo **2 MB**. Se valida el tipo MIME
y la firma binaria del archivo, por lo que un archivo renombrado se rechaza
(`400`); si supera los 2 MB responde `413`. El archivo va directamente desde
memoria al bucket (nunca se escribe en disco) y en PostgreSQL solo se guardan sus
metadatos (`clave_s3`, `nombre_original`, `tipo_mime`, `tamano_bytes`).

`GET /api/estudiantes/{id}` (y por tanto `/api/estudiantes/{id}/detalle` en el
Gateway) incluye `fotografia.url`: una URL firmada temporal (1 hora) para que
el frontend muestre la imagen sin hacer público el bucket.

### 3. Ejecución

    # Modo desarrollo (con recarga automática mediante tsx/nodemon)
    npm run dev
    
    # Compilación y modo producción
    npm run build
    npm start

El servidor iniciará en `http://localhost:3001`.

---

## Swagger UI

La documentación completa de los esquemas y la interfaz de pruebas "Try it out" se generan dinámicamente al iniciar el servidor:

| Recurso | URL local |
|---------|-----------|
| **Swagger UI** | `http://localhost:3001/docs` |

---

## Endpoints Principales

### Estudiantes
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/estudiantes` | Crea un estudiante |
| `GET`  | `/api/estudiantes` | Listar con paginación, filtros y ordenamiento |
| `GET`  | `/api/estudiantes/:id` | Obtener por ID (Popula el objeto `programa`) |
| `PUT`  | `/api/estudiantes/:id` | Actualizar registro |
| `DELETE`| `/api/estudiantes/:id`| Eliminar estudiante |

*(Nota: Los endpoints CRUD para `/api/estudiantes/programas` y `/api/estudiantes/documentos` siguen exactamente la misma convención REST. Consultar Swagger para más detalles).*

---

## Paginación y Filtros

El endpoint de listado (`GET /api/estudiantes`) soporta características avanzadas a través de *query parameters*:

- **Paginación:** `?pageNumber=1&pageSize=20`
- **Filtros:** `?ciudad=Tunja&programa={id}&search=laura`

**Estructura estándar de respuesta paginada:**

    {
      "totalRecords": 1,
      "pageNumber": 1,
      "pageSize": 20,
      "totalPages": 1,
      "data": [
        {
          "_id": "6ab0a97c37d6986bd58b7efb",
          "nombre": "Laura",
          "apellido": "Gómez",
          "correo": "laura.gomez@ejemplo.com",
          "programa": {
            "_id": "60d5ec49f1b2c8b1f8e4e1a1",
            "nombre": "Ingeniería de Sistemas y Computación"
          },
          "contacto": {
            "ciudad": "Tunja"
          }
        }
      ]
    }


---

## Códigos HTTP Soportados

| Código | Estado | Escenario |
|--------|--------|-----------|
| `200` | OK | Peticiones GET y actualizaciones exitosas. |
| `201` | Created | Creación exitosa (POST). |
| `204` | No Content | Eliminación exitosa (DELETE). |
| `400` | Bad Request | Errores de validación o JSON mal formado. |
| `404` | Not Found | Recurso o ID inexistente. |
| `500` | Server Error | Error interno o caída de conexión con PostgreSQL. |

---

## Notas Críticas de Integración (Para API Gateway)

1. **Gestión de Puertos:** Para evitar conflictos en la máquina local del Gateway, este módulo opera reservadamente en el puerto **`3001`** (el API Gateway usa `3000`, Materias `3002` e Inscripciones `3003`).
2. **Base de Datos:** el módulo tiene su propia base PostgreSQL (local con `docker compose up -d`, AWS RDS en producción). Antes de recibir tráfico se aplican las migraciones con `npx prisma migrate deploy` (imagen `docker build --target migrate`).
3. **Población (Populate):** Al consultar un estudiante por ID, el servicio inyecta el objeto completo del programa académico asociado. El Gateway no necesita hacer una segunda petición a `/api/estudiantes/programas`.
4. **Health check:** `GET /health` es público y responde `200 {"status":"UP"}`. Es la ruta que deben usar App Runner / ECS (y el `HEALTHCHECK` del Dockerfile). No consulta la base de datos.
5. **Relación de Documentos:** Para obtener los documentos de identidad asociados a un estudiante, se puede realizar un `GET` a `/api/estudiantes/documentos?estudianteId={id}`.

---

**Autor:** Juan Felipe Rodríguez Salazar  
**Institución:** Universidad Pedagógica y Tecnológica de Colombia (UPTC)  
**Módulo:** Gestión de Estudiantes