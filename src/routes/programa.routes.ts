import { Router } from 'express';
import {
  crearPrograma,
  obtenerProgramas,
  obtenerProgramaPorId,
  actualizarPrograma,
  eliminarPrograma
} from '../controllers/programa.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Programa:
 *       type: object
 *       required:
 *         - nombre
 *         - codigo
 *         - facultad
 *       properties:
 *         nombre:
 *           type: string
 *         codigo:
 *           type: string
 *         facultad:
 *           type: string
 */

/**
 * @swagger
 * /api/estudiantes/programas:
 *   get:
 *     summary: Obtiene la lista de todos los programas académicos
 *     tags:
 *       - Programas
 *     responses:
 *       200:
 *         description: Lista de programas obtenida exitosamente.
 */
router.get('/', obtenerProgramas);

/**
 * @swagger
 * /api/estudiantes/programas/{id}:
 *   get:
 *     summary: Obtiene un programa por ID
 *     tags:
 *       - Programas
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Programa encontrado.
 */
router.get('/:id', obtenerProgramaPorId);

/**
 * @swagger
 * /api/estudiantes/programas:
 *   post:
 *     summary: Crea un nuevo programa
 *     tags:
 *       - Programas
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Programa'
 *     responses:
 *       201:
 *         description: Programa creado exitosamente.
 */
router.post('/', crearPrograma);

/**
 * @swagger
 * /api/estudiantes/programas/{id}:
 *   put:
 *     summary: Actualiza un programa existente
 *     tags:
 *       - Programas
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
 *             $ref: '#/components/schemas/Programa'
 *     responses:
 *       200:
 *         description: Programa actualizado exitosamente.
 */
router.put('/:id', actualizarPrograma);

/**
 * @swagger
 * /api/estudiantes/programas/{id}:
 *   delete:
 *     summary: Elimina un programa
 *     tags:
 *       - Programas
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Programa eliminado.
 */
router.delete('/:id', eliminarPrograma);

export default router;
