import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { generarId } from '../utils/objectId';
import { serializarDocumento } from '../utils/serializadores';
import { Campos, describirError, esNoEncontrado, validar } from '../utils/validacion';

const CAMPOS_DOCUMENTO: Campos = {
  tipo: { tipo: 'string', requerido: true }, // Ej: 'CC', 'TI', 'Pasaporte'
  numero: { tipo: 'string', requerido: true },
  estudiante: { tipo: 'objectId', requerido: true },
};

// Equivale a populate('estudiante', 'nombre apellido')
const INCLUIR_ESTUDIANTE = { estudiante: true } as const;

const datosDocumento = (cuerpo: Record<string, any>, parcial: boolean) => {
  const { estudiante, ...resto } = validar('Documento', CAMPOS_DOCUMENTO, cuerpo, { parcial });
  return { ...resto, ...(estudiante !== undefined && { estudianteId: estudiante }) };
};

// 1. POST - Crear Documento
export const crearDocumento = async (req: Request, res: Response): Promise<any> => {
  try {
    const documentoGuardado = await prisma.documento.create({
      data: { id: generarId(), ...datosDocumento(req.body, false) } as Prisma.DocumentoUncheckedCreateInput,
    });
    res.status(201).json(serializarDocumento(documentoGuardado));
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear documento', error: describirError(error) });
  }
};

// 2. GET - Obtener todos los documentos (opcionalmente filtrados por estudiante)
export const obtenerDocumentos = async (req: Request, res: Response): Promise<void> => {
  try {
    // Si envían ?estudianteId en la URL, filtramos; si no, traemos todos
    const estudianteId = req.query.estudianteId as string;
    const where: Prisma.DocumentoWhereInput = estudianteId ? { estudianteId: String(estudianteId) } : {};

    const documentos = await prisma.documento.findMany({
      where,
      include: INCLUIR_ESTUDIANTE,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    res.status(200).json(documentos.map(serializarDocumento));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener documentos', error: describirError(error) });
  }
};

// 3. GET por ID
export const obtenerDocumentoPorId = async (req: Request, res: Response): Promise<any> => {
  try {
    const documento = await prisma.documento.findUnique({
      where: { id: req.params.id as string },
      include: INCLUIR_ESTUDIANTE,
    });
    if (!documento) {
      return res.status(404).json({ mensaje: 'Documento no encontrado' });
    }
    res.status(200).json(serializarDocumento(documento));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al buscar el documento', error: describirError(error) });
  }
};

// 4. PUT - Actualizar Documento
export const actualizarDocumento = async (req: Request, res: Response): Promise<any> => {
  try {
    const documentoActualizado = await prisma.documento.update({
      where: { id: req.params.id as string },
      data: datosDocumento(req.body, true),
    });
    res.status(200).json(serializarDocumento(documentoActualizado));
  } catch (error) {
    if (esNoEncontrado(error)) {
      return res.status(404).json({ mensaje: 'Documento no encontrado' });
    }
    res.status(400).json({ mensaje: 'Error al actualizar', error: describirError(error) });
  }
};

// 5. DELETE - Eliminar Documento
export const eliminarDocumento = async (req: Request, res: Response): Promise<any> => {
  try {
    await prisma.documento.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (error) {
    if (esNoEncontrado(error)) {
      return res.status(404).json({ mensaje: 'Documento no encontrado' });
    }
    res.status(500).json({ mensaje: 'Error al eliminar', error: describirError(error) });
  }
};
