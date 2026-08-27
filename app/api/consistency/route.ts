import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { doc1Base64, doc1Type, doc2Base64, doc2Type } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    // Clean base64 strings if they have data URL prefixes
    const cleanDoc1 = doc1Base64.includes(',') ? doc1Base64.split(',')[1] : doc1Base64;
    const cleanDoc2 = doc2Base64.includes(',') ? doc2Base64.split(',')[1] : doc2Base64;

    const prompt = `
    You are an expert Indian Passport Verification Officer.
    Look at these two uploaded documents. 
    1. Extract the Full Name, Date of Birth, and Address from both documents.
    2. Compare them strictly line-by-line.
    3. Identify any spelling mistakes, missing middle names, or mismatches. 
    4. Return your findings in the exact JSON schema provided.
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: doc1Type || "image/jpeg", data: cleanDoc1 } },
              { inlineData: { mimeType: doc2Type || "image/jpeg", data: cleanDoc2 } }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                isConsistent: { type: "BOOLEAN" },
                discrepanciesFound: { type: "ARRAY", items: { type: "STRING" } },
                recommendation: { type: "STRING" }
              }
            }
          }
        })
      }
    );

    if (!response.ok) throw new Error("Gemini API failed");

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const responseData = JSON.parse(rawText);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Consistency Check Error:", error);
    return NextResponse.json({ error: "Failed to compare documents" }, { status: 500 });
  }
}