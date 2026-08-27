import mongoose, { Schema, Document } from "mongoose";

export interface IApplication extends Document {
  clerkUserId: string; // Links this draft to the logged-in user
  fullName?: string;
  aliasName?: string;
  gender?: string;
  dob?: string; // Mapped from your 17-step UI
  placeOfBirth?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  email?: string;
  mobile?: string;
  currentAddress?: string;
  previousAddress?: string;
  permanentAddress?: string;
  education?: string;
  employmentType?: string;
  distinguishingMark?: string;
  criminalRecord?: string;
  
  pskCentreId?: string;
  appointmentSlotId?: string;
  appointmentFee?: number;
  
  status: "draft" | "booked";
  createdAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    clerkUserId: { type: String, required: true, unique: true }, // The only truly required field for a draft
    fullName: { type: String, required: false },
    aliasName: { type: String, required: false },
    gender: { type: String, required: false },
    dob: { type: String, required: false },
    placeOfBirth: { type: String, required: false },
    fatherName: { type: String, required: false },
    motherName: { type: String, required: false },
    spouseName: { type: String, required: false },
    email: { type: String, required: false },
    mobile: { type: String, required: false },
    currentAddress: { type: String, required: false },
    previousAddress: { type: String, required: false },
    permanentAddress: { type: String, required: false },
    education: { type: String, required: false },
    employmentType: { type: String, required: false },
    distinguishingMark: { type: String, required: false },
    criminalRecord: { type: String, required: false },
    
    pskCentreId: { type: String, required: false },
    appointmentSlotId: { type: String, required: false },
    appointmentFee: { type: Number, default: 1500 },
    
    status: { type: String, enum: ["draft", "booked"], default: "draft" },
  },
  { timestamps: true }
);

export default mongoose.models.Application || mongoose.model<IApplication>("Application", ApplicationSchema);