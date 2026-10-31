import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma';
import { subirArchivo, eliminarArchivo } from '../config/s3';
import { TIPOS_FOTOGRAFIA } from '../middlewares/subidaFotografia';
import { esIdValido } from '../utils/objectId';
import { serializarEstudianteConUrl } from '../utils/serializadores';

// POST - Subir/reemplazar la fotografía del estudiante (el archivo va directo a S3)
export const subirFotografia = async (req: Request, res: Response): Promise<any> => {
  const id = req.params.id as string;
  if (!esIdValido(id)) {
    return res.status(400).json({ mensaje: 'ID de estudiante inválido' });
  }

  try {
    const estudiante = await prisma.estudiante.findUnique({ where: { id }, include: { fotografia: true } });
    if (!estudiante) {
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }

    const archivo = req.file as Express.Multer.File;
    const clave = `estudiantes/${id}/fotografia/${randomUUID()}.${TIPOS_FOTOGRAFIA[archivo.mimetype]}`;
    const claveAnterior = estudiante.fotografia?.claveS3;

    await subirArchivo(clave, archivo.buffer, archivo.mimetype);

    // Solo los metadatos se guardan en PostgreSQL (tabla fotografias_estudiante)
    const metadatos = {
      claveS3: clave,
      nombreOriginal: archivo.originalname,
      tipoMime: archivo.mimetype,
      tamanoBytes: archivo.size,
    };

    let actualizado;
    try {
      await prisma.fotografiaEstudiante.upsert({
        where: { estudianteId: id },
        create: { estudianteId: id, ...metadatos },
        update: metadatos,
      });
      actualizado = await prisma.estudiante.findUnique({
        where: { id },
        include: { programa: true, fotografia: true },
      });
    } catch (error) {
      // Si no se pudieron guardar los metadatos, el objeto subido queda huérfano: se elimina
      await eliminarArchivo(clave).catch(() => undefined);
      throw error;
    }

    if (!actualizado) {
      await eliminarArchivo(clave).catch(() => undefined);
      return res.status(404).json({ mensaje: 'Estudiante no encontrado' });
    }

    // La fotografía reemplazada ya no se referencia: se borra del bucket
    if (claveAnterior) {
      eliminarArchivo(claveAnterior).catch((error) =>
        console.error(`No se pudo eliminar la fotografía anterior ${claveAnterior}`, error));
    }

    res.status(200).json(await serializarEstudianteConUrl(actualizado));
  } catch (error) {
    console.error('Error al subir la fotografía', error);
    res.status(500).json({ mensaje: 'Error al subir la fotografía' });
  }
};
