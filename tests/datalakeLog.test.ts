// Pruebas del log de datalake (node:test + tsx, sin base de datos ni AWS):
// Prisma y S3 se reemplazan por dobles en memoria y se usan las rutas reales del módulo.
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { AddressInfo } from 'net';
import type { Server } from 'http';
import express from 'express';
import cors from 'cors';
import { Prisma } from '@prisma/client';

// ---- Dobles de Prisma y S3 (antes de cargar las rutas) ----
const ID = '6501f8a2c9d4e5f6a7b8c9d0';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const fila = () => ({
  id: ID, nombre: 'Ana', apellido: 'Ruiz', correo: 'ana@correo.co', fechaNacimiento: new Date('2000-01-01'),
  programaId: '6501f8a2c9d4e5f6a7b8c9d1', telefono: '300', direccion: 'Calle 1', ciudad: 'Cali', estado: 'ACTIVO',
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), programa: null, fotografia: null,
});
const noExiste = () => new Prisma.PrismaClientKnownRequestError('No existe', { code: 'P2025', clientVersion: 'test' });
const prisma = {
  estudiante: {
    findUnique: async ({ where }: any) => (where.id === ID ? fila() : null),
    findMany: async () => [fila()],
    count: async () => 1,
    create: async ({ data }: any) => ({ ...fila(), ...data }),
    update: async ({ where, data }: any) => { if (where.id !== ID) throw noExiste(); return { ...fila(), ...data }; },
  },
  fotografiaEstudiante: { upsert: async () => ({}) },
  $connect: async () => undefined,
};
const s3 = {
  subirArchivo: async () => undefined,
  eliminarArchivo: async () => undefined,
  urlTemporal: async (clave: string) => `https://s3.test/${clave}`,
};
const simular = (modulo: string, exports: unknown) => {
  const ruta = require.resolve(modulo);
  require.cache[ruta] = { id: ruta, filename: ruta, loaded: true, exports } as any;
};
simular('../src/config/prisma', { prisma });
simular('../src/config/s3', s3);

const estudianteRoutes = require('../src/routes/estudiante.routes').default;
const { crearDatalakeLog, crearEscritor, PREFIJO_DATALAKE } = require('../src/middlewares/datalakeLog') as
  typeof import('../src/middlewares/datalakeLog');
type Linea = import('../src/middlewares/datalakeLog').LineaDatalake;

const CAMPOS = ['ts', 'service', 'instance', 'trace_id', 'method', 'path', 'query', 'status', 'latency_ms',
  'user_id', 'role', 'idempotency_key', 'error_type', 'request_body'];

// Misma composición que src/index.ts (el log primero) más rutas de auth simuladas
const crearApp = (escribir: (linea: Linea) => void) => {
  const app = express();
  app.use(crearDatalakeLog({ service: 'estudiantes', escribir }));
  app.use(cors());
  app.use(express.json());
  app.get('/health', (_req, res) => { res.json({ status: 'UP' }); });
  app.get('/docs/', (_req, res) => { res.send('swagger'); });
  app.post('/api/auth/login', (_req, res) => { res.json({ token: 't' }); });
  app.post('/api/auth/registro', (_req, res) => { res.status(201).json({ ok: true }); });
  app.use('/api/estudiantes', estudianteRoutes);
  return app;
};

const escuchar = (app: express.Express) => new Promise<{ base: string; server: Server }>((ok) => {
  const server = app.listen(0, () => ok({ base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, server }));
});

// La línea se escribe en 'finish'; puede llegar un instante después que la respuesta
const esperar = async (condicion: () => boolean) => {
  for (let i = 0; i < 100 && !condicion(); i++) await new Promise((ok) => setTimeout(ok, 10));
};

describe('datalakeLog', () => {
  const lineas: Linea[] = [];
  let base = '';
  let server: Server;

  before(async () => ({ base, server } = await escuchar(crearApp((linea) => lineas.push(linea)))));
  after(() => server.close());
  beforeEach(() => { lineas.length = 0; });

  const pedir = async (ruta: string, init: RequestInit = {}, esperadas = 1) => {
    const antes = lineas.length;
    const r = await fetch(base + ruta, init);
    const cuerpo = await r.text();
    await esperar(() => lineas.length >= antes + esperadas);
    return { r, cuerpo, linea: lineas[lineas.length - 1] };
  };

  test('una línea por petición con todos los campos del contrato', async () => {
    const { r } = await pedir('/api/estudiantes?estado=ACTIVO&pageSize=5', {
      headers: { 'x-user-id': 'u-42', 'x-user-role': 'ADMIN', 'idempotency-key': 'k-1' },
    });
    await pedir(`/api/estudiantes/${ID}`);
    await pedir('/api/estudiantes/programas');
    await new Promise((ok) => setTimeout(ok, 50));

    assert.equal(r.status, 200);
    assert.equal(lineas.length, 3, 'exactamente una línea por petición');
    for (const linea of lineas) assert.deepEqual(Object.keys(linea), CAMPOS);
    const primera = lineas[0];
    assert.match(primera.ts, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    assert.equal(primera.service, 'estudiantes');
    assert.equal(primera.instance, process.env.HOSTNAME || 'local');
    assert.equal(primera.method, 'GET');
    assert.equal(primera.path, '/api/estudiantes');
    assert.equal(primera.query, 'estado=ACTIVO&pageSize=5');
    assert.equal(primera.status, 200);
    assert.ok(Number.isInteger(primera.latency_ms) && primera.latency_ms >= 0);
    assert.equal(primera.user_id, 'u-42');
    assert.equal(primera.role, 'ADMIN');
    assert.equal(primera.idempotency_key, 'k-1');
    assert.equal(primera.error_type, null);
    assert.equal(primera.request_body, null);
    // Sin encabezados opcionales ni query: null
    assert.equal(lineas[1].query, null);
    assert.equal(lineas[1].user_id, null);
    assert.equal(lineas[1].path, `/api/estudiantes/${ID}`);
  });

  test('reutiliza el x-trace-id recibido y lo devuelve', async () => {
    const { r, linea } = await pedir(`/api/estudiantes/${ID}`, { headers: { 'x-trace-id': 'traza-del-gateway-01' } });
    assert.equal(r.headers.get('x-trace-id'), 'traza-del-gateway-01');
    assert.equal(linea.trace_id, 'traza-del-gateway-01');
  });

  test('genera un x-trace-id de 16 hex si no llega y lo devuelve', async () => {
    const { r, linea } = await pedir(`/api/estudiantes/${ID}`);
    assert.match(linea.trace_id, /^[0-9a-f]{16}$/);
    assert.equal(r.headers.get('x-trace-id'), linea.trace_id);
  });

  test('genera un x-trace-id nuevo si el recibido no cumple ^[A-Za-z0-9-]{1,128}$', async () => {
    const invalidos = ['traza con espacios', 'abc_123', 'a.b', '<script>', 'x'.repeat(129), 'ñandú'];
    for (const invalido of invalidos) {
      const { r, linea } = await pedir(`/api/estudiantes/${ID}`, { headers: { 'x-trace-id': invalido } });
      assert.match(linea.trace_id, /^[0-9a-f]{16}$/, `debió regenerarse para ${JSON.stringify(invalido)}`);
      assert.equal(r.headers.get('x-trace-id'), linea.trace_id);
    }
    // Límite: 128 caracteres válidos sí se reutilizan
    const largoMaximo = 'A-'.repeat(64);
    const { r, linea } = await pedir(`/api/estudiantes/${ID}`, { headers: { 'x-trace-id': largoMaximo } });
    assert.equal(linea.trace_id, largoMaximo);
    assert.equal(r.headers.get('x-trace-id'), largoMaximo);
  });

  test('/api/auth/login y /api/auth/registro no guardan el cuerpo', async () => {
    const json = { 'content-type': 'application/json' };
    const login = await pedir('/api/auth/login', { method: 'POST', headers: json, body: '{"correo":"a@b.co","password":"secreta"}' });
    assert.equal(login.r.status, 200);
    assert.equal(login.linea.request_body, '<omitido>');
    const registro = await pedir('/api/auth/registro', { method: 'POST', headers: json, body: '{"password":"secreta"}' });
    assert.equal(registro.linea.request_body, '<omitido>');
    assert.ok(!JSON.stringify(lineas).includes('secreta'));
  });

  test('error_type sale con el código de negocio de res.locals.errorType', async () => {
    const noEncontrado = await pedir('/api/estudiantes/000000000000000000000000');
    assert.equal(noEncontrado.r.status, 404);
    assert.equal(noEncontrado.linea.error_type, 'EstudianteNoExiste');

    const estado = await pedir('/api/estudiantes?estado=BORRADO');
    assert.equal(estado.r.status, 400);
    assert.equal(estado.linea.error_type, 'EstadoInvalido');
  });

  test('cuerpo JSON se registra como objeto; demasiado grande y malformado se marcan', async () => {
    const json = { 'content-type': 'application/json' };
    const put = await pedir(`/api/estudiantes/${ID}`, { method: 'PUT', headers: json, body: '{"estado":"INACTIVO"}' });
    assert.equal(put.r.status, 200);
    assert.deepEqual(put.linea.request_body, { estado: 'INACTIVO' });

    const grande = await pedir(`/api/estudiantes/${ID}`, { method: 'PUT', headers: json, body: JSON.stringify({ nombre: 'x'.repeat(17 * 1024) }) });
    assert.equal(grande.linea.request_body, '<demasiado-grande>');

    // express.json responde 400 por su cuenta; aun así queda una línea
    const malformado = await pedir(`/api/estudiantes/${ID}`, { method: 'PUT', headers: json, body: '{"estado":' });
    assert.equal(malformado.r.status, 400);
    assert.equal(malformado.linea.status, 400);
    assert.equal(malformado.linea.request_body, '<no-json>');
  });

  test('la subida multipart de fotografía queda como "<no-json>" y multer funciona igual', async () => {
    const formulario = () => {
      const datos = new FormData();
      datos.append('fotografia', new Blob([PNG], { type: 'image/png' }), 'foto.png');
      return datos;
    };
    const ok = await pedir(`/api/estudiantes/${ID}/fotografia`, { method: 'POST', body: formulario() });
    assert.equal(ok.r.status, 200);
    assert.equal(JSON.parse(ok.cuerpo)._id, ID);
    assert.equal(ok.linea.request_body, '<no-json>');

    const malo = new FormData();
    malo.append('fotografia', new Blob(['hola'], { type: 'text/plain' }), 'nota.txt');
    const rechazado = await pedir(`/api/estudiantes/${ID}/fotografia`, { method: 'POST', body: malo });
    assert.equal(rechazado.r.status, 400);
    assert.equal(rechazado.linea.request_body, '<no-json>');
    assert.equal(rechazado.linea.error_type, 'FotografiaFormatoInvalido');
  });

  test('no registra /health ni /docs, pero responde con x-trace-id', async () => {
    const health = await fetch(`${base}/health`, { headers: { 'x-trace-id': 'h1' } });
    const docs = await fetch(`${base}/docs/`);
    await new Promise((ok) => setTimeout(ok, 50));
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('x-trace-id'), 'h1');
    assert.match(docs.headers.get('x-trace-id') ?? '', /^[0-9a-f]{16}$/);
    assert.equal(lineas.length, 0);
  });
});

describe('fallos al escribir el log', () => {
  const comparar = async (escribir: (linea: Linea) => void) => {
    const { base, server } = await escuchar(crearApp(escribir));
    try {
      const respuestas = [];
      for (const ruta of [`/api/estudiantes/${ID}`, '/api/estudiantes/000000000000000000000000']) {
        const r = await fetch(base + ruta, { headers: { 'x-trace-id': 'fijo' } });
        respuestas.push({ status: r.status, cuerpo: await r.text(), traza: r.headers.get('x-trace-id') });
      }
      await new Promise((ok) => setTimeout(ok, 50));
      return respuestas;
    } finally {
      server.close();
    }
  };

  test('un escritor que lanza excepción no cambia la respuesta', async () => {
    const normal = await comparar(() => undefined);
    const fallando = await comparar(() => { throw new Error('disco lleno'); });
    assert.deepEqual(fallando, normal);
  });

  test('stdout que falla y LOG_DIR inválido no cambian la respuesta', async () => {
    const normal = await comparar(() => undefined);
    const carpeta = mkdtempSync(path.join(tmpdir(), 'dlk-'));
    const archivoComoCarpeta = path.join(carpeta, 'no-es-carpeta');
    writeFileSync(archivoComoCarpeta, 'x'); // mkdir sobre un archivo falla
    process.env.LOG_DIR = archivoComoCarpeta;
    try {
      const fallando = await comparar(crearEscritor({ write: () => { throw new Error('EPIPE'); } }));
      assert.deepEqual(fallando, normal);
    } finally {
      delete process.env.LOG_DIR;
      rmSync(carpeta, { recursive: true, force: true });
    }
  });
});

describe('escritor por defecto', () => {
  test('imprime "DLK " + JSON compacto y agrega la línea sin prefijo en LOG_DIR/<service>-<instance>-AAAAMMDD-HH.jsonl', async () => {
    const carpeta = path.join(mkdtempSync(path.join(tmpdir(), 'dlk-')), 'logs', 'nueva');
    const salida: string[] = [];
    process.env.LOG_DIR = carpeta;
    const { base, server } = await escuchar(crearApp(crearEscritor({ write: (texto: string) => salida.push(texto) })));
    try {
      await (await fetch(`${base}/api/estudiantes/${ID}`)).text();
      await (await fetch(`${base}/api/estudiantes/${ID}?x=1`)).text();
      await esperar(() => { try { return readFileSync(path.join(carpeta, readdirSync(carpeta)[0]), 'utf8').split('\n').length > 2; } catch { return false; } });
    } finally {
      delete process.env.LOG_DIR;
      server.close();
    }

    assert.equal(salida.length, 2);
    assert.match(salida[0], /^DLK \{"ts":"[^"]+",.*\}\n$/);
    assert.equal(salida[0].split('\n').length, 2, 'una sola línea');
    const linea = JSON.parse(salida[0].slice(PREFIJO_DATALAKE.length));
    assert.deepEqual(Object.keys(linea), CAMPOS);

    const archivos = readdirSync(carpeta);
    const instancia = (process.env.HOSTNAME || 'local').replace(/[^A-Za-z0-9._-]/g, '_');
    const esperado = `estudiantes-${instancia}-${linea.ts.slice(0, 10).replace(/-/g, '')}-${linea.ts.slice(11, 13)}.jsonl`;
    assert.deepEqual(archivos, [esperado]);
    const contenido = readFileSync(path.join(carpeta, esperado), 'utf8').trim().split('\n');
    assert.equal(contenido.length, 2);
    assert.equal(contenido[0], salida[0].slice(PREFIJO_DATALAKE.length).trim());
    rmSync(path.dirname(path.dirname(carpeta)), { recursive: true, force: true });
  });
});
