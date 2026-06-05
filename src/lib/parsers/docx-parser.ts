import mammoth from 'mammoth'

// DOCX -> plain text. Main-process only (mammoth pulls in jszip).
export async function extractDocxText(data: Uint8Array): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(data) })
  return result.value
}
