import { Request, Response } from 'express';
import { Programa } from '../models/Programa';

// 1. POST - Crear Programa
export const crearPrograma = async (req: Request, res: Response): Promise<any> => {
  try {
    const nuevoPrograma = new Programa(req.body);
    const programaGuardado = await nuevoPrograma.save();
    res.status(201).json(programaGuardado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear el programa', error });
  }
};

// 2. GET - Obtener todos los programas
export const obtenerProgramas = async (req: Request, res: Response): Promise<void> => {
  try {
    const programas = await Programa.find();
    res.status(200).json(programas);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener programas', error });
  }
};

// 3. GET por ID
export const obtenerProgramaPorId = async (req: Request, res: Response): Promise<any> => {
  try {
    const programa = await Programa.findById(req.params.id);
    if (!programa) {
      return res.status(404).json({ mensaje: 'Programa no encontrado' });
    }
    res.status(200).json(programa);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al buscar el programa', error });
  }
};

// 4. PUT - Actualizar Programa
export const actualizarPrograma = async (req: Request, res: Response): Promise<any> => {
  try {
    const programaActualizado = await Programa.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!programaActualizado) {
      return res.status(404).json({ mensaje: 'Programa no encontrado' });
    }
    res.status(200).json(programaActualizado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar el programa', error });
  }
};

// 5. DELETE - Eliminar Programa
export const eliminarPrograma = async (req: Request, res: Response): Promise<any> => {
  try {
    const programaEliminado = await Programa.findByIdAndDelete(req.params.id);
    if (!programaEliminado) {
      return res.status(404).json({ mensaje: 'Programa no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar el programa', error });
  }
};