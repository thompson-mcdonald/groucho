"use client"

export type ThinkingIndicatorProps = {
  visible: boolean
  className?: string
}

export function ThinkingIndicator({ visible, className }: ThinkingIndicatorProps) {
  if (!visible) return null
  return (
    <div
      className={`groucho-thinking${className ? ` ${className}` : ""}`}
      aria-hidden
    >
      <span className="groucho-thinking__dot" />
      <span className="groucho-thinking__dot" />
      <span className="groucho-thinking__dot" />
    </div>
  )
}
