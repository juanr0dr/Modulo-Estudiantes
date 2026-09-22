import { Request, Response } from 'express';
import { Estudiante } from '../models/Estudiante';

// 1. POST - Crear Estudiante
export const crearEstudiante = async (req: Request, res: Response): Promise<void> => {
  try {
    const nuevoEstudiante = new Estudiante(req.body);
    const estudianteGuardado = await nuevoEstudiante.save();
    res.status(201).json(estudianteGuardado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear estudiante', error });
  }
};

// 2. GET - Obtener todos (Con Paginación, Ordenamiento y 3 Filtros)
export const obtenerEstudiantes = async (req: Request, res: Response): Promise<void> => {
  try {
    // Paginación
    const pageNumber = parseInt(req.query.pageNumber as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const skip = (pageNumber - 1) * pageSize;

    // Ordenamiento
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortDirection = (req.query.sortDirection as string) === 'desc' ? -1 : 1;
    let sortQuery: any = {};
    sortQuery[sortBy] = sortDirection;

    // 3 Filtros Relevantes
    const programa = req.query.programa as string; // Filtro 1: Exacto por FK (Ajustado a "programa")
    const ciudad = req.query.ciudad as string;     // Filtro 2: Sobre subdocumento (Contacto)
    const search = req.query.search as string;     // Filtro 3: Búsqueda libre (Regex)

    let query: any = {};

    if (programa) query.programa = programa;
    if (ciudad) query['contacto.ciudad'] = { $regex: ciudad, $options: 'i' };
    if (search) {
      query.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { apellido: { $regex: search, $options: 'i' } },
        { correo: { $regex: search, $options: 'i' } }
      ];
    }

    const totalRecords = await Estudiante.countDocuments(query);
    const estudiantes = await Estudiante.find(query)
      .populate('programa', 'nombre codigo facultad') // Ajustado al nombre real del campo
      .sort(sortQuery)
      .skip(skip)
      .limit(pageSize);

    res.status(200).json({
      totalRecords,
      pageNumber,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
      data: estudiantes
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener estudiantes', error });
  }
};

// 3. GET por ID
export const obtenerEstudiantePorId = async (req: Request, res: Response): Promise<any> => {
  try {
    const estudiante = await Estudiante.findById(req.params.id).populate('programa', 'nombre codigo facultad');
    if (!estudiante) {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }
    res.status(200).json(estudiante);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al buscar el estudiante', error });
  }
};

// 4. PUT/PATCH - Actualizar Estudiante
export const actualizarEstudiante = async (req: Request, res: Response): Promise<any> => {
  try {
    const estudianteActualizado = await Estudiante.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!estudianteActualizado) {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }
    res.status(200).json(estudianteActualizado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar', error });
  }
};

// 5. DELETE - Eliminar Estudiante
export const eliminarEstudiante = async (req: Request, res: Response): Promise<any> => {
  try {
    const estudianteEliminado = await Estudiante.findByIdAndDelete(req.params.id);
    if (!estudianteEliminado) {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }
    res.status(204).send(); 
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar', error });
  }
};