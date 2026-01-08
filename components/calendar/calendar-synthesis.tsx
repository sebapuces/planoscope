"use client"

import { useState } from "react"
import { CalendarEvent } from "@/types"
import { Button } from "@/components/ui/button"
import { Loader2, FileText, X, Send } from "lucide-react"
import { formatDateKey } from "@/lib/calendar-utils"

interface CalendarSynthesisProps {
  events: CalendarEvent[]
  calendarId: string
  onApply: (result: {
    events: CalendarEvent[]
    interpretation: string
  }) => void
  onClose: () => void
}

interface EventsByMonth {
  month: string
  events: CalendarEvent[]
}

function groupEventsByMonth(events: CalendarEvent[]): EventsByMonth[] {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  )

  const byMonth: Record<string, CalendarEvent[]> = {}
  for (const event of sorted) {
    const date = new Date(event.startDate)
    const monthKey = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    if (!byMonth[monthKey]) byMonth[monthKey] = []
    byMonth[monthKey].push(event)
  }

  return Object.entries(byMonth).map(([month, events]) => ({
    month: month.charAt(0).toUpperCase() + month.slice(1),
    events,
  }))
}

function formatEventDates(event: CalendarEvent): string {
  const start = new Date(event.startDate)
  const end = new Date(event.endDate)
  const isSameDay = formatDateKey(start) === formatDateKey(end)

  const formatDate = (d: Date) => d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })

  if (isSameDay) {
    return formatDate(start)
  }
  return `${formatDate(start)} → ${formatDate(end)}`
}

export function CalendarSynthesis({
  events,
  calendarId,
  onApply,
  onClose,
}: CalendarSynthesisProps) {
  const [instruction, setInstruction] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const eventsByMonth = groupEventsByMonth(events)

  async function handleSubmit() {
    if (!instruction.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/calendars/${calendarId}/synthesis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentEvents: events,
          synthesisText: instruction,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Erreur lors de l'application")
        return
      }

      const data = await response.json()
      onApply({
        events: data.events,
        interpretation: data.interpretation,
      })
      setInstruction("")
    } catch (err) {
      setError("Erreur de connexion")
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Synthèse du calendrier</h2>
            <span className="text-sm text-gray-500">({events.length} événement{events.length > 1 ? "s" : ""})</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Synthèse formatée */}
        <div className="flex-1 overflow-auto p-4">
          {events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg">Calendrier vide</p>
              <p className="text-sm mt-1">Utilisez le chat ci-dessous pour ajouter des événements</p>
            </div>
          ) : (
            <div className="space-y-6">
              {eventsByMonth.map(({ month, events: monthEvents }) => (
                <div key={month}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 border-b pb-2">
                    {month}
                  </h3>
                  <div className="space-y-2">
                    {monthEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {/* Indicateur de couleur */}
                        <div
                          className="w-1 h-full min-h-[40px] rounded-full shrink-0"
                          style={{ backgroundColor: event.color || "#9ca3af" }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">
                              {event.title}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500 mt-0.5">
                            {formatEventDates(event)}
                          </div>
                          {event.notes && (
                            <div className="text-sm text-gray-600 mt-1 italic">
                              {event.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zone de chat */}
        <div className="border-t bg-gray-50 p-4">
          {error && (
            <p className="text-sm text-red-600 mb-2">{error}</p>
          )}

          <div className="flex gap-2">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Donnez une instruction... Ex: Décale la formation d'une semaine, Ajoute une note sur le Codir, Supprime les événements de décembre..."
              className="flex-1 p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
              rows={2}
              disabled={isLoading}
            />
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !instruction.trim()}
              className="h-auto px-4"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Entrée pour envoyer • Shift+Entrée pour nouvelle ligne
          </p>
        </div>
      </div>
    </div>
  )
}
