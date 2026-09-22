import { Router } from 'express';
import {
  crearDocumento,
  obtenerDocumentos,
  obtenerDocumentoPorId,
  actualizarDocumento,
  eliminarDocumento
} from '../controllers/documento.controller';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Documento:
 *       type: object
 *       required:
 *         - tipo
 *         - numero
 *         - estudiante
 *       properties:
 *         tipo:
 *           type: string
 *           description: Tipo de documento (CC, TI, Pasaporte)
 *         numero:
 *           type: string
 *         estudiante:
 *           type: string
 *           description: ID del estudiante en MongoDB
 */

/**
 * @swagger
 * /estudiantes/documentos:
 *   get:
 *     summary: Obtiene la lista de documentos
 *     parameters:
 *       - in: query
 *         name: estudianteId
 *         schema:
 *           type: string
 *         description: Filtrar documentos por el ID de un estudiante específico
 *     responses:
 *       200:
 *         description: Lista de documentos obtenida exitosamente.
 */
router.get('/', obtenerDocumentos);

/**
 * @swagger
 * /estudiantes/documentos/{id}:
 *   get:
 *     summary: Obtiene un documento por ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Documento encontrado.
 */
router.get('/:id', obtenerDocumentoPorId);

/**
 * @swagger
 * /estudiantes/documentos:
 *   post:
 *     summary: Crea un nuevo documento para un estudiante
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Documento'
 *     responses:
 *       201:
 *         description: Documento creado exitosamente.
 */
router.post('/', crearDocumento);

/**
 * @swagger
 * /estudiantes/documentos/{id}:
 *   put:
 *     summary: Actualiza un documento existente
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
 *             $ref: '#/components/schemas/Documento'
 *     responses:
 *       200:
 *         description: Documento actualizado.
 */
router.put('/:id', actualizarDocumento);

/**
 * @swagger
 * /estudiantes/documentos/{id}:
 *   delete:
 *     summary: Elimina un documento
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Documento eliminado.
 */
router.delete('/:id', eliminarDocumento);

export default router;