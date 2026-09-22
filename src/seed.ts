import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Programa } from './models/Programa';

dotenv.config();

const programasFijos = [
  {
    _id: new mongoose.Types.ObjectId('60d5ec49f1b2c8b1f8e4e1a1'), // ID fijo que le darás a tus compañeros
    nombre: 'Ingeniería de Sistemas y Computación',
    codigo: 'ISC-001',
    facultad: 'Ingeniería'
  },
  {
    _id: new mongoose.Types.ObjectId('60d5ec49f1b2c8b1f8e4e1a2'), // ID fijo
    nombre: 'Administración de Empresas',
    codigo: 'ADM-002',
    facultad: 'Ciencias Económicas'
  }
];

const poblarBaseDeDatos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Conectado a MongoDB para poblar datos...');

    // Limpiamos los programas anteriores e insertamos los fijos
    await Programa.deleteMany();
    await Programa.insertMany(programasFijos);

    console.log('✅ Programas iniciales insertados con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('Error poblando la base de datos', error);
    process.exit(1);
  }
};

poblarBaseDeDatos();