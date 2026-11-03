import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { generarId } from '../utils/objectId';
import { serializarPrograma } from '../utils/serializadores';
import { Campos, describirError, esNoEncontrado, esReferenciaEnUso, validar } from '../utils/validacion';

const CAMPOS_PROGRAMA: Campos = {
  nombre: { tipo: 'string', requerido: true },
  codigo: { tipo: 'string', requerido: true },
  facultad: { tipo: 'string', requerido: true },
};

// 1. POST - Crear Programa
export const crearPrograma = async (req: Request, res: Response): Promise<any> => {
  try {
    const datos = validar('Programa', CAMPOS_PROGRAMA, req.body);
    const programaGuardado = await prisma.programa.create({ data: { id: generarId(), ...datos } as any });
    res.status(201).json(serializarPrograma(programaGuardado));
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear el programa', error: describirError(error) });
  }
};

// 2. GET - Obtener todos los programas
export const obtenerProgramas = async (req: Request, res: Response): Promise<void> => {
  try {
    const programas = await prisma.programa.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    res.status(200).json(programas.map(serializarPrograma));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener programas', error: describirError(error) });
  }
};

// 3. GET por ID
export const obtenerProgramaPorId = async (req: Request, res: Response): Promise<any> => {
  try {
    const programa = await prisma.programa.findUnique({ where: { id: req.params.id as string } });
    if (!programa) {
      return res.status(404).json({ mensaje: 'Programa no encontrado' });
    }
    res.status(200).json(serializarPrograma(programa));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al buscar el programa', error: describirError(error) });
  }
};

// 4. PUT - Actualizar Programa
export const actualizarPrograma = async (req: Request, res: Response): Promise<any> => {
  try {
    const datos = validar('Programa', CAMPOS_PROGRAMA, req.body, { parcial: true });
    const programaActualizado = await prisma.programa.update({
      where: { id: req.params.id as string },
      data: datos,
    });
    res.status(200).json(serializarPrograma(programaActualizado));
  } catch (error) {
    if (esNoEncontrado(error)) {
      return res.status(404).json({ mensaje: 'Programa no encontrado' });
    }
    res.status(400).json({ mensaje: 'Error al actualizar el programa', error: describirError(error) });
  }
};

// 5. DELETE - Eliminar Programa
export const eliminarPrograma = async (req: Request, res: Response): Promise<any> => {
  try {
    await prisma.programa.delete({ where: { id: req.params.id as string } });
    res.status(204).send();
  } catch (error) {
    if (esNoEncontrado(error)) {
      return res.status(404).json({ mensaje: 'Programa no encontrado' });
    }
    // La llave foránea impide dejar estudiantes apuntando a un programa inexistente
    if (esReferenciaEnUso(error)) {
      return res.status(409).json({ mensaje: 'No se puede eliminar el programa porque tiene estudiantes asociados' });
    }
    res.status(500).json({ mensaje: 'Error al eliminar el programa', error: describirError(error) });
  }
};
