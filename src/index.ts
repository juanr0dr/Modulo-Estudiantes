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
      title: 'API Sistema Académico',
      version: '1.0.0',
      description: 'API para la gestión de estudiantes, materias e inscripciones',
    },
  },
  apis: ['./src/routes/*.ts'], // Asegúrate de que apunte a la carpeta routes
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log('🔥 Conectado a MongoDB (Módulo Estudiantes)'))
  .catch((err) => console.error('Error conectando a MongoDB', err));

// NUEVO: Única ruta/base path principal del microservicio, acordada con el equipo.
// El API Gateway (puerto 3000) redirige aquí. /programas y /documentos quedan
// anidados dentro del router de estudiantes.
app.use('/estudiantes', estudianteRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Módulo corriendo en http://localhost:${PORT}`);
  console.log(`📄 Swagger disponible en http://localhost:${PORT}/docs`);
});