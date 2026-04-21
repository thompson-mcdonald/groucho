"use client"

import type { ReactNode } from "react"

export type MessageBubbleProps = {
  role: "user" | "assistant"
  content: string
  /** Optional trailing line (e.g. score badge) */
  footer?: ReactNode
  className?: string
}

export function MessageBubble({ role, content, footer, className }: MessageBubbleProps) {
  return (
    <div
      className={`groucho-message groucho-message--${role}${className ? ` ${className}` : ""}`}
      data-role={role}
    >
      <div className="groucho-message__content">{content}</div>
      {footer ? <div className="groucho-message__footer">{footer}</div> : null}
    </div>
  )
}
