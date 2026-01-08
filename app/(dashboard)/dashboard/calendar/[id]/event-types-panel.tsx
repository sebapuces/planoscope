"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EventType } from "@/types"
import { Plus, Trash2, X } from "lucide-react"

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#14b8a6", // teal
  "#a855f7", // purple
  "#f43f5e", // rose
]

interface EventTypesPanelProps {
  calendarId: string
  eventTypes: EventType[]
  onEventTypeCreated: (eventType: EventType) => void
  onEventTypeUpdated?: (eventType: EventType) => void
  onEventTypeDeleted?: (typeId: string) => void
}

export function EventTypesPanel({
  calendarId,
  eventTypes,
  onEventTypeCreated,
  onEventTypeUpdated,
  onEventTypeDeleted,
}: EventTypesPanelProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0])
  const [customColor, setCustomColor] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)

  async function handleCreate() {
    if (!newTypeName.trim()) return
    setIsLoading(true)

    try {
      const colorToUse = customColor || selectedColor
      const response = await fetch(`/api/calendars/${calendarId}/types`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTypeName, color: colorToUse }),
      })

      if (response.ok) {
        const data = await response.json()
        onEventTypeCreated(data)
        setNewTypeName("")
        setCustomColor("")
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

  async function handleUpdateColor(typeId: string, color: string) {
    try {
      const response = await fetch(`/api/calendars/${calendarId}/types/${typeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      })

      if (response.ok) {
        const data = await response.json()
        onEventTypeUpdated?.(data)
        setEditingTypeId(null)
        setCustomColor("")
      }
    } catch (error) {
      console.error("Error updating event type:", error)
    }
  }

  async function handleDelete(typeId: string) {
    if (!confirm("Supprimer ce type ? Les événements associés perdront leur type.")) {
      return
    }

    try {
      const response = await fetch(`/api/calendars/${calendarId}/types/${typeId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onEventTypeDeleted?.(typeId)
      }
    } catch (error) {
      console.error("Error deleting event type:", error)
    }
  }

  function ColorPicker({
    selected,
    onSelect,
    showCustom = true
  }: {
    selected: string
    onSelect: (color: string) => void
    showCustom?: boolean
  }) {
    return (
      <div className="space-y-2">
        <div className="flex gap-1 flex-wrap">
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-6 h-6 rounded-full transition-transform ${
                selected === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
              }`}
              style={{ backgroundColor: color }}
              onClick={() => {
                setCustomColor("")
                onSelect(color)
              }}
            />
          ))}
        </div>
        {showCustom && (
          <div className="flex gap-2 items-center">
            <Input
              type="text"
              value={customColor}
              onChange={(e) => {
                const val = e.target.value
                setCustomColor(val)
                if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                  onSelect(val)
                }
              }}
              placeholder="#hex..."
              className="w-24 h-7 text-xs"
            />
            {customColor && /^#[0-9A-Fa-f]{6}$/.test(customColor) && (
              <span
                className="w-6 h-6 rounded-full ring-2 ring-offset-2 ring-gray-400"
                style={{ backgroundColor: customColor }}
              />
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">Types d&apos;événements</h3>

      <div className="space-y-2">
        {eventTypes.map((type) => (
          <div key={type.id} className="group">
            {editingTypeId === type.id ? (
              <div className="p-2 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{type.name}</span>
                  <button
                    onClick={() => {
                      setEditingTypeId(null)
                      setCustomColor("")
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ColorPicker
                  selected={customColor || type.color}
                  onSelect={(color) => handleUpdateColor(type.id, color)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingTypeId(type.id)}
                  className="w-4 h-4 rounded-full flex-shrink-0 hover:ring-2 hover:ring-offset-2 hover:ring-gray-300 transition-all cursor-pointer"
                  style={{ backgroundColor: type.color }}
                  title="Modifier la couleur"
                />
                <span className="text-sm truncate flex-1">{type.name}</span>
                <button
                  onClick={() => handleDelete(type.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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
          <ColorPicker
            selected={customColor || selectedColor}
            onSelect={setSelectedColor}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAdding(false)
                setCustomColor("")
              }}
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
