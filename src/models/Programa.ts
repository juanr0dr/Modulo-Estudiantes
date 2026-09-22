import mongoose, { Schema, Document } from 'mongoose';

export interface IPrograma extends Document {
  nombre: string;
  codigo: string;
  facultad: string;
}

const ProgramaSchema = new Schema<IPrograma>({
  nombre: { type: String, required: true },
  codigo: { type: String, required: true, unique: true },
  facultad: { type: String, required: true }
}, {
  timestamps: true,
  versionKey: false
});

export const Programa = mongoose.model<IPrograma>('Programa', ProgramaSchema);