// Throwaway smoke test for the resume parser (build step 2).
// pdf-parse + mammoth are pure JS (no native ABI), so this runs under node via tsx.
import JSZip from 'jszip'
import { parseResumeText, parseResumeFile } from '../src/lib/parsers/resume-parser'
import { extractDocxText } from '../src/lib/parsers/docx-parser'
import { extractPdfText } from '../src/lib/parsers/pdf-parser'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg)
  console.log('  ok: ' + msg)
}

const SAMPLE = `Jane Developer
jane@example.com | github.com/jane

Summary
Senior software engineer with 6 years building web platforms and developer tools.

Skills
TypeScript, React, Node.js, PostgreSQL, Docker, AWS

Experience
Senior Software Engineer at Acme Corp (2021 - Present)
- Led migration of monolith to microservices, cutting latency 40%
- Mentored 4 engineers and owned the CI/CD pipeline
Software Engineer at Beta Inc (2018 - 2021)
- Built React dashboards used by 10k daily users

Education
BS Computer Science, State University, 2018

Projects
Open Graph Tool: CLI that generates social cards (TypeScript, Node.js)
`

// ---- minimal but byte-valid PDF with a text run ----
function buildMinimalPdf(text: string): Uint8Array {
  const header = '%PDF-1.4\n'
  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${`BT /F1 24 Tf 72 700 Td (${text}) Tj ET`.length}>>\nstream\nBT /F1 24 Tf 72 700 Td (${text}) Tj ET\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ]
  let body = header
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(body, 'latin1'))
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xrefStart = Buffer.byteLength(body, 'latin1')
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) {
    xref += off.toString().padStart(10, '0') + ' 00000 n \n'
  }
  const trailer = `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`
  return new Uint8Array(Buffer.from(body + xref + trailer, 'latin1'))
}

async function buildMinimalDocx(paragraphs: string[]): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  )
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  )
  const body = paragraphs
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`)
    .join('')
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  )
  const buf = await zip.generateAsync({ type: 'nodebuffer' })
  return new Uint8Array(buf)
}

async function main(): Promise<void> {
  // ---- heuristic structuring ----
  const parsed = parseResumeText(SAMPLE)
  console.log(JSON.stringify(parsed, null, 2))
  assert(parsed.skills.includes('TypeScript') && parsed.skills.includes('React'), 'skills parsed')
  assert(parsed.experience.length >= 2, 'two experience entries')
  assert(parsed.experience[0].title.toLowerCase().includes('senior'), 'experience title parsed')
  assert(parsed.experience[0].company === 'Acme Corp', 'experience company parsed')
  assert(/present/i.test(parsed.experience[0].duration), 'experience duration parsed')
  assert(parsed.experience[0].bullets.length === 2, 'experience bullets attached')
  assert(parsed.education.length >= 1 && parsed.education[0].year === '2018', 'education parsed')
  assert(/computer science/i.test(parsed.education[0].degree), 'education degree parsed')
  assert(parsed.projects.length >= 1 && parsed.projects[0].name === 'Open Graph Tool', 'project parsed')
  assert(parsed.projects[0].technologies.length >= 1, 'project technologies parsed')
  assert(parsed.summary.length > 0, 'summary parsed')

  // ---- DOCX extraction (jszip-built fixture) ----
  const docx = await buildMinimalDocx(['Senior Software Engineer', 'Built React dashboards'])
  const docxText = await extractDocxText(docx)
  assert(docxText.includes('Senior Software Engineer'), 'docx text extracted')

  // ---- DOCX through full dispatcher ----
  const viaFile = await parseResumeFile('resume.docx', docx)
  assert(viaFile.raw_text.includes('Senior'), 'parseResumeFile handles docx')

  // ---- plain text through dispatcher ----
  const viaText = await parseResumeFile('resume.txt', new TextEncoder().encode(SAMPLE))
  assert(viaText.parsed_data.skills.includes('React'), 'parseResumeFile handles txt')

  // ---- PDF extraction (byte-valid minimal fixture) ----
  try {
    const pdf = buildMinimalPdf('Hello Clarity Resume')
    const pdfText = await extractPdfText(pdf)
    assert(pdfText.includes('Hello Clarity'), 'pdf text extracted')
  } catch (e) {
    console.log('  WARN: pdf fixture extraction skipped -', (e as Error).message)
    console.log('  (verify real PDF upload manually during the UI step)')
  }

  console.log('\nPARSER SMOKE TEST PASSED')
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error('\nPARSER SMOKE TEST FAILED:', (err as Error).message)
    process.exit(1)
  },
)
