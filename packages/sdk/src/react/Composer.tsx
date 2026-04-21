"use client"

import { useCallback, useId, useRef, type FormEvent, type KeyboardEvent } from "react"

export type ComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  /** Accessibility: label for the text field */
  inputLabel?: string
  className?: string
}

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = "Message…",
  inputLabel = "Your message",
  className,
}: ComposerProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const autoId = useId()
  const inputId = `groucho-composer-${autoId.replace(/:/g, "")}`

  const submit = useCallback(() => {
    if (disabled || !value.trim()) return
    onSubmit()
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [disabled, onSubmit, value])

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function onFormSubmit(e: FormEvent) {
    e.preventDefault()
    submit()
  }

  return (
    <form
      className={`groucho-composer${className ? ` ${className}` : ""}`}
      onSubmit={onFormSubmit}
    >
      <label className="groucho-visually-hidden" htmlFor={inputId}>
        {inputLabel}
      </label>
      <textarea
        id={inputId}
        ref={inputRef}
        className="groucho-composer__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        aria-disabled={disabled}
      />
      <button
        type="submit"
        className="groucho-composer__send"
        disabled={disabled || !value.trim()}
      >
        Send
      </button>
    </form>
  )
}
