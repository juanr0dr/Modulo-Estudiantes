import { Prisma } from '@prisma/client';
import { esIdValido } from './objectId';

// Validación y conversión de tipos equivalente a la que hacía Mongoose
// (mismos mensajes), ahora que el esquema vive en PostgreSQL.

type TipoCampo = 'string' | 'date' | 'objectId';
export type Campos = Record<string, { tipo: TipoCampo; requerido?: boolean }>;

export class ValidationError extends Error {
  errors: Record<string, { path: string; message: string }>;

  constructor(modelo: string, errors: Record<string, { path: string; message: string }>, parcial: boolean) {
    const detalle = Object.values(errors).map((e) => `${e.path}: ${e.message}`).join(', ');
    super(`${parcial ? 'Validation failed' : `${modelo} validation failed`}: ${detalle}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toJSON() {
    return { name: this.name, message: this.message, errors: this.errors };
  }
}

const tipoDe = (valor: unknown): string => {
  if (Array.isArray(valor)) return 'Array';
  if (valor !== null && typeof valor === 'object') return 'Object';
  return typeof valor;
};

const errorDeCast = (tipo: string, valor: unknown, campo: string) =>
  `Cast to ${tipo} failed for value ${JSON.stringify(valor)} (type ${tipoDe(valor)}) at path "${campo}"`;

const convertir = (tipo: TipoCampo, valor: unknown, campo: string): { valor?: unknown; error?: string } => {
  if (valor === null) return { valor: null };
  switch (tipo) {
    case 'string':
      return ['string', 'number', 'boolean'].includes(typeof valor)
        ? { valor: String(valor) }
        : { error: errorDeCast('string', valor, campo) };
    case 'date': {
      const fecha = valor instanceof Date ? valor : new Date(valor as string | number);
      return typeof valor !== 'boolean' && !Number.isNaN(fecha.getTime())
        ? { valor: fecha }
        : { error: errorDeCast('date', valor, campo) };
    }
    case 'objectId':
      return esIdValido(valor) ? { valor: valor.toLowerCase() } : { error: errorDeCast('ObjectId', valor, campo) };
  }
};

/**
 * Valida y convierte `datos` según `campos`.
 * - Creación: todos los requeridos deben venir.
 * - Actualización (parcial): solo se validan los campos presentes.
 * Los campos desconocidos se ignoran (como el modo strict de Mongoose).
 */
export const validar = (
  modelo: string,
  campos: Campos,
  datos: Record<string, unknown> = {},
  { parcial = false, prefijo = '' } = {}
): Record<string, any> => {
  const limpio: Record<string, any> = {};
  const errores: Record<string, { path: string; message: string }> = {};

  for (const [campo, spec] of Object.entries(campos)) {
    const ruta = `${prefijo}${campo}`;
    if (parcial && datos[campo] === undefined) continue;

    let valor = datos[campo];
    if (valor !== undefined) {
      const resultado = convertir(spec.tipo, valor, ruta);
      if (resultado.error) {
        errores[ruta] = { path: ruta, message: resultado.error };
        continue;
      }
      valor = resultado.valor;
    }
    if (spec.requerido && (valor === undefined || valor === null || valor === '')) {
      errores[ruta] = { path: ruta, message: `Path \`${ruta}\` is required.` };
      continue;
    }
    if (valor !== undefined) limpio[campo] = valor;
  }

  if (Object.keys(errores).length > 0) {
    throw new ValidationError(modelo, errores, parcial);
  }
  return limpio;
};

// Error en formato JSON para las respuestas { mensaje, error }
export const describirError = (error: unknown) => {
  if (error instanceof ValidationError) return error.toJSON();
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return { name: 'DuplicateKeyError', code: error.code, message: `Ya existe un registro con el mismo ${(error.meta?.target as string[] | undefined)?.join(', ') ?? 'valor único'}` };
    }
    if (error.code === 'P2003') {
      return { name: 'ReferenceError', code: error.code, message: 'La referencia indicada no existe' };
    }
    return { name: error.name, code: error.code, message: error.message };
  }
  return { name: (error as Error)?.name ?? 'Error', message: (error as Error)?.message ?? String(error) };
};

// Prisma lanza P2025 cuando el registro a actualizar o eliminar no existe
export const esNoEncontrado = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

// Prisma lanza P2003 cuando se viola una llave foránea (p. ej. eliminar un programa con estudiantes)
export const esReferenciaEnUso = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
