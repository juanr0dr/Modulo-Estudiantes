import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';

// NUEVO: Importar (registrar) los modelos en Mongoose antes de usarlos
import './models/Programa';
import './models/Documento';
import './models/Estudiante';

// NUEVO: Importamos las rutas de estudiante
import estudianteRoutes from './routes/estudiante.routes'; 
import documentoRoutes from './routes/documento.routes';
import programaRoutes from './routes/programa.routes';

dotenv.config();

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

// NUEVO: Registramos las rutas con el prefijo /estudiantes
app.use('/api/estudiantes', estudianteRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/programas', programaRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Módulo corriendo en http://localhost:${PORT}`);
  console.log(`📄 Swagger disponible en http://localhost:${PORT}/docs`);
});