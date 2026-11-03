import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Credenciales, región y bucket se leen únicamente de variables de entorno
const requeridas = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME'];
const faltantes = requeridas.filter((nombre) => !process.env[nombre]);
if (faltantes.length > 0) {
  throw new Error(`Faltan variables de entorno de AWS S3: ${faltantes.join(', ')}`);
}

// Vigencia de las URLs firmadas que se entregan al frontend
const URL_EXPIRA_SEGUNDOS = 3600;

const bucket = process.env.AWS_BUCKET_NAME as string;

// Solo para pruebas locales con un S3 compatible (MinIO/LocalStack); en AWS no se define
const endpoint = process.env.AWS_S3_ENDPOINT;

// Credenciales explícitas: el SDK no recurre a perfiles locales (~/.aws) ni a otras fuentes
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    // Requerido solo con credenciales temporales (p. ej. AWS Academy)
    sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
  },
  ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
});

export const subirArchivo = async (clave: string, contenido: Buffer, tipoMime: string): Promise<void> => {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: clave,
    Body: contenido,
    ContentType: tipoMime,
    ContentLength: contenido.length,
  }));
};

export const eliminarArchivo = async (clave: string): Promise<void> => {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: clave }));
};

// El bucket es privado: el frontend accede al archivo mediante una URL firmada temporal
export const urlTemporal = (clave: string): Promise<string> =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: clave }), { expiresIn: URL_EXPIRA_SEGUNDOS });
