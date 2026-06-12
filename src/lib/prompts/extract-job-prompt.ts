// Prompt for extracting structured fields from a pasted job posting
// (paste-to-add autofill in the Applications tracker).

export const EXTRACT_JOB_SYSTEM_PROMPT =
  'You extract structured data from job postings. Output only strict JSON — no prose, no markdown fences.'

export function buildExtractJobPrompt(postingText: string): string {
  return `Extract the following fields from this job posting. Output ONLY a JSON object with exactly these keys:

{
  "company": string,            // employer name; "" if not stated
  "job_title": string,          // the role title; "" if not stated
  "location": string | null,    // e.g. "Remote", "Manila, PH", "Hybrid — Austin TX"
  "salary_range": string | null,// e.g. "$120k–150k", "PHP 40,000/mo"; null if not stated
  "job_description": string     // the posting's responsibilities + requirements, cleaned of
                                // boilerplate (EEO statements, apply instructions, benefits fluff)
}

Rules:
- Never invent values; use null (or "" for company/job_title) when a field is absent.
- Keep job_description faithful to the posting's wording, trimmed to what matters for interview prep.

Job posting:
"""
${postingText}
"""`
}
