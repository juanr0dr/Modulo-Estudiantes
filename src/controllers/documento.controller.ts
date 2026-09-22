import { Request, Response } from 'express';
import { Documento } from '../models/Documento';

// 1. POST - Crear Documento
export const crearDocumento = async (req: Request, res: Response): Promise<any> => {
  try {
    const nuevoDocumento = new Documento(req.body);
    const documentoGuardado = await nuevoDocumento.save();
    res.status(201).json(documentoGuardado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear documento', error });
  }
};

// 2. GET - Obtener todos los documentos (opcionalmente filtrados por estudiante)
export const obtenerDocumentos = async (req: Request, res: Response): Promise<void> => {
  try {
    // Si envían ?estudianteId en la URL, filtramos; si no, traemos todos
    const estudianteId = req.query.estudianteId as string;
    let query = {};
    if (estudianteId) {
      query = { estudiante: estudianteId };
    }

    const documentos = await Documento.find(query).populate('estudiante', 'nombre apellido');
    res.status(200).json(documentos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener documentos', error });
  }
};

// 3. GET por ID
export const obtenerDocumentoPorId = async (req: Request, res: Response): Promise<any> => {
  try {
    const documento = await Documento.findById(req.params.id).populate('estudiante', 'nombre apellido');
    if (!documento) {
      return res.status(404).json({ mensaje: 'Documento no encontrado' });
    }
    res.status(200).json(documento);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al buscar el documento', error });
  }
};

// 4. PUT - Actualizar Documento
export const actualizarDocumento = async (req: Request, res: Response): Promise<any> => {
  try {
    const documentoActualizado = await Documento.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!documentoActualizado) {
      return res.status(404).json({ mensaje: 'Documento no encontrado' });
    }
    res.status(200).json(documentoActualizado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar', error });
  }
};

// 5. DELETE - Eliminar Documento
export const eliminarDocumento = async (req: Request, res: Response): Promise<any> => {
  try {
    const documentoEliminado = await Documento.findByIdAndDelete(req.params.id);
    if (!documentoEliminado) {
      return res.status(404).json({ mensaje: 'Documento no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar', error });
  }
};