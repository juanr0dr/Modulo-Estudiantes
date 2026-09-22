# Evidencias de entrega — Módulo Estudiantes

Este archivo funciona como guía para reunir las evidencias visuales solicitadas por la auditoría. Las capturas que dependan del API Gateway no pueden generarse desde este proyecto porque el Gateway no fue incluido en el material revisado.

## Evidencias del módulo Estudiantes

- [ ] Swagger UI en `http://localhost:3001/docs`.
- [ ] POST/GET/GET por ID/PUT/DELETE de Estudiante.
- [ ] CRUD de Programa.
- [ ] CRUD de Documento.
- [ ] Paginación (`pageNumber`, `pageSize`).
- [ ] Ordenamiento (`sortBy`, `sortDirection`).
- [ ] Filtro `programa`.
- [ ] Filtro `ciudad`.
- [ ] Filtro `search`.

## Evidencias que requieren el API Gateway

- [ ] Enrutamiento `GET/POST/... /api/estudiantes/**`.
- [ ] `GET /api/estudiantes/{id}/detalle`.
- [ ] Manejo controlado de la caída de un módulo.
- [ ] Ejecución integrada de los cuatro procesos.

## Preparación sugerida

1. Crear `.env` a partir de `.env.example`.
2. Ejecutar `npm install`.
3. Ejecutar `npm run build`.
4. Ejecutar `npm run dev`.
5. Abrir `/docs` y realizar las operaciones de evidencia.
6. Para las evidencias de Gateway, levantar también Gateway, Materias e Inscripciones y documentar las llamadas extremo a extremo.
