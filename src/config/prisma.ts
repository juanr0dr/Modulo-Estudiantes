import { PrismaClient } from '@prisma/client';

// Instancia única compartida por todo el servicio
export const prisma = new PrismaClient();
