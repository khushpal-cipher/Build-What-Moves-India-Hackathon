import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🚨 Notice we are pulling out 'mode' and 'documents' now!
    const { mode, message, application, documents } = body;
    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("[API ERROR]: No API key found.");
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    let systemPrompt = "";

    // ==========================================
    // BRAIN 1: DOCUMENT CHECKER MODE
    // ==========================================
    if (mode === "documents") {
      systemPrompt = `
You are PassportGuide AI. Your job is to review the user's uploaded mock documents for an Indian Passport application.
Respond with ONLY raw, valid JSON. DO NOT wrap it in markdown blocks.

User's Uploaded Documents:
${JSON.stringify(documents, null, 2)}

JSON Structure:
{
  "reply": "A short 1-sentence summary of what is ready and what is missing.",
  "documentChecks": [
    {
      "id": "Must match the exact id of the document (e.g., 'address', 'dob', 'identity')",
      "status": "Evaluate the mockFileName. If it looks correct, output 'ready'. If missing, 'missing'. If it looks wrong, 'needs_attention'.",
      "note": "A short 1-sentence helpful note explaining the status."
    }
  ]
}
`;
    } 
    // ==========================================
    // BRAIN 2: CONVERSATIONAL FORM MODE
    // ==========================================
    else {
      systemPrompt = `
You are PassportGuide AI. Extract passport application details from user messages.
Respond with ONLY raw, valid JSON. DO NOT wrap it in markdown blocks. DO NOT add conversational text.

Current Application Draft:
${JSON.stringify(application || {}, null, 2)}

User Input: "${message}"

JSON Structure (YOU MUST USE THESE EXACT KEYS):
{
  "reply": "A short 1-sentence acknowledgement.",
  "extractedFields": {
    "fullName": "Extracted full name (or omit if not mentioned)",
    "dateOfBirth": "Extracted date (or omit if not mentioned)",
    "email": "Extracted email (or omit if not mentioned)",
    "mobile": "Extracted mobile (or omit if not mentioned)",
    "parentName": "Extracted parent name (or omit if not mentioned)",
    "currentAddress": "Extracted address (or omit if not mentioned)",
    "permanentAddress": "Extracted address (or omit if not mentioned)"
  },
  "nextQuestion": "The next logical question to ask based on what is STILL empty. CRITICAL RULE: You MUST NOT ask for a field that you just populated in extractedFields!"
}
`;
    }

    // Call Gemini with whichever brain we selected
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GEMINI API ERROR]:", response.status, errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Failsafe cleanup
    const cleanText = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanText);

    // Apply the shotgun fix ONLY if we are in form mode
    if (mode !== "documents" && parsed.extractedFields && parsed.extractedFields.dateOfBirth) {
      const d = parsed.extractedFields.dateOfBirth;
      parsed.extractedFields.dob = d;
      parsed.extractedFields.birthDate = d;
      parsed.extractedFields.DateOfBirth = d;
      parsed.extractedFields.date_of_birth = d;
    }

    console.log(`✅ [${mode.toUpperCase()} MODE] AI OUTPUT:`, parsed);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("[ROUTE HANDLER EXCEPTION]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}