// Primero: cargar .env antes de que cualquier módulo (p. ej. config/s3) lea process.env
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import path from 'path';
import { prisma } from './config/prisma';

// NUEVO: Importamos las rutas de estudiante (incluye anidadas /programas y /documentos)
import estudianteRoutes from './routes/estudiante.routes';

if (!process.env.DATABASE_URL) {
  throw new Error('La variable de entorno DATABASE_URL no está definida');
}

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Microservicio Estudiantes',
      version: '1.0.0',
      description: 'Gestión de estudiantes, programas académicos y documentos',
    },
    tags: [
      {
        name: 'Estudiantes',
        description: 'Operaciones CRUD y consultas de estudiantes'
      },
      {
        name: 'Programas',
        description: 'Operaciones CRUD de programas académicos'
      },
      {
        name: 'Documentos',
        description: 'Operaciones CRUD de documentos de estudiantes'
      }
    ],
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor local del microservicio Estudiantes'
      }
    ]
  },
  // Relativo al código en ejecución: src/routes/*.ts con tsx, dist/routes/*.js en el
  // contenedor (tsc conserva los comentarios JSDoc al compilar)
  apis: [path.join(__dirname, 'routes', '*.{ts,js}')],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Conexión a PostgreSQL
prisma.$connect()
  .then(() => console.log('🔥 Conectado a PostgreSQL (Módulo Estudiantes)'))
  .catch((err) => console.error('Error conectando a PostgreSQL', err));

// Health check para App Runner / ECS / Docker: pública, sin consultar la base de datos
// (si PostgreSQL falla, reiniciar el contenedor no lo arreglaría).
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Ruta de entrada del microservicio.
app.get('/', (_req, res) => {
  res.json({
    message: 'Módulo Estudiantes funcionando',
    docs: '/docs',
    api: '/api/estudiantes'
  });
});

// Base path pública del módulo. Los sub-recursos /programas y /documentos
// quedan anidados bajo /api/estudiantes.
app.use('/api/estudiantes', estudianteRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Módulo corriendo en http://localhost:${PORT}`);
  console.log(`📄 Swagger disponible en http://localhost:${PORT}/docs`);
});