-- "No borrar, usar estados": DELETE /api/estudiantes/:id pasa a marcar el estudiante
-- como INACTIVO en lugar de eliminarlo. Las filas existentes quedan ACTIVO por el DEFAULT.

-- AlterTable
ALTER TABLE "estudiantes" ADD COLUMN "estado" VARCHAR(10) NOT NULL DEFAULT 'ACTIVO'
    CONSTRAINT "estudiantes_estado_check" CHECK ("estado" IN ('ACTIVO', 'INACTIVO'));

-- CreateIndex
CREATE INDEX "estudiantes_estado_idx" ON "estudiantes"("estado");
