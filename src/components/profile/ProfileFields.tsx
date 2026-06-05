import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateSelect } from '@/components/ui/date-select'

export interface ProfileDraft {
  full_name: string
  preferred_name: string
  pronouns: string
  birthday: string
}

export const EMPTY_PROFILE: ProfileDraft = {
  full_name: '',
  preferred_name: '',
  pronouns: '',
  birthday: '',
}

const PRONOUNS = ['she/her', 'he/him', 'they/them', 'prefer not to say']

// Controlled profile fields, reused by Onboarding + Account.
export function ProfileFields({
  value,
  onChange,
}: {
  value: ProfileDraft
  onChange: (next: ProfileDraft) => void
}) {
  const set = (patch: Partial<ProfileDraft>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          value={value.full_name}
          onChange={(e) => set({ full_name: e.target.value })}
          placeholder="Jane Dela Cruz"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="preferred_name">Preferred name</Label>
        <Input
          id="preferred_name"
          value={value.preferred_name}
          onChange={(e) => set({ preferred_name: e.target.value })}
          placeholder="What should we call you?"
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          Pronouns <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Select value={value.pronouns || undefined} onValueChange={(v) => set({ pronouns: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {PRONOUNS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>
          Birthday <span className="text-muted-foreground">(optional)</span>
        </Label>
        <DateSelect value={value.birthday} onChange={(iso) => set({ birthday: iso })} />
      </div>
      <p className="text-xs text-muted-foreground">
        Used to personalize your greeting and help the AI tailor answers. Pronouns and birthday are
        optional.
      </p>
    </div>
  )
}
