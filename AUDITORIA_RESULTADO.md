# Resultado de correcciones — Auditoría Técnica Laboratorio 3

## Alcance

Se corrigió el proyecto disponible del **Módulo Estudiantes**. La auditoría original indica expresamente que la integración completa con el API Gateway, el endpoint `/api/estudiantes/{id}/detalle`, el manejo de fallos del Gateway y la independencia completa frente a Materias e Inscripciones no pueden verificarse sin los demás proyectos.

## Correcciones realizadas

| ID | Hallazgo | Corrección | Verificación |
|---|---|---|---|
| AUD-001 | Swagger documentaba `programa_id` mientras el código usa `programa`. | Se unificó Swagger con `programa`. | Revisión del archivo `src/routes/estudiante.routes.ts` y build TypeScript exitoso. |
| AUD-002 | README mostraba `PATCH` aunque la ruta implementada es `PUT`. | README actualizado para documentar `PUT`. | Revisión del README. |
| AUD-003 | `.env` real estaba incluido en la entrega. | Se eliminó `.env` del proyecto final y se agregó `.env.example`. | Verificación del contenido final del proyecto. |
| AUD-004 | Faltaba una guía para reunir evidencias. | Se agregó `docs/EVIDENCIAS_ENTREGA.md`. | Archivo presente en la entrega. |

## Verificaciones ejecutadas

- `npm run build` → **EXITOSO**.
- La documentación Swagger y el README fueron revisados después de las modificaciones.
- No se realizaron pruebas contra MongoDB ni contra el API Gateway porque el material entregado no incluye un Gateway y no se debe asumir su comportamiento.

## Estado frente a la auditoría

### Cumple con evidencia disponible

- Modelo de datos del módulo Estudiantes.
- CRUD de Estudiante.
- CRUD de Programa.
- CRUD de Documento.
- Paginación.
- Ordenamiento.
- Tres filtros: `programa`, `ciudad` y `search`.
- Swagger propio, con la inconsistencia `programa/programa_id` corregida.
- Puerto propio configurado en `3001`.
- Ausencia de referencias cruzadas a Materias/Inscripciones en el código revisado.
- Documentación de ejecución actualizada.

### Pendiente de verificación externa

- Base de datos exclusiva del módulo frente a los otros módulos.
- Independencia completa de repositorios, bases de datos y ciclo de vida.
- Comunicación Gateway → Estudiantes.
- Prefijo `/api/estudiantes/**` aplicado por el Gateway.
- `GET /api/estudiantes/{id}/detalle`.
- Manejo de fallos del Gateway.
- Evidencias visuales de la integración completa.

Estas condiciones requieren el proyecto del API Gateway y, para algunas comprobaciones, los proyectos de Materias e Inscripciones.


## Ajuste posterior a la primera entrega
Se estandarizó la base pública del microservicio en `/api/estudiantes`, incluyendo sus subrecursos y la documentación Swagger, de acuerdo con el contrato de rutas solicitado para la entrega. El Gateway deberá apuntar posteriormente a este prefijo, sin volver a agregar `/api`.
También se agregó `GET /` como endpoint informativo de salud y navegación.
