# Microservicio de Estudiantes

Microservicio independiente para la gestión del dominio de **Estudiantes**, **Programas Académicos** y **Documentos de Identidad**.  
Desarrollado para el Laboratorio 3 de Sistemas Distribuidos (Arquitectura Modular con API Gateway) — UPTC.

---

## Descripción

Este microservicio administra el registro central de los estudiantes de la institución, los programas a los que pertenecen y la gestión de sus documentos. Funciona de manera autónoma con su propia base de datos centralizada en la nube y está diseñado para ser consumido por un API Gateway u otros microservicios de la red.

**No incluye frontend.** Toda interacción se realiza a través de:
- Documentación Swagger UI / OpenAPI
- Peticiones HTTP REST
- Base de datos en MongoDB Atlas

---

## Stack Tecnológico

| Tecnología | Rol en el proyecto |
|------------|--------------------|
| **Node.js (v24+)** | Entorno de ejecución de servidor |
| **TypeScript** | Lenguaje principal (tipado estricto) |
| **Express.js** | Framework web para el enrutamiento HTTP |
| **MongoDB Atlas** | Base de datos NoSQL (Despliegue Cloud) |
| **Mongoose** | Object Data Modeling (ODM) |
| **Swagger / OpenAPI 3.0** | Documentación interactiva de la API |

---

## Arquitectura y Estructura

El proyecto sigue una arquitectura modular basada en componentes de Express:

    Petición HTTP → Rutas (Express) → Controlador → Modelo (Mongoose) → MongoDB Atlas

**Estructura del Proyecto:**

    src/
    ├── controllers/    # Lógica de negocio y validaciones
    ├── models/         # Esquemas de Mongoose y definiciones de tipos
    ├── routes/         # Endpoints expuestos mediante Express Router
    ├── index.ts        # Punto de entrada, middlewares (CORS) y Swagger
    └── seed.ts         # Script de población de datos iniciales

---

## Modelo de Datos

El sistema maneja colecciones relacionadas mediante referencias de Mongoose (`ObjectId`).

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
Crear un archivo `.env` en la raíz del proyecto basándose en la siguiente configuración:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto de exposición del servicio | `3000` |
| `MONGODB_URI` | Cadena de conexión a Atlas | `mongodb+srv://<user>:<password>@cluster-lab3...` |

### 3. Ejecución

    # Modo desarrollo (con recarga automática mediante ts-node/nodemon)
    npm run dev
    
    # Compilación y modo producción
    npm run build
    npm start

El servidor iniciará en `http://localhost:3000`.

---

## Swagger UI

La documentación completa de los esquemas y la interfaz de pruebas "Try it out" se generan dinámicamente al iniciar el servidor:

| Recurso | URL local |
|---------|-----------|
| **Swagger UI** | `http://localhost:3000/docs` |

---

## Endpoints Principales

### Estudiantes
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/estudiantes` | Crea un estudiante |
| `GET`  | `/api/estudiantes` | Listar con paginación, filtros y ordenamiento |
| `GET`  | `/api/estudiantes/:id` | Obtener por ID (Popula el objeto `programa`) |
| `PUT`  | `/api/estudiantes/:id` | Actualizar registro completo |
| `PATCH`| `/api/estudiantes/:id` | Actualización parcial de campos |
| `DELETE`| `/api/estudiantes/:id`| Eliminar estudiante |

*(Nota: Los endpoints CRUD para `/api/programas` y `/api/documentos` siguen exactamente la misma convención REST. Consultar Swagger para más detalles).*

---

## Paginación y Filtros

El endpoint de listado (`GET /api/estudiantes`) soporta características avanzadas a través de *query parameters*:

- **Paginación:** `?pageNumber=1&pageSize=20`
- **Filtros:** `?ciudad=Tunja&programa={id}`

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
| `400` | Bad Request | Errores de validación de Mongoose o JSON mal formado. |
| `404` | Not Found | Recurso o ID inexistente. |
| `500` | Server Error | Error interno o caída de conexión con MongoDB Atlas. |

---

## Notas Críticas de Integración (Para API Gateway)

1. **Gestión de Puertos:** Para evitar conflictos en la máquina local del Gateway, este módulo opera reservadamente en el puerto **`3000`** (Inscripciones usa `3003` y Materias `3001` u `8082`).
2. **Despliegue Cloud (Base de Datos):** A diferencia de otros módulos que requieren levantar contenedores de PostgreSQL o MongoDB en local, **este módulo utiliza MongoDB Atlas**. Los datos persisten en la nube, por lo que el Gateway no necesita correr scripts locales de inicialización para consumir la API de estudiantes.
3. **Población (Populate):** Al consultar un estudiante por ID, Mongoose automáticamente inyecta el objeto completo del programa académico asociado. El Gateway no necesita hacer una segunda petición a `/api/programas`.
4. **Relación de Documentos:** Para obtener los documentos de identidad asociados a un estudiante, el Gateway debe realizar un `GET` a `/api/documentos?estudianteId={id}`.

---

**Autor:** Juan Felipe Rodríguez Salazar  
**Institución:** Universidad Pedagógica y Tecnológica de Colombia (UPTC)  
**Módulo:** Gestión de Estudiantes