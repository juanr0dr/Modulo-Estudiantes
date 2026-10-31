import { Documento, Estudiante, FotografiaEstudiante, Programa } from '@prisma/client';
import { urlTemporal } from '../config/s3';

// Convierten las filas de PostgreSQL al mismo JSON que devolvía Mongoose, para no
// alterar el contrato del API (_id, programa poblado o como id, contacto anidado...).

export const serializarPrograma = (programa: Programa) => ({
  _id: programa.id,
  nombre: programa.nombre,
  codigo: programa.codigo,
  facultad: programa.facultad,
  createdAt: programa.createdAt,
  updatedAt: programa.updatedAt,
});

// Equivale a populate('programa', 'nombre codigo facultad')
const resumenPrograma = (programa: Programa) => ({
  _id: programa.id,
  nombre: programa.nombre,
  codigo: programa.codigo,
  facultad: programa.facultad,
});

const serializarFotografia = (fotografia: FotografiaEstudiante) => ({
  clave_s3: fotografia.claveS3,
  nombre_original: fotografia.nombreOriginal,
  tipo_mime: fotografia.tipoMime,
  tamano_bytes: fotografia.tamanoBytes,
});

export type EstudianteConRelaciones = Estudiante & {
  programa?: Programa | null;
  fotografia?: FotografiaEstudiante | null;
};

// "programa" sale poblado solo si se cargó la relación; si no, como id (igual que Mongoose)
export const serializarEstudiante = (estudiante: EstudianteConRelaciones) => ({
  _id: estudiante.id,
  nombre: estudiante.nombre,
  apellido: estudiante.apellido,
  correo: estudiante.correo,
  fecha_nacimiento: estudiante.fechaNacimiento,
  programa: estudiante.programa ? resumenPrograma(estudiante.programa) : estudiante.programaId,
  contacto: {
    telefono: estudiante.telefono,
    direccion: estudiante.direccion,
    ciudad: estudiante.ciudad,
  },
  ...(estudiante.fotografia && { fotografia: serializarFotografia(estudiante.fotografia) }),
  createdAt: estudiante.createdAt,
  updatedAt: estudiante.updatedAt,
});

// Respuestas de lectura: agregan fotografia.url (URL firmada de S3), que el
// Gateway expone en /detalle. La URL no se guarda en la base de datos.
export const serializarEstudianteConUrl = async (estudiante: EstudianteConRelaciones) => {
  const json: Record<string, any> = serializarEstudiante(estudiante);
  if (json.fotografia) {
    json.fotografia.url = await urlTemporal(json.fotografia.clave_s3);
  }
  return json;
};

// "estudiante" sale poblado (_id, nombre, apellido) solo si se cargó la relación
export const serializarDocumento = (documento: Documento & { estudiante?: Estudiante | null }) => ({
  _id: documento.id,
  tipo: documento.tipo,
  numero: documento.numero,
  estudiante: documento.estudiante
    ? { _id: documento.estudiante.id, nombre: documento.estudiante.nombre, apellido: documento.estudiante.apellido }
    : documento.estudianteId,
  createdAt: documento.createdAt,
  updatedAt: documento.updatedAt,
});
