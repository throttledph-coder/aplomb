import { FileText, Check, Star, Trash2, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Resume } from '@/types'

interface ResumeCardProps {
  resume: Resume
  mode: 'select' | 'manage'
  selected?: boolean
  onSelect?: (id: number) => void
  onSetDefault?: (id: number) => void
  onDelete?: (id: number) => void
  onEdit?: (id: number) => void
}

export function ResumeCard({
  resume,
  mode,
  selected,
  onSelect,
  onSetDefault,
  onDelete,
  onEdit,
}: ResumeCardProps) {
  const { skills, experience, education, projects } = resume.parsed_data

  return (
    <Card
      onClick={mode === 'select' ? () => onSelect?.(resume.id) : undefined}
      className={cn(
        mode === 'select' && 'cursor-pointer transition-colors hover:border-primary/60',
        selected && 'border-primary ring-1 ring-primary',
      )}
    >
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{resume.name}</span>
          {resume.is_default && (
            <Badge variant="outline" className="ml-auto gap-1">
              <Star className="h-3 w-3" /> Default
            </Badge>
          )}
          {mode === 'select' && selected && (
            <Check className="ml-auto h-4 w-4 text-primary" />
          )}
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 8).map((s) => (
              <Badge key={s} variant="secondary" className="font-normal">
                {s}
              </Badge>
            ))}
            {skills.length > 8 && (
              <Badge variant="secondary" className="font-normal">
                +{skills.length - 8}
              </Badge>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {experience.length} experience · {education.length} education · {projects.length} projects
        </p>

        {mode === 'manage' && (
          <div className="flex gap-2 pt-1">
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(resume.id)}>
                <Pencil className="mr-1 h-3 w-3" /> Edit
              </Button>
            )}
            {!resume.is_default && (
              <Button size="sm" variant="outline" onClick={() => onSetDefault?.(resume.id)}>
                <Star className="mr-1 h-3 w-3" /> Set Default
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onDelete?.(resume.id)}>
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
