"use client"

import type { ReactNode } from "react"
import { MessageBubble } from "./MessageBubble.js"

export type TranscriptLine = {
  id: string
  role: "user" | "assistant"
  content: string
  footer?: ReactNode
}

export type TranscriptProps = {
  lines: TranscriptLine[]
  /** Accessibility: label for the live region */
  label?: string
  className?: string
}

export function Transcript({ lines, label = "Conversation", className }: TranscriptProps) {
  return (
    <section
      className={`groucho-transcript${className ? ` ${className}` : ""}`}
      role="log"
      aria-label={label}
      aria-live="polite"
      aria-relevant="additions text"
    >
      <div className="groucho-transcript__inner">
        {lines.map((line) => (
          <MessageBubble
            key={line.id}
            role={line.role}
            content={line.content}
            footer={line.footer}
          />
        ))}
      </div>
    </section>
  )
}
