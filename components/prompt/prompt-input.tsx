"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2 } from "lucide-react"

interface PromptInputProps {
  onSubmit: (prompt: string) => Promise<void>
  isLoading: boolean
  placeholder?: string
}

export function PromptInput({
  onSubmit,
  isLoading,
  placeholder = "Décrivez ce que vous voulez planifier... (ex: \"3 semaines de formation React en mars\")",
}: PromptInputProps) {
  const [value, setValue] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim() || isLoading) return

    await onSubmit(value.trim())
    setValue("")
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="pr-12 min-h-[60px] resize-none"
        disabled={isLoading}
      />
      <Button
        type="submit"
        size="icon"
        className="absolute right-2 bottom-2"
        disabled={!value.trim() || isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  )
}
