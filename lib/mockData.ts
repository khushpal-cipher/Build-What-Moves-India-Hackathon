export type DocumentStatus = "ready" | "needs_attention" | "missing" | "unverified";

export type DocumentId = "address_proof" | "date_of_birth" | "education_id";

export type ApplicantDraft = {
  fullName: string;
  dateOfBirth: string;
  email: string;
  mobile: string;
  parentName: string;
  currentAddress: string;
  permanentAddress: string;
  service: "First passport";
  applicationType: "Normal";
};

export type DocumentRecord = {
  id: DocumentId;
  title: string;
  acceptedExamples: string;
  mockFileName: string;
  status: DocumentStatus;
  note: string;
  uploaded: boolean;
};

export type GuideResponse = {
  reply: string;
  extractedFields: Partial<ApplicantDraft>;
  documentChecks: Array<Pick<DocumentRecord, "id" | "status" | "note">>;
  nextQuestion: string;
};

export const passportRules = {
  prototypeNotice:
    "PassportPath is a hackathon prototype. It uses demo data only and never submits an application to Passport Seva.",
  service: "First passport, normal scheme, adult applicant",
  requiredDocuments: [
    {
      id: "address_proof",
      title: "Current address proof",
      acceptedExamples: "Aadhaar with current address, bank passbook, utility bill, or registered rent agreement"
    },
    {
      id: "date_of_birth",
      title: "Date of birth proof",
      acceptedExamples: "Birth certificate, Class 10 certificate, or PAN card"
    },
    {
      id: "education_id",
      title: "Supporting identity document",
      acceptedExamples: "College ID, driving licence, voter ID, or PAN card"
    }
  ],
  appointment: {
    normalFee: 1500,
    currency: "INR",
    originalsMessage: "Bring originals and one self-attested photocopy of every document shown as ready."
  }
} as const;

export const emptyApplicant: ApplicantDraft = {
  fullName: "",
  dateOfBirth: "",
  email: "",
  mobile: "",
  parentName: "",
  currentAddress: "",
  permanentAddress: "",
  service: "First passport",
  applicationType: "Normal"
};

export const demoApplicant: ApplicantDraft = {
  fullName: "Aarav Kulkarni",
  dateOfBirth: "17 August 2003",
  email: "aarav.demo@example.com",
  mobile: "90000 12345",
  parentName: "Meera Kulkarni",
  currentAddress: "Flat 12, Kothrud, Pune, Maharashtra 411038",
  permanentAddress: "Flat 12, Kothrud, Pune, Maharashtra 411038",
  service: "First passport",
  applicationType: "Normal"
};

export const emptyDocuments: DocumentRecord[] = passportRules.requiredDocuments.map((rule) => ({
  id: rule.id,
  title: rule.title,
  acceptedExamples: rule.acceptedExamples,
  mockFileName: "",
  status: "unverified",
  note: "Add a mock file or use Quick Demo Mode to check this document.",
  uploaded: false
}));

export const demoDocuments: DocumentRecord[] = [
  {
    id: "address_proof",
    title: "Current address proof",
    acceptedExamples: "Aadhaar with current address, bank passbook, utility bill, or registered rent agreement",
    mockFileName: "aarav_demo_aadhaar_masked.jpg",
    status: "ready",
    note: "Address matches the application draft. Keep the original for your PSK visit.",
    uploaded: true
  },
  {
    id: "date_of_birth",
    title: "Date of birth proof",
    acceptedExamples: "Birth certificate, Class 10 certificate, or PAN card",
    mockFileName: "aarav_demo_class10_certificate.jpg",
    status: "ready",
    note: "Date of birth proof is present in this demo checklist.",
    uploaded: true
  },
  {
    id: "education_id",
    title: "Supporting identity document",
    acceptedExamples: "College ID, driving licence, voter ID, or PAN card",
    mockFileName: "aarav_demo_college_id.jpg",
    status: "needs_attention",
    note: "Useful supporting ID. Also bring one government-issued photo ID if available.",
    uploaded: true
  }
];

export const formQuestions: Array<{ field: keyof Pick<ApplicantDraft, "fullName" | "dateOfBirth" | "email" | "mobile" | "parentName" | "currentAddress" | "permanentAddress">; question: string; hint: string }> = [
  { field: "fullName", question: "What is your full name, exactly as it appears on your date-of-birth proof?", hint: "Example: Aarav Kulkarni" },
  { field: "dateOfBirth", question: "What is your date of birth?", hint: "Example: 17 August 2003" },
  { field: "email", question: "Which email should receive appointment updates?", hint: "Example: name@example.com" },
  { field: "mobile", question: "What mobile number should receive updates?", hint: "Use a 10-digit demo number for this prototype." },
  { field: "parentName", question: "What is one parent or legal guardian’s full name?", hint: "Example: Meera Kulkarni" },
  { field: "currentAddress", question: "What is your current residential address in Pune?", hint: "Include locality, city, state, and PIN code." },
  { field: "permanentAddress", question: "Is your permanent address the same? If not, enter it now.", hint: "You can type “same as current address”." }
];

export const appointmentCentres = [
  {
    id: "pune-psk",
    name: "Passport Seva Kendra, Pune",
    locality: "Mundhwa",
    distance: "7.2 km from Kothrud",
    slots: [
      { id: "pune-1", date: "Tue, 2 Sep", time: "09:30 AM", available: true },
      { id: "pune-2", date: "Tue, 2 Sep", time: "11:15 AM", available: true },
      { id: "pune-3", date: "Wed, 3 Sep", time: "02:15 PM", available: true }
    ]
  },
  {
    id: "pune-popsk",
    name: "Post Office PSK, Pune",
    locality: "Shivajinagar",
    distance: "5.8 km from Kothrud",
    slots: [
      { id: "popsk-1", date: "Thu, 4 Sep", time: "10:00 AM", available: true },
      { id: "popsk-2", date: "Thu, 4 Sep", time: "12:30 PM", available: true }
    ]
  }
] as const;

export function makeLocalGuideResponse(
  mode: "documents" | "form",
  documents: DocumentRecord[],
  field?: keyof ApplicantDraft,
  answer?: string,
  nextQuestion = ""
): GuideResponse {
  const documentChecks = documents.map(({ id, status, note }) => ({
    id,
    status: status === "unverified" ? "missing" : status,
    note:
      status === "unverified"
        ? "No mock document has been added yet. Use Quick Demo Mode or select a demo file."
        : note
  }));

  if (mode === "documents") {
    const readyCount = documentChecks.filter((document) => document.status === "ready").length;
    return {
      reply:
        readyCount >= 2
          ? "Your demo checklist is almost ready. Review the one item marked for attention before booking."
          : "I need at least an address proof and date-of-birth proof before I can mark this demo application ready.",
      extractedFields: {},
      documentChecks,
      nextQuestion: "Tell me your full name exactly as it appears on your date-of-birth proof."
    };
  }

  return {
    reply: "Got it — I added that to your draft. You can edit every field before booking.",
    extractedFields: field && answer ? { [field]: answer } : {},
    documentChecks: [],
    nextQuestion
  };
}
