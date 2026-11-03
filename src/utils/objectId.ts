import crypto from 'crypto';

// Genera ids con el formato de un ObjectId de MongoDB (24 caracteres hex):
// 4 bytes de timestamp + 5 bytes aleatorios por proceso + 3 bytes de contador.
// Así el contrato del API (_id) no cambia y los ids crecen en orden de creación.
const ALEATORIO_PROCESO = crypto.randomBytes(5);
let contador = crypto.randomBytes(3).readUIntBE(0, 3);

export const generarId = (): string => {
  const buffer = Buffer.alloc(12);
  buffer.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
  ALEATORIO_PROCESO.copy(buffer, 4);
  contador = (contador + 1) % 0xffffff;
  buffer.writeUIntBE(contador, 9, 3);
  return buffer.toString('hex');
};

export const esIdValido = (id: unknown): id is string =>
  typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
