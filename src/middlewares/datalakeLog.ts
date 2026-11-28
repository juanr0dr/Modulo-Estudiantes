import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Datalake de peticiones: al terminar cada respuesta imprime UNA línea JSON por la
 * salida estándar con el prefijo "DLK " (y, si existe LOG_DIR, la agrega sin prefijo a
 * LOG_DIR/<service>-<instance>-AAAAMMDD-HH.jsonl). El contrato de campos es el mismo en
 * todos los módulos; un recolector externo lee estas líneas y las guarda en Parquet.
 *
 * Registrar el log nunca debe romper ni demorar la petición: todo va en try/catch, la
 * línea se arma cuando la respuesta ya se envió y el archivo se escribe de forma asíncrona.
 */

export const PREFIJO_DATALAKE = 'DLK ';
export const ENCABEZADO_TRAZA = 'x-trace-id';
const LIMITE_CUERPO_BYTES = 16 * 1024;

// Campos del contrato, en orden fijo (todos presentes; null si no aplica)
export interface LineaDatalake {
  ts: string;
  service: string;
  instance: string;
  trace_id: string;
  method: string;
  path: string;
  query: string | null;
  status: number;
  latency_ms: number;
  user_id: string | null;
  role: string | null;
  idempotency_key: string | null;
  error_type: string | null;
  request_body: unknown;
}

export type EscritorDatalake = (linea: LineaDatalake) => void;

// No se registran health checks, actuator ni la documentación (Swagger en /docs)
const RUTAS_EXCLUIDAS = [/^\/health(\/|$)/, /^\/actuator(\/|$)/, /^\/docs(\/|$)/, /swagger/i, /api-docs/i];

// Rutas cuyo cuerpo NUNCA se registra (credenciales)
const RUTAS_CUERPO_OMITIDO = [/^\/api\/auth\/login\/?$/i, /^\/api\/auth\/registro\/?$/i];

const generarTraceId = (): string => randomBytes(8).toString('hex');

// Primer valor de un encabezado (Node puede entregar arreglos) o null
const encabezado = (req: Request, nombre: string): string | null => {
  const valor = req.headers[nombre];
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return typeof texto === 'string' && texto !== '' ? texto : null;
};

const tieneCuerpo = (req: Request): boolean => {
  const largo = Number(req.headers['content-length']);
  return (Number.isFinite(largo) && largo > 0) || req.headers['transfer-encoding'] !== undefined;
};

const esJson = (req: Request): boolean => {
  const tipo = String(req.headers['content-type'] ?? '').toLowerCase();
  return /^application\/([\w.+-]+\+)?json/.test(tipo);
};

/**
 * request_body según el contrato:
 * - "<omitido>" en /api/auth/login y /api/auth/registro
 * - null si no hay cuerpo
 * - el objeto JSON (ya interpretado por express.json) si es JSON y cabe en 16 KB
 * - "<demasiado-grande>" si supera 16 KB
 * - "<no-json>" si es de otro tipo (multipart, binario) o JSON que no se pudo interpretar
 *   (el stream nunca se lee aquí, así que multer no se ve afectado)
 */
const cuerpoPeticion = (req: Request, ruta: string): unknown => {
  if (RUTAS_CUERPO_OMITIDO.some((patron) => patron.test(ruta))) return '<omitido>';
  if (!tieneCuerpo(req)) return null;

  const largo = Number(req.headers['content-length']);
  if (Number.isFinite(largo) && largo > LIMITE_CUERPO_BYTES) return '<demasiado-grande>';
  if (!esJson(req) || req.body === undefined) return '<no-json>';

  const serializado = JSON.stringify(req.body);
  if (serializado === undefined) return '<no-json>';
  if (Buffer.byteLength(serializado, 'utf8') > LIMITE_CUERPO_BYTES) return '<demasiado-grande>';
  return req.body;
};

const carpetasCreadas = new Set<string>();
let colaArchivo: Promise<void> = Promise.resolve();

// Nombre de archivo seguro aunque HOSTNAME traiga caracteres raros
const paraArchivo = (texto: string) => texto.replace(/[^A-Za-z0-9._-]/g, '_');

const escribirArchivo = async (dir: string, linea: LineaDatalake, json: string): Promise<void> => {
  // AAAAMMDD-HH en UTC, tomado del mismo ts de la línea
  const fecha = linea.ts.slice(0, 10).replace(/-/g, '');
  const hora = linea.ts.slice(11, 13);
  const archivo = path.join(dir, `${paraArchivo(linea.service)}-${paraArchivo(linea.instance)}-${fecha}-${hora}.jsonl`);
  if (!carpetasCreadas.has(dir)) {
    await fs.mkdir(dir, { recursive: true });
    carpetasCreadas.add(dir);
  }
  await fs.appendFile(archivo, `${json}\n`, 'utf8');
};

export interface SalidaTexto {
  write(texto: string): unknown;
}

// Escritor estándar: "DLK <json>" por la salida (stdout) y, si LOG_DIR está definido,
// la misma línea sin prefijo en el archivo .jsonl de la hora. La salida es inyectable
// para las pruebas.
export const crearEscritor = (salida: SalidaTexto = process.stdout): EscritorDatalake => (linea) => {
  const json = JSON.stringify(linea);
  try {
    salida.write(`${PREFIJO_DATALAKE}${json}\n`);
  } catch {
    // Nunca propagar errores del log
  }
  const dir = process.env.LOG_DIR;
  if (dir) {
    // Cola: las escrituras al archivo van una tras otra, en el mismo orden que stdout
    colaArchivo = colaArchivo
      .then(() => escribirArchivo(dir, linea, json))
      .catch(() => {
        carpetasCreadas.delete(dir); // reintentar crear la carpeta en la próxima línea
      });
  }
};

export const escritorPorDefecto = crearEscritor();

export interface OpcionesDatalake {
  service: string;
  escribir?: EscritorDatalake;
}

export const crearDatalakeLog = ({ service, escribir = escritorPorDefecto }: OpcionesDatalake): RequestHandler =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const inicio = process.hrtime.bigint();
      const ts = new Date().toISOString(); // llegada de la petición (UTC, ms, Z)
      const traceId = encabezado(req, ENCABEZADO_TRAZA) ?? generarTraceId();
      res.locals.traceId = traceId;
      // Toda respuesta lleva x-trace-id (también las excluidas del log)
      res.setHeader(ENCABEZADO_TRAZA, traceId);

      const [ruta, ...resto] = req.originalUrl.split('?');
      if (RUTAS_EXCLUIDAS.some((patron) => patron.test(ruta))) {
        next();
        return;
      }
      const query = resto.join('?');

      let registrada = false;
      const registrar = () => {
        if (registrada) return;
        registrada = true;
        try {
          escribir({
            ts,
            service,
            instance: process.env.HOSTNAME || 'local',
            trace_id: traceId,
            method: req.method,
            path: ruta,
            query: query === '' ? null : query,
            status: res.statusCode,
            latency_ms: Math.round(Number(process.hrtime.bigint() - inicio) / 1e6),
            user_id: encabezado(req, 'x-user-id'),
            role: encabezado(req, 'x-user-role'),
            idempotency_key: encabezado(req, 'idempotency-key'),
            error_type: typeof res.locals.errorType === 'string' ? res.locals.errorType : null,
            request_body: cuerpoPeticion(req, ruta),
          });
        } catch {
          // Nunca propagar errores del log
        }
      };
      // finish: respuesta enviada completa; close: el cliente cortó antes (se registra igual, una vez)
      res.once('finish', registrar);
      res.once('close', registrar);
    } catch {
      // Si algo falla al preparar el log, la petición sigue igual
    }
    next();
  };

export const datalakeLog = crearDatalakeLog({ service: 'estudiantes' });
