import { PDFParse } from 'pdf-parse'

// PDF -> plain text. Main-process only (pdf-parse pulls in pdfjs).
// pdf-parse v2 API: new PDFParse({ data }).getText() -> { text }.
export async function extractPdfText(data: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data })
  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}
