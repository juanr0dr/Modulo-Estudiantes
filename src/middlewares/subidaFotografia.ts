import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export const CAMPO_FOTOGRAFIA = 'fotografia';
export const TAMANO_MAXIMO_FOTOGRAFIA = 2 * 1024 * 1024; // 2 MB

// Tipo MIME permitido -> extensión con la que se guarda en S3
export const TIPOS_FOTOGRAFIA: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

// Firmas binarias ("magic numbers"): el tipo MIME lo declara el cliente y no basta
const FIRMAS: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

class FormatoNoPermitidoError extends Error {}

const upload = multer({
  // En memoria: el archivo nunca se escribe en el disco del servidor
  storage: multer.memoryStorage(),
  limits: { fileSize: TAMANO_MAXIMO_FOTOGRAFIA, files: 1 },
  // Nombres de archivo con tildes/ñ (los tipos de @types/multer aún no lo incluyen)
  defParamCharset: 'utf8',
  fileFilter: (_req, file, cb) => {
    if (file.mimetype in TIPOS_FOTOGRAFIA) {
      cb(null, true);
    } else {
      cb(new FormatoNoPermitidoError());
    }
  },
} as multer.Options);

const firmaValida = (contenido: Buffer, tipoMime: string): boolean => {
  const firma = FIRMAS[tipoMime];
  return !!firma && contenido.length >= firma.length && firma.every((byte, i) => contenido[i] === byte);
};

// Recibe la fotografía (multipart/form-data) y valida formato y tamaño antes del controlador
export const recibirFotografia = (req: Request, res: Response, next: NextFunction): void => {
  upload.single(CAMPO_FOTOGRAFIA)(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ mensaje: 'La fotografía supera el tamaño máximo permitido de 2 MB' });
        return;
      }
      res.status(400).json({ mensaje: `Se espera un único archivo en el campo "${CAMPO_FOTOGRAFIA}"` });
      return;
    }
    if (err instanceof FormatoNoPermitidoError) {
      res.status(400).json({ mensaje: 'Formato no permitido: la fotografía debe ser JPG o PNG' });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    if (!req.file) {
      res.status(400).json({ mensaje: `Debe enviar la fotografía en el campo "${CAMPO_FOTOGRAFIA}" (multipart/form-data)` });
      return;
    }
    if (!firmaValida(req.file.buffer, req.file.mimetype)) {
      res.status(400).json({ mensaje: 'El contenido del archivo no corresponde a una imagen JPG o PNG' });
      return;
    }
    next();
  });
};
