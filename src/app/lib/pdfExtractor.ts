// src/app/lib/pdfExtractor.ts
import pdfParse from "pdf-parse";

export type ExtractionResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

// Basic magic-number check: a real PDF file must start with "%PDF-".
// Prevents feeding garbled/corrupted bytes into pdf-parse.
export function looksLikePdf(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 5));
  const header = String.fromCharCode(...bytes);
  return header === "%PDF-";
}

export async function extractResumeText(
  buffer: ArrayBuffer,
  contentType: string
): Promise<ExtractionResult> {
  if (contentType.includes("text") || contentType.includes("json") || contentType.includes("xml")) {
    return { ok: true, text: new TextDecoder().decode(buffer) };
  }

  if (!looksLikePdf(buffer)) {
    return {
      ok: false,
      error: `Uploaded file does not appear to be a valid PDF (content-type: "${contentType || "unknown"}"). Please upload a PDF file.`,
    };
  }

  try {
    // pdf.js emits harmless internal font-glyph warnings (e.g. "TT:
    // undefined function") unrelated to extraction success — suppressed
    // only for the duration of this call.
    const originalWarn = console.warn;
    console.warn = () => {};
    let data;
    try {
      data = await pdfParse(Buffer.from(buffer));
    } finally {
      console.warn = originalWarn;
    }

    const text = (data.text || "").trim();
    if (!text || text.length < 50) {
      return {
        ok: false,
        error: "Resume text too short after extraction. Please upload a text-based (not scanned/image) PDF.",
      };
    }
    return { ok: true, text };
  } catch (pdfError: any) {
    return {
      ok: false,
      error: `Could not extract text from this PDF (${pdfError?.message || "parse error"}). Please re-export it as a standard, non-scanned PDF.`,
    };
  }
      
  
}