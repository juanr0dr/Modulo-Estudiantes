const fs = require('fs');
const swaggerJsDoc = require('swagger-jsdoc');

const swaggerDocs = swaggerJsDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'API Sistema Académico', version: '1.0.0' }
  },
  apis: ['./src/routes/*.ts']
});

const estudiantes = swaggerDocs.paths?.['/api/estudiantes'];
if (!estudiantes) throw new Error('No existe /api/estudiantes en Swagger.');

const params = estudiantes.get?.parameters ?? [];
const names = params.map((param) => param.name);
const expected = ['pageNumber', 'pageSize', 'sortBy', 'sortDirection', 'programa', 'ciudad', 'search', 'estado'];
for (const name of expected) {
  if (!names.includes(name)) throw new Error(`Falta el parámetro Swagger: ${name}`);
}
if (names.includes('programa_id')) {
  throw new Error('Swagger todavía contiene el parámetro obsoleto programa_id.');
}

// "No borrar, usar estados": el contrato documenta estado (ACTIVO | INACTIVO)
const ESTADOS = ['ACTIVO', 'INACTIVO'];
const mismosEstados = (valores) => JSON.stringify(valores) === JSON.stringify(ESTADOS);

const filtroEstado = params.find((param) => param.name === 'estado');
if (!mismosEstados(filtroEstado.schema?.enum)) {
  throw new Error('El filtro ?estado debe aceptar solo ACTIVO e INACTIVO.');
}
const esquemaEstudiante = swaggerDocs.components?.schemas?.Estudiante;
if (!mismosEstados(esquemaEstudiante?.properties?.estado?.enum)) {
  throw new Error('El esquema Estudiante de Swagger debe incluir estado (ACTIVO | INACTIVO).');
}

const porId = swaggerDocs.paths?.['/api/estudiantes/{id}'];
const ref404 = porId?.get?.responses?.['404']?.content?.['application/json']?.schema?.$ref;
const errorNegocio = swaggerDocs.components?.schemas?.ErrorNegocio;
if (ref404 !== '#/components/schemas/ErrorNegocio' || !errorNegocio?.properties?.errorType) {
  throw new Error('El 404 de GET /api/estudiantes/{id} debe documentar { mensaje, errorType }.');
}
if (!/INACTIVO/.test(porId?.delete?.description ?? '')) {
  throw new Error('Swagger de DELETE /api/estudiantes/{id} debe indicar que marca INACTIVO.');
}

// Modelo y migración: columna estado con CHECK
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
if (!/estado\s+String\s+@default\("ACTIVO"\)\s+@db\.VarChar\(10\)/.test(schema)) {
  throw new Error('schema.prisma: falta estado String @default("ACTIVO") @db.VarChar(10) en Estudiante.');
}
const migracion = fs.readdirSync('prisma/migrations')
  .filter((dir) => dir.endsWith('_estado_estudiantes'))
  .map((dir) => fs.readFileSync(`prisma/migrations/${dir}/migration.sql`, 'utf8'))[0];
if (!migracion || !/ADD COLUMN "estado" VARCHAR\(10\) NOT NULL DEFAULT 'ACTIVO'/.test(migracion)
  || !/CHECK \("estado" IN \('ACTIVO', 'INACTIVO'\)\)/.test(migracion)) {
  throw new Error('Falta la migración *_estado_estudiantes con la columna estado y su CHECK.');
}

// DELETE ya no borra la fila ni la fotografía de S3
const controlador = fs.readFileSync('src/controllers/estudiante.controller.ts', 'utf8');
if (/prisma\.estudiante\.delete\(/.test(controlador) || /eliminarArchivo/.test(controlador)) {
  throw new Error('eliminarEstudiante no debe borrar el estudiante ni su fotografía: debe marcar INACTIVO.');
}
if (!/errorType: ERRORES_NEGOCIO\.estudianteNoExiste/.test(controlador)) {
  throw new Error('El 404 de GET /:id debe responder errorType EstudianteNoExiste.');
}

// El .env local puede existir para desarrollar, pero nunca debe entregarse ni entrar
// en la imagen Docker: debe estar excluido en .gitignore y .dockerignore.
const ignora = (archivo) =>
  fs.existsSync(archivo) && fs.readFileSync(archivo, 'utf8').split(/\r?\n/).map((l) => l.trim()).includes('.env');
if (!ignora('.gitignore')) {
  throw new Error('.gitignore debe excluir el archivo .env real.');
}
if (!ignora('.dockerignore')) {
  throw new Error('.dockerignore debe excluir el archivo .env real.');
}
if (!fs.existsSync('.env.example')) {
  throw new Error('Falta .env.example.');
}

const readme = fs.readFileSync('README.md', 'utf8');
if (!readme.includes('| `PUT`  | `/api/estudiantes/:id`')) {
  throw new Error('README no documenta PUT /api/estudiantes/:id.');
}
if (readme.includes('| `PATCH`| `/api/estudiantes/:id`')) {
  throw new Error('README todavía documenta PATCH /api/estudiantes/:id.');
}

console.log('Smoke tests: OK');
console.log(`Swagger GET /api/estudiantes: ${names.join(', ')}`);
console.log('Entrega: .env excluido en .gitignore y .dockerignore; .env.example presente.');
console.log('README: PUT /api/estudiantes/:id documentado correctamente.');
console.log('Estados: columna estado + CHECK en la migración, DELETE lógico (INACTIVO), filtro ?estado y errorType documentados.');
