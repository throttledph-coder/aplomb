import type { KeywordMatches } from '@/types'

// Lightweight JD keyword extraction + match analysis (renderer-safe, pure).
// Heuristic stand-in until parsed_jd (AI) provides keywords.

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'you', 'your', 'our', 'are', 'will', 'have', 'has',
  'this', 'that', 'from', 'into', 'a', 'an', 'to', 'of', 'in', 'on', 'as', 'is', 'be',
  'we', 'or', 'at', 'by', 'it', 'all', 'who', 'their', 'they', 'work', 'team', 'role',
  'experience', 'years', 'ability', 'strong', 'including', 'across', 'using', 'job',
])

const TOKEN_RE = /[A-Za-z][A-Za-z0-9+#.\-]{1,}/g

export function extractKeywords(jd: string, limit = 20): string[] {
  const counts = new Map<string, { display: string; n: number }>()
  for (const token of jd.match(TOKEN_RE) ?? []) {
    const raw = token.replace(/[.,;:!?]+$/, '') // strip trailing punctuation
    const key = raw.toLowerCase()
    if (STOPWORDS.has(key) || key.length < 3) continue
    // keep tokens that look like tech/proper nouns: capitalized, or contain +/#/., or known shape
    const looksKeyword = /[A-Z]/.test(raw) || /[+#.]/.test(raw) || raw.length >= 5
    if (!looksKeyword) continue
    const entry = counts.get(key)
    if (entry) entry.n += 1
    else counts.set(key, { display: raw, n: 1 })
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((e) => e.display)
}

export function analyzeKeywords(jd: string, answersText: string): KeywordMatches {
  const keywords = extractKeywords(jd)
  const haystack = answersText.toLowerCase()
  const matched: string[] = []
  const missed: string[] = []
  for (const kw of keywords) {
    if (haystack.includes(kw.toLowerCase())) matched.push(kw)
    else missed.push(kw)
  }
  return { matched, missed }
}
