"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EventType } from "@/types"
import { Plus } from "lucide-react"

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
]

interface EventTypesPanelProps {
  calendarId: string
  eventTypes: EventType[]
  onEventTypeCreated: (eventType: EventType) => void
}

export function EventTypesPanel({
  calendarId,
  eventTypes,
  onEventTypeCreated,
}: EventTypesPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0])
  const [isLoading, setIsLoading] = useState(false)

  async function handleCreate() {
    if (!newTypeName.trim()) return
    setIsLoading(true)

    try {
      const response = await fetch(`/api/calendars/${calendarId}/types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTypeName, color: selectedColor }),
      })

      if (response.ok) {
        const data = await response.json()
        onEventTypeCreated(data)
        setNewTypeName("")
        setIsAdding(false)
        // Rotate to next color
        const currentIndex = DEFAULT_COLORS.indexOf(selectedColor)
        setSelectedColor(DEFAULT_COLORS[(currentIndex + 1) % DEFAULT_COLORS.length])
      }
    } catch (error) {
      console.error("Error creating event type:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">Types d&apos;événements</h3>

      <div className="space-y-2">
        {eventTypes.map((type) => (
          <div key={type.id} className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: type.color }}
            />
            <span className="text-sm truncate">{type.name}</span>
          </div>
        ))}

        {eventTypes.length === 0 && !isAdding && (
          <p className="text-sm text-gray-500">Aucun type défini</p>
        )}
      </div>

      {isAdding ? (
        <div className="mt-3 space-y-2">
          <Input
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            placeholder="Nom du type"
            autoFocus
          />
          <div className="flex gap-1 flex-wrap">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-6 h-6 rounded-full transition-transform ${
                  selectedColor === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAdding(false)}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={isLoading || !newTypeName.trim()}
            >
              Créer
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="mt-3 w-full justify-start"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un type
        </Button>
      )}
    </div>
  )
}
