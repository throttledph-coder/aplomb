// Small sound-wave visualizer — a row of bars scaled by live audio bands.
interface AudioBarsProps {
  bars: number[]
  active?: boolean
  size?: 'sm' | 'md'
}

export function AudioBars({ bars, active, size = 'md' }: AudioBarsProps) {
  const values = bars.length >= 5 ? bars : [...bars, 0, 0, 0, 0, 0].slice(0, 5)
  const sm = size === 'sm'
  const max = sm ? 12 : 20
  const base = sm ? 2 : 3
  return (
    <div className={`flex items-center ${sm ? 'h-3.5 gap-[2px]' : 'h-5 gap-[3px]'}`}>
      {values.map((v, i) => (
        <span
          key={i}
          className={`${sm ? 'w-[2px]' : 'w-[3px]'} rounded-full bg-primary transition-[height] duration-100`}
          style={{ height: `${Math.max(base, Math.round((active ? v : 0) * max) + base)}px` }}
        />
      ))}
    </div>
  )
}
