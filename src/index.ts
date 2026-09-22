import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import dns from 'dns';

// NUEVO: Importar (registrar) los modelos en Mongoose antes de usarlos
import './models/Programa';
import './models/Documento';
import './models/Estudiante';

// NUEVO: Importamos las rutas de estudiante (incluye anidadas /programas y /documentos)
import estudianteRoutes from './routes/estudiante.routes'; 

dotenv.config();
dns.setServers(['8.8.8.8']);
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
  apis: ['./src/routes/*.ts'], // Asegúrate de que apunte a la carpeta routes
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log('🔥 Conectado a MongoDB (Módulo Estudiantes)'))
  .catch((err) => console.error('Error conectando a MongoDB', err));

// Ruta de salud/entrada del microservicio.
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