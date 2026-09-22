import { Router } from 'express';
import {
  crearEstudiante,
  obtenerEstudiantes,
  obtenerEstudiantePorId,
  actualizarEstudiante,
  eliminarEstudiante
} from '../controllers/estudiante.controller';

const router = Router();

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
 *         - programa_id
 *         - contacto
 *       properties:
 *         nombre:
 *           type: string
 *         apellido:
 *           type: string
 *         correo:
 *           type: string
 *         programa_id:
 *           type: string
 *           description: ID del programa en MongoDB
 *         contacto:
 *           $ref: '#/components/schemas/Contacto'
 */

/**
 * @swagger
 * /api/estudiantes:
 *   get:
 *     summary: Obtiene la lista de estudiantes
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
 *         name: programa_id
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
 *     responses:
 *       200:
 *         description: Lista de estudiantes obtenida exitosamente.
 */
router.get('/', obtenerEstudiantes);

/**
 * @swagger
 * /api/estudiantes/{id}:
 *   get:
 *     summary: Obtiene un estudiante por ID
 *     description: Endpoint crítico que consumirá el Gateway para el orquestador (BFF).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estudiante encontrado.
 *       404:
 *         description: Estudiante no encontrado.
 */
router.get('/:id', obtenerEstudiantePorId);

/**
 * @swagger
 * /api/estudiantes:
 *   post:
 *     summary: Crea un nuevo estudiante
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
 *       404:
 *         description: Estudiante no encontrado.
 */
router.put('/:id', actualizarEstudiante);

/**
 * @swagger
 * /api/estudiantes/{id}:
 *   delete:
 *     summary: Elimina un estudiante
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Estudiante eliminado (Sin contenido).
 *       404:
 *         description: Estudiante no encontrado.
 */
router.delete('/:id', eliminarEstudiante);

export default router;