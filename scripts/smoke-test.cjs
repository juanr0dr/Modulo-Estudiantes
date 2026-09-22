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
const expected = ['pageNumber', 'pageSize', 'sortBy', 'sortDirection', 'programa', 'ciudad', 'search'];
for (const name of expected) {
  if (!names.includes(name)) throw new Error(`Falta el parámetro Swagger: ${name}`);
}
if (names.includes('programa_id')) {
  throw new Error('Swagger todavía contiene el parámetro obsoleto programa_id.');
}

if (fs.existsSync('.env')) {
  throw new Error('El archivo .env real no debe formar parte de la entrega.');
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
console.log('Entrega: .env ausente y .env.example presente.');
console.log('README: PUT /api/estudiantes/:id documentado correctamente.');
