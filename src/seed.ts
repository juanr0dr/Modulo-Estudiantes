import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const programasFijos = [
  {
    id: '60d5ec49f1b2c8b1f8e4e1a1', // ID fijo que le darás a tus compañeros
    nombre: 'Ingeniería de Sistemas y Computación',
    codigo: 'ISC-001',
    facultad: 'Ingeniería'
  },
  {
    id: '60d5ec49f1b2c8b1f8e4e1a2', // ID fijo
    nombre: 'Administración de Empresas',
    codigo: 'ADM-002',
    facultad: 'Ciencias Económicas'
  }
];

const poblarBaseDeDatos = async () => {
  try {
    console.log('Conectado a PostgreSQL para poblar datos...');

    // upsert: se puede ejecutar varias veces sin duplicar y sin borrar
    // programas que ya tengan estudiantes asociados
    for (const { id, ...datos } of programasFijos) {
      await prisma.programa.upsert({ where: { id }, update: datos, create: { id, ...datos } });
    }

    console.log('✅ Programas iniciales insertados con éxito.');
  } catch (error) {
    console.error('Error poblando la base de datos', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

poblarBaseDeDatos();
