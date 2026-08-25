import mongoose, { Schema, Document } from "mongoose";

export interface IApplication extends Document {
  fullName: string;
  dateOfBirth: string;
  email: string;
  mobile: string;
  parentName: string;
  currentAddress: string;
  permanentAddress: string;
  
  pskCentreId: string;
  appointmentSlotId: string;
  appointmentFee: number;
  
  status: "draft" | "booked";
  createdAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    fullName: { type: String, required: true },
    dateOfBirth: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    parentName: { type: String, required: true },
    currentAddress: { type: String, required: true },
    permanentAddress: { type: String, required: true },
    
    pskCentreId: { type: String, required: false },
    appointmentSlotId: { type: String, required: false },
    appointmentFee: { type: Number, default: 1500 },
    
    status: { type: String, enum: ["draft", "booked"], default: "draft" },
  },
  { timestamps: true }
);

// Prevent model overwrite error in Next.js hot reloads
export default mongoose.models.Application || mongoose.model<IApplication>("Application", ApplicationSchema);