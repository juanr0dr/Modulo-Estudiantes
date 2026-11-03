import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { eliminarArchivo } from '../config/s3';
import { generarId } from '../utils/objectId';
import { serializarEstudiante, serializarEstudianteConUrl } from '../utils/serializadores';
import { Campos, describirError, esNoEncontrado, validar } from '../utils/validacion';

const CAMPOS_ESTUDIANTE: Campos = {
  nombre: { tipo: 'string', requerido: true },
  apellido: { tipo: 'string', requerido: true },
  correo: { tipo: 'string', requerido: true },
  fecha_nacimiento: { tipo: 'date', requerido: true },
  programa: { tipo: 'objectId', requerido: true },
};

const CAMPOS_CONTACTO: Campos = {
  telefono: { tipo: 'string', requerido: true },
  direccion: { tipo: 'string', requerido: true },
  ciudad: { tipo: 'string', requerido: true },
};

// Relaciones que se devuelven pobladas en las lecturas
const INCLUIR_LECTURA = { programa: true, fotografia: true } as const;

// Campos por los que se puede ordenar (JSON del API -> columna)
const CAMPOS_ORDEN: Record<string, keyof Prisma.EstudianteOrderByWithRelationInput> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  nombre: 'nombre',
  apellido: 'apellido',
  correo: 'correo',
  fecha_nacimiento: 'fechaNacimiento',
  'contacto.ciudad': 'ciudad',
};

/**
 * Valida el cuerpo y lo traduce a columnas. La fotografía nunca se toma del
 * cuerpo JSON: solo se modifica con POST /:id/fotografia.
 */
const datosEstudiante = (cuerpo: Record<string, any> = {}, parcial: boolean) => {
  const datos = validar('Estudiante', CAMPOS_ESTUDIANTE, cuerpo, { parcial });

  // Contacto: subdocumento obligatorio; si se envía, se reemplaza completo
  let contacto: Record<string, any> | undefined;
  if (!parcial || cuerpo.contacto !== undefined) {
    if (cuerpo.contacto === undefined || cuerpo.contacto === null || typeof cuerpo.contacto !== 'object') {
      validar('Estudiante', { contacto: { tipo: 'string', requerido: true } }, {}, { parcial: false });
    }
    contacto = validar('Estudiante', CAMPOS_CONTACTO, cuerpo.contacto, { prefijo: 'contacto.' });
  }

  return {
    ...(datos.nombre !== undefined && { nombre: datos.nombre }),
    ...(datos.apellido !== undefined && { apellido: datos.apellido }),
    ...(datos.correo !== undefined && { correo: datos.correo }),
    ...(datos.fecha_nacimiento !== undefined && { fechaNacimiento: datos.fecha_nacimiento }),
    ...(datos.programa !== undefined && { programaId: datos.programa }),
    ...contacto,
  };
};

// 1. POST - Crear Estudiante
export const crearEstudiante = async (req: Request, res: Response): Promise<void> => {
  try {
    const datos = datosEstudiante(req.body, false);
    const estudianteGuardado = await prisma.estudiante.create({
      data: { id: generarId(), ...datos } as Prisma.EstudianteUncheckedCreateInput,
    });
    res.status(201).json(serializarEstudiante(estudianteGuardado));
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear estudiante', error: describirError(error) });
  }
};

// 2. GET - Obtener todos (Con Paginación, Ordenamiento y 3 Filtros)
export const obtenerEstudiantes = async (req: Request, res: Response): Promise<void> => {
  try {
    // Paginación
    const pageNumber = Math.max(parseInt(req.query.pageNumber as string) || 1, 1);
    const pageSize = Math.max(parseInt(req.query.pageSize as string) || 20, 1);
    const skip = (pageNumber - 1) * pageSize;

    // Ordenamiento (campos desconocidos -> createdAt; el id desempata para paginar estable)
    const sortBy = CAMPOS_ORDEN[req.query.sortBy as string] ?? 'createdAt';
    const sortDirection: Prisma.SortOrder = (req.query.sortDirection as string) === 'desc' ? 'desc' : 'asc';
    const orderBy: Prisma.EstudianteOrderByWithRelationInput[] = [{ [sortBy]: sortDirection }, { id: sortDirection }];

    // 3 Filtros Relevantes
    const programa = req.query.programa as string; // Filtro 1: Exacto por FK
    const ciudad = req.query.ciudad as string;     // Filtro 2: Ciudad de contacto (parcial, sin mayúsculas)
    const search = req.query.search as string;     // Filtro 3: Búsqueda libre

    const where: Prisma.EstudianteWhereInput = {};
    if (programa) where.programaId = String(programa);
    if (ciudad) where.ciudad = { contains: String(ciudad), mode: 'insensitive' };
    if (search) {
      where.OR = ['nombre', 'apellido', 'correo'].map((campo) => ({
        [campo]: { contains: String(search), mode: 'insensitive' },
      }));
    }

    const [totalRecords, estudiantes] = await Promise.all([
      prisma.estudiante.count({ where }),
      prisma.estudiante.findMany({ where, include: INCLUIR_LECTURA, orderBy, skip, take: pageSize }),
    ]);

    res.status(200).json({
      totalRecords,
      pageNumber,
      pageSize,
      totalPages: Math.ceil(totalRecords / pageSize),
      data: await Promise.all(estudiantes.map(serializarEstudianteConUrl))
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener estudiantes', error: describirError(error) });
  }
};

// 3. GET por ID
export const obtenerEstudiantePorId = async (req: Request, res: Response): Promise<any> => {
  try {
    const estudiante = await prisma.estudiante.findUnique({
      where: { id: req.params.id as string },
      include: INCLUIR_LECTURA,
    });
    if (!estudiante) {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }
    // Incluye fotografia.url (URL firmada de S3), que el Gateway expone en /detalle
    res.status(200).json(await serializarEstudianteConUrl(estudiante));
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al buscar el estudiante', error: describirError(error) });
  }
};

// 4. PUT/PATCH - Actualizar Estudiante
export const actualizarEstudiante = async (req: Request, res: Response): Promise<any> => {
  try {
    const estudianteActualizado = await prisma.estudiante.update({
      where: { id: req.params.id as string },
      data: datosEstudiante(req.body, true),
      include: { fotografia: true },
    });
    res.status(200).json(serializarEstudiante(estudianteActualizado));
  } catch (error) {
    if (esNoEncontrado(error)) {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }
    res.status(400).json({ mensaje: 'Error al actualizar', error: describirError(error) });
  }
};

// 5. DELETE - Eliminar Estudiante (sus documentos y fotografía se eliminan en cascada)
export const eliminarEstudiante = async (req: Request, res: Response): Promise<any> => {
  try {
    const estudianteEliminado = await prisma.estudiante.delete({
      where: { id: req.params.id as string },
      include: { fotografia: true },
    });
    // La fotografía en S3 deja de estar referenciada
    const claveFotografia = estudianteEliminado.fotografia?.claveS3;
    if (claveFotografia) {
      eliminarArchivo(claveFotografia).catch((error) =>
        console.error(`No se pudo eliminar la fotografía ${claveFotografia}`, error));
    }
    res.status(204).send();
  } catch (error) {
    if (esNoEncontrado(error)) {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }
    res.status(500).json({ mensaje: 'Error al eliminar', error: describirError(error) });
  }
};
