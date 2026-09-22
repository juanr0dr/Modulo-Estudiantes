import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumento extends Document {
  tipo: string; // Ej: 'CC', 'TI', 'Pasaporte'
  numero: string;
  estudiante: mongoose.Types.ObjectId; // Aquí creamos la relación con el Estudiante
}

const DocumentoSchema = new Schema<IDocumento>({
  tipo: { type: String, required: true },
  numero: { type: String, required: true, unique: true },
  // ref: 'Estudiante' le dice a Mongoose con qué colección cruzar los datos
  estudiante: { type: Schema.Types.ObjectId, ref: 'Estudiante', required: true } 
}, {
  timestamps: true,
  versionKey: false
});

export const Documento = mongoose.model<IDocumento>('Documento', DocumentoSchema);