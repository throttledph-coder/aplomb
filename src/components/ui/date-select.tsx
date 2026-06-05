import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Themed birthday picker: Month / Day / Year dropdowns → ISO 'YYYY-MM-DD' (or ''
// until all three are chosen). No unstyled OS date popup.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const THIS_YEAR = new Date().getFullYear()
const MAX_YEAR = THIS_YEAR - 13 // must be at least 13
const YEARS = Array.from({ length: MAX_YEAR - 1925 + 1 }, (_, i) => MAX_YEAR - i)

function daysInMonth(month: number, year: number): number {
  if (!month) return 31
  return new Date(year || 2000, month, 0).getDate()
}

function parse(iso: string): { y: string; m: string; d: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? { y: m[1], m: String(Number(m[2])), d: String(Number(m[3])) } : { y: '', m: '', d: '' }
}

export function DateSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (iso: string) => void
}) {
  const cur = parse(value)
  const monthNum = Number(cur.m) || 0
  const yearNum = Number(cur.y) || 0
  const dayCount = daysInMonth(monthNum, yearNum)
  const days = Array.from({ length: dayCount }, (_, i) => i + 1)

  function emit(next: { y?: string; m?: string; d?: string }) {
    const y = next.y ?? cur.y
    const m = next.m ?? cur.m
    let d = next.d ?? cur.d
    // Clamp day if the new month/year is shorter.
    if (y && m && d && Number(d) > daysInMonth(Number(m), Number(y))) {
      d = String(daysInMonth(Number(m), Number(y)))
    }
    if (y && m && d) {
      onChange(`${y}-${String(Number(m)).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`)
    } else {
      onChange('')
    }
  }

  return (
    <div className="grid grid-cols-[1.4fr_0.8fr_1fr] gap-2">
      <Select value={cur.m || undefined} onValueChange={(v) => emit({ m: v })}>
        <SelectTrigger aria-label="Month">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={cur.d || undefined} onValueChange={(v) => emit({ d: v })}>
        <SelectTrigger aria-label="Day">
          <SelectValue placeholder="Day" />
        </SelectTrigger>
        <SelectContent>
          {days.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={cur.y || undefined} onValueChange={(v) => emit({ y: v })}>
        <SelectTrigger aria-label="Year">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
