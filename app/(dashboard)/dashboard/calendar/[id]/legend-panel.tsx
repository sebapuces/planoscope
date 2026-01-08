"use client"

import { useState, useEffect } from "react"
import { Pencil, Check, X } from "lucide-react"

interface LegendPanelProps {
  calendarId: string
  initialLegend: string | null
}

export function LegendPanel({ calendarId, initialLegend }: LegendPanelProps) {
  const [legend, setLegend] = useState(initialLegend || "")
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLegend(initialLegend || "")
  }, [initialLegend])

  function startEditing() {
    setEditValue(legend)
    setIsEditing(true)
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/calendars/${calendarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legend: editValue }),
      })

      if (response.ok) {
        setLegend(editValue)
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Error saving legend:", error)
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancel() {
    setIsEditing(false)
    setEditValue("")
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">Ma Légende</h3>
        {!isEditing && (
          <button
            onClick={startEditing}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Modifier"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="Ajoutez votre légende ici...&#10;&#10;Exemple:&#10;🔵 Travail&#10;🟢 Perso&#10;🟠 Vacances"
            className="w-full h-32 text-xs p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Annuler"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded disabled:opacity-50"
              title="Enregistrer"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : legend ? (
        <div className="text-xs text-gray-600 whitespace-pre-wrap">
          {legend}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">
          Cliquez sur le crayon pour ajouter votre légende personnelle
        </p>
      )}
    </div>
  )
}
