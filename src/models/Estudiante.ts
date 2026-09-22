import mongoose, { Schema, Document } from 'mongoose';

// Subesquema para Contacto (1:1)
const ContactoSchema = new Schema({
  telefono: { type: String, required: true },
  direccion: { type: String, required: true },
  ciudad: { type: String, required: true }
}, { _id: false });

export interface IEstudiante extends Document {
  nombre: string;
  apellido: string;
  correo: string;
  fecha_nacimiento: Date;
  programa: mongoose.Types.ObjectId; // <-- NUEVO: Relación con la interfaz del Programa
  contacto: {
    telefono: string;
    direccion: string;
    ciudad: string;
  };
}

const EstudianteSchema = new Schema<IEstudiante>({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  fecha_nacimiento: { type: Date, required: true },
  programa: { type: Schema.Types.ObjectId, ref: 'Programa', required: true }, // <-- NUEVO: Referencia a la colección Programa
  contacto: { type: ContactoSchema, required: true }
}, {
  timestamps: true,
  versionKey: false
});

export const Estudiante = mongoose.model<IEstudiante>('Estudiante', EstudianteSchema);