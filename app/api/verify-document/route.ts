import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { base64Data, mimeType, docType } = await req.json();
    
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("Missing API Key");

    // Clean the base64 string (remove the "data:image/jpeg;base64," prefix)
    const cleanBase64 = base64Data.split(',')[1];

    // Tell Gemini exactly what to look for based on which box they clicked
    const prompt = `
    You are an expert Indian Passport Document Verifier. 
    Analyze this uploaded document.
    The user claims this is a valid "${docType}" proof. 
    1. Is it a valid document for this category? (e.g., Aadhaar/Utility for Address, PAN/Birth Certificate for DOB, 10th Marks card for Non-ECR).
    2. Extract the primary name printed on the document.
    
    Respond STRICTLY in JSON format with two keys:
    "isValid": boolean (true or false)
    "extractedName": string (the name found on the document, or "Not Found")
    `;

    // Direct REST API Call using Gemini's Multimodal 'inlineData' feature
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`,
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
              { inlineData: { mimeType: mimeType, data: cleanBase64 } }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json",
          }
        })
      }
    );

    if (!response.ok) throw new Error("Google Vision API Failed");

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    const responseData = JSON.parse(rawText);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Document Verification Error:", error);
    return NextResponse.json({ error: "Failed to verify document" }, { status: 500 });
  }
}