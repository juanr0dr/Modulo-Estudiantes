import { Router } from 'express';
import {
  crearEstudiante,
  obtenerEstudiantes,
  obtenerEstudiantePorId,
  actualizarEstudiante,
  eliminarEstudiante
} from '../controllers/estudiante.controller';
import { subirFotografia } from '../controllers/fotografia.controller';
import { recibirFotografia } from '../middlewares/subidaFotografia';
import programaRoutes from './programa.routes';
import documentoRoutes from './documento.routes';

const router = Router();

// NUEVO: Sub-recursos anidados bajo /api/estudiantes, según la arquitectura
// acordada por el equipo (única ruta/base path principal por microservicio).
router.use('/programas', programaRoutes);
router.use('/documentos', documentoRoutes);

/**
 * @swagger
 * components:
 *   schemas:
 *     Contacto:
 *       type: object
 *       properties:
 *         telefono:
 *           type: string
 *         direccion:
 *           type: string
 *         ciudad:
 *           type: string
 *     Estudiante:
 *       type: object
 *       required:
 *         - nombre
 *         - apellido
 *         - correo
 *         - programa
 *         - contacto
 *       properties:
 *         nombre:
 *           type: string
 *         apellido:
 *           type: string
 *         correo:
 *           type: string
 *         programa:
 *           type: string
 *           description: ID del programa en MongoDB
 *         contacto:
 *           $ref: '#/components/schemas/Contacto'
 *         fotografia:
 *           $ref: '#/components/schemas/Fotografia'
 *         estado:
 *           type: string
 *           enum: [ACTIVO, INACTIVO]
 *           default: ACTIVO
 *           description: >-
 *             Estado del estudiante ("no borrar, usar estados"). Al crear siempre es ACTIVO;
 *             DELETE lo pasa a INACTIVO y PUT permite cambiarlo (p. ej. reactivar).
 *             Otros módulos (Inscripciones) deben exigir ACTIVO.
 *     ErrorNegocio:
 *       type: object
 *       properties:
 *         mensaje:
 *           type: string
 *           example: Estudiante no encontrado
 *         errorType:
 *           type: string
 *           example: EstudianteNoExiste
 *           description: Código de error de negocio (también se registra en res.locals.errorType para el datalake)
 *     Fotografia:
 *       type: object
 *       readOnly: true
 *       description: Metadatos de la fotografía almacenada en AWS S3 (solo se modifica con POST /api/estudiantes/{id}/fotografia)
 *       properties:
 *         clave_s3:
 *           type: string
 *           example: estudiantes/6501f8a2c9d4e5f6a7b8c9d0/fotografia/3f1c9a2e-7b4d-4e8a-9c1f-2d6b8e0a4c7f.jpg
 *         nombre_original:
 *           type: string
 *           example: foto-carnet.jpg
 *         tipo_mime:
 *           type: string
 *           enum: [image/jpeg, image/png]
 *         tamano_bytes:
 *           type: integer
 *           example: 184320
 *         url:
 *           type: string
 *           description: URL firmada temporal (1 hora) para mostrar la imagen; no se guarda en la base de datos
 */

/**
 * @swagger
 * /api/estudiantes:
 *   get:
 *     summary: Obtiene la lista de estudiantes
 *     tags:
 *       - Estudiantes
 *     description: Retorna estudiantes con soporte para paginación, ordenamiento y filtros.
 *     parameters:
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *         description: Número de página (ej. 1)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Cantidad de registros por página (ej. 20)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Campo para ordenar (ej. createdAt, nombre)
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: programa
 *         schema:
 *           type: string
 *         description: Filtro exacto por ID del programa
 *       - in: query
 *         name: ciudad
 *         schema:
 *           type: string
 *         description: Filtro por ciudad de contacto
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Búsqueda libre en nombre, apellido o correo
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [ACTIVO, INACTIVO]
 *         description: Filtro opcional por estado; sin él se devuelven todos (activos e inactivos)
 *     responses:
 *       200:
 *         description: Lista de estudiantes obtenida exitosamente (cada uno incluye `estado`).
 *       400:
 *         description: El filtro estado no es ACTIVO ni INACTIVO (errorType EstadoInvalido).
 *       500:
 *         description: Error interno.
 */
router.get('/', obtenerEstudiantes);

/**
 * @swagger
 * /api/estudiantes/{id}:
 *   get:
 *     summary: Obtiene un estudiante por ID
 *     tags:
 *       - Estudiantes
 *     description: >-
 *       Endpoint crítico que consumen el Gateway (BFF) e Inscripciones. Devuelve también
 *       los estudiantes INACTIVO (con 200): quien consume debe revisar `estado`.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estudiante encontrado (incluye `estado`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Estudiante'
 *       404:
 *         description: Estudiante no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorNegocio'
 */
router.get('/:id', obtenerEstudiantePorId);

/**
 * @swagger
 * /api/estudiantes:
 *   post:
 *     summary: Crea un nuevo estudiante
 *     tags:
 *       - Estudiantes
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Estudiante'
 *     responses:
 *       201:
 *         description: Estudiante creado exitosamente.
 *       400:
 *         description: Error en los datos enviados.
 */
router.post('/', crearEstudiante);

/**
 * @swagger
 * /api/estudiantes/{id}:
 *   put:
 *     summary: Actualiza un estudiante existente
 *     tags:
 *       - Estudiantes
 *     description: >-
 *       Actualización parcial. Acepta `estado` opcional (ACTIVO | INACTIVO) para
 *       desactivar o reactivar al estudiante; cualquier otro valor responde 400.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Estudiante'
 *     responses:
 *       200:
 *         description: Estudiante actualizado.
 *       400:
 *         description: Datos inválidos (p. ej. estado distinto de ACTIVO/INACTIVO, correo duplicado).
 *       404:
 *         description: Estudiante no encontrado.
 */
router.put('/:id', actualizarEstudiante);

/**
 * @swagger
 * /api/estudiantes/{id}:
 *   delete:
 *     summary: Desactiva un estudiante (borrado lógico)
 *     tags:
 *       - Estudiantes
 *     description: >-
 *       No borra el registro: lo marca como INACTIVO. Se conservan la fotografía en S3 y
 *       los documentos. Es idempotente (si ya estaba INACTIVO responde 204 igual).
 *       Para reactivarlo, usar PUT con { "estado": "ACTIVO" }.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Estudiante marcado como INACTIVO (Sin contenido).
 *       404:
 *         description: Estudiante no encontrado.
 */
router.delete('/:id', eliminarEstudiante);

/**
 * @swagger
 * /api/estudiantes/{id}/fotografia:
 *   post:
 *     summary: Sube o reemplaza la fotografía del estudiante
 *     tags:
 *       - Estudiantes
 *     description: El archivo se envía directamente a AWS S3; en MongoDB solo se guardan sus metadatos. Solo JPG o PNG, máximo 2 MB.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fotografia
 *             properties:
 *               fotografia:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Fotografía subida; devuelve el estudiante con los metadatos y la URL firmada.
 *       400:
 *         description: Falta el archivo, el formato no es JPG/PNG o el ID es inválido.
 *       404:
 *         description: Estudiante no encontrado.
 *       413:
 *         description: La fotografía supera los 2 MB.
 */
router.post('/:id/fotografia', recibirFotografia, subirFotografia);

export default router;
