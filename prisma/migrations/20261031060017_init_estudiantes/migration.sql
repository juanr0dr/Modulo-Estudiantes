-- Migración inicial del módulo Estudiantes (MongoDB -> PostgreSQL).
-- Los ids conservan el formato ObjectId (24 hex) para no alterar el contrato del API.
-- Las FK son internas al módulo: estudiantes -> programas, documentos y fotografía -> estudiantes.

-- CreateTable
CREATE TABLE "programas" (
    "id" VARCHAR(24) NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "codigo" VARCHAR(50) NOT NULL,
    "facultad" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estudiantes" (
    "id" VARCHAR(24) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(150) NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3) NOT NULL,
    "programa_id" VARCHAR(24) NOT NULL,
    "contacto_telefono" VARCHAR(30) NOT NULL,
    "contacto_direccion" VARCHAR(200) NOT NULL,
    "contacto_ciudad" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estudiantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fotografias_estudiante" (
    "estudiante_id" VARCHAR(24) NOT NULL,
    "clave_s3" VARCHAR(512) NOT NULL,
    "nombre_original" VARCHAR(255) NOT NULL,
    "tipo_mime" VARCHAR(50) NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,

    CONSTRAINT "fotografias_estudiante_pkey" PRIMARY KEY ("estudiante_id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" VARCHAR(24) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "numero" VARCHAR(50) NOT NULL,
    "estudiante_id" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "programas_codigo_key" ON "programas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "estudiantes_correo_key" ON "estudiantes"("correo");

-- CreateIndex
CREATE INDEX "estudiantes_programa_id_idx" ON "estudiantes"("programa_id");

-- CreateIndex
CREATE INDEX "estudiantes_contacto_ciudad_idx" ON "estudiantes"("contacto_ciudad");

-- CreateIndex
CREATE UNIQUE INDEX "fotografias_estudiante_clave_s3_key" ON "fotografias_estudiante"("clave_s3");

-- CreateIndex
CREATE UNIQUE INDEX "documentos_numero_key" ON "documentos"("numero");

-- CreateIndex
CREATE INDEX "documentos_estudiante_id_idx" ON "documentos"("estudiante_id");

-- AddForeignKey
ALTER TABLE "estudiantes" ADD CONSTRAINT "estudiantes_programa_id_fkey" FOREIGN KEY ("programa_id") REFERENCES "programas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fotografias_estudiante" ADD CONSTRAINT "fotografias_estudiante_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_estudiante_id_fkey" FOREIGN KEY ("estudiante_id") REFERENCES "estudiantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reglas de la fotografía en S3 (equivalentes a las validaciones de la subida)
ALTER TABLE "fotografias_estudiante" ADD CONSTRAINT "fotografias_estudiante_tipo_mime_check" CHECK ("tipo_mime" IN ('image/jpeg', 'image/png'));
ALTER TABLE "fotografias_estudiante" ADD CONSTRAINT "fotografias_estudiante_tamano_bytes_check" CHECK ("tamano_bytes" > 0 AND "tamano_bytes" <= 2097152);
