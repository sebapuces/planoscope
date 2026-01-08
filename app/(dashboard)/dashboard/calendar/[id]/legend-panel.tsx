"use client"

import { useState, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface LegendEntry {
  color: string
  label: string
}

const DEFAULT_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
  "#06b6d4", "#f97316", "#84cc16", "#14b8a6", "#a855f7", "#f43f5e",
]

interface LegendPanelProps {
  calendarId: string
  initialLegend: string | null
}

function parseLegend(legendJson: string | null): LegendEntry[] {
  if (!legendJson) return []
  try {
    const parsed = JSON.parse(legendJson)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

export function LegendPanel({ calendarId, initialLegend }: LegendPanelProps) {
  const [entries, setEntries] = useState<LegendEntry[]>(() => parseLegend(initialLegend))
  const [isAdding, setIsAdding] = useState(false)
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])
  const [newLabel, setNewLabel] = useState("")
  const [customColor, setCustomColor] = useState("")

  useEffect(() => {
    setEntries(parseLegend(initialLegend))
  }, [initialLegend])

  async function saveLegend(newEntries: LegendEntry[]) {
    try {
      await fetch(`/api/calendars/${calendarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legend: JSON.stringify(newEntries) }),
      })
    } catch (error) {
      console.error("Error saving legend:", error)
    }
  }

  function handleAdd() {
    if (!newLabel.trim()) return
    const colorToUse = customColor || newColor
    const newEntries = [...entries, { color: colorToUse, label: newLabel.trim() }]
    setEntries(newEntries)
    saveLegend(newEntries)
    setNewLabel("")
    setCustomColor("")
    setIsAdding(false)
    // Rotate to next color
    const currentIndex = DEFAULT_COLORS.indexOf(newColor)
    setNewColor(DEFAULT_COLORS[(currentIndex + 1) % DEFAULT_COLORS.length])
  }

  function handleRemove(index: number) {
    const newEntries = entries.filter((_, i) => i !== index)
    setEntries(newEntries)
    saveLegend(newEntries)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    } else if (e.key === "Escape") {
      setIsAdding(false)
      setNewLabel("")
      setCustomColor("")
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-3">
      <h3 className="font-semibold text-sm mb-2">Ma Légende</h3>

      <div className="space-y-1.5">
        {entries.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 group">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-700 flex-1 truncate">{entry.label}</span>
            <button
              onClick={() => handleRemove(index)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
              title="Supprimer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {entries.length === 0 && !isAdding && (
          <p className="text-xs text-gray-400 italic">Aucune entrée</p>
        )}
      </div>

      {isAdding ? (
        <div className="mt-2 space-y-2 pt-2 border-t">
          <div className="flex gap-1 flex-wrap">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-5 h-5 rounded-full transition-transform ${
                  newColor === color && !customColor
                    ? "ring-2 ring-offset-1 ring-gray-400 scale-110"
                    : ""
                }`}
                style={{ backgroundColor: color }}
                onClick={() => {
                  setNewColor(color)
                  setCustomColor("")
                }}
              />
            ))}
          </div>
          <div className="flex gap-1 items-center">
            <Input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#hex"
              className="w-16 h-6 text-xs px-1"
            />
            {customColor && /^#[0-9A-Fa-f]{6}$/.test(customColor) && (
              <span
                className="w-5 h-5 rounded-full ring-2 ring-offset-1 ring-gray-400"
                style={{ backgroundColor: customColor }}
              />
            )}
          </div>
          <div className="flex gap-1 items-center">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: customColor || newColor }}
            />
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Description..."
              className="flex-1 h-7 text-xs"
              autoFocus
            />
          </div>
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => {
                setIsAdding(false)
                setNewLabel("")
                setCustomColor("")
              }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={!newLabel.trim()}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 w-full justify-center py-1 border border-dashed rounded hover:border-gray-400 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Ajouter
        </button>
      )}
    </div>
  )
}
