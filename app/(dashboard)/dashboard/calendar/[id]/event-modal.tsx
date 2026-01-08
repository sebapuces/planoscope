"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CalendarEvent } from "@/types"
import { formatDateKey } from "@/lib/calendar-utils"

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

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  calendarId: string
  selectedDate: Date | null
  clickedDate: Date | null // La date sur laquelle l'utilisateur a cliqué
  event: CalendarEvent | null
  onEventCreated: (event: CalendarEvent) => void
  onEventUpdated: (event: CalendarEvent) => void
  onEventDeleted: (eventId: string) => void
  onEventSplit: (originalEvent: CalendarEvent, clickedDate: Date, newEvents: CalendarEvent[]) => void
}

export function EventModal({
  isOpen,
  onClose,
  calendarId,
  selectedDate,
  clickedDate,
  event,
  onEventCreated,
  onEventUpdated,
  onEventDeleted,
  onEventSplit,
}: EventModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [isPeriod, setIsPeriod] = useState(false)
  const [endDate, setEndDate] = useState("")
  const [showSplitChoice, setShowSplitChoice] = useState(false)
  const [editMode, setEditMode] = useState<"full" | "day">("full")
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [customColor, setCustomColor] = useState("")

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (event) {
        const start = new Date(event.startDate)
        const end = new Date(event.endDate)
        const isMultiDay = formatDateKey(start) !== formatDateKey(end)

        // Si c'est un événement multi-jours, proposer le choix de modifier tout ou juste ce jour
        if (isMultiDay && clickedDate) {
          setShowSplitChoice(true)
          setEditMode("full")
        } else {
          setShowSplitChoice(false)
          setEditMode("full")
        }

        setTitle(event.title)
        setIsPeriod(isMultiDay)
        setEndDate(formatDateKey(end))
      } else {
        setTitle("")
        setIsPeriod(false)
        setEndDate(selectedDate ? formatDateKey(selectedDate) : "")
        setShowSplitChoice(false)
        setEditMode("full")
        setSelectedColor(null)
        setCustomColor("")
      }
      // Set the color if editing
      if (event?.color) {
        setSelectedColor(event.color)
      }
    }
  }, [isOpen, event, selectedDate, clickedDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !selectedDate) return

    setIsLoading(true)

    try {
      const startDateStr = formatDateKey(selectedDate)
      const endDateStr = isPeriod ? endDate : startDateStr

      const colorToUse = customColor || selectedColor
      const eventData = {
        title: title.trim(),
        startDate: new Date(startDateStr).toISOString(),
        endDate: new Date(endDateStr).toISOString(),
        color: colorToUse,
      }

      if (event) {
        const response = await fetch(`/api/calendars/${calendarId}/events/${event.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        })
        const data = await response.json()
        if (response.ok) {
          onEventUpdated({
            ...data,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
          })
        }
      } else {
        const response = await fetch(`/api/calendars/${calendarId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        })
        const data = await response.json()
        if (response.ok) {
          onEventCreated({
            ...data,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
          })
        }
      }
    } catch (error) {
      console.error("Error saving event:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDelete() {
    if (!event) return
    setIsLoading(true)

    try {
      // Si on est en mode "jour uniquement", on supprime juste ce jour (découpage sans le jour)
      if (editMode === "day" && clickedDate) {
        const originalStart = new Date(event.startDate)
        const originalEnd = new Date(event.endDate)
        const clicked = new Date(clickedDate)
        clicked.setHours(0, 0, 0, 0)

        const newEvents: CalendarEvent[] = []

        // Partie avant le jour cliqué
        const dayBefore = new Date(clicked)
        dayBefore.setDate(dayBefore.getDate() - 1)
        if (dayBefore >= originalStart) {
          const res = await fetch(`/api/calendars/${calendarId}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: event.title,
              startDate: originalStart.toISOString(),
              endDate: dayBefore.toISOString(),
              eventTypeId: event.eventTypeId,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            newEvents.push({ ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) })
          }
        }

        // Partie après le jour cliqué (pas de segment pour le jour supprimé)
        const dayAfter = new Date(clicked)
        dayAfter.setDate(dayAfter.getDate() + 1)
        if (dayAfter <= originalEnd) {
          const res = await fetch(`/api/calendars/${calendarId}/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: event.title,
              startDate: dayAfter.toISOString(),
              endDate: originalEnd.toISOString(),
              eventTypeId: event.eventTypeId,
            }),
          })
          if (res.ok) {
            const data = await res.json()
            newEvents.push({ ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) })
          }
        }

        // Supprimer l'événement original
        await fetch(`/api/calendars/${calendarId}/events/${event.id}`, { method: "DELETE" })

        onEventSplit(event, clicked, newEvents)
      } else {
        // Suppression normale de tout l'événement
        const response = await fetch(`/api/calendars/${calendarId}/events/${event.id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          onEventDeleted(event.id)
        }
      }
    } catch (error) {
      console.error("Error deleting event:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : ""

  const formattedClickedDate = clickedDate
    ? clickedDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : ""

  function handleChooseEditMode(mode: "full" | "day") {
    setEditMode(mode)
    setShowSplitChoice(false)
    if (mode === "day" && clickedDate) {
      // Préremplir pour éditer uniquement ce jour
      setIsPeriod(false)
    }
  }

  async function handleSplitAndEdit() {
    if (!event || !clickedDate) return
    setIsLoading(true)

    try {
      const originalStart = new Date(event.startDate)
      const originalEnd = new Date(event.endDate)
      const clicked = new Date(clickedDate)
      clicked.setHours(0, 0, 0, 0)

      const newEvents: CalendarEvent[] = []

      // Partie avant le jour cliqué
      const dayBefore = new Date(clicked)
      dayBefore.setDate(dayBefore.getDate() - 1)
      if (dayBefore >= originalStart) {
        const res = await fetch(`/api/calendars/${calendarId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event.title,
            startDate: originalStart.toISOString(),
            endDate: dayBefore.toISOString(),
            eventTypeId: event.eventTypeId,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          newEvents.push({ ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) })
        }
      }

      // Le jour cliqué avec le nouveau titre
      const res = await fetch(`/api/calendars/${calendarId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startDate: clicked.toISOString(),
          endDate: clicked.toISOString(),
          eventTypeId: event.eventTypeId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        newEvents.push({ ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) })
      }

      // Partie après le jour cliqué
      const dayAfter = new Date(clicked)
      dayAfter.setDate(dayAfter.getDate() + 1)
      if (dayAfter <= originalEnd) {
        const res = await fetch(`/api/calendars/${calendarId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: event.title,
            startDate: dayAfter.toISOString(),
            endDate: originalEnd.toISOString(),
            eventTypeId: event.eventTypeId,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          newEvents.push({ ...data, startDate: new Date(data.startDate), endDate: new Date(data.endDate) })
        }
      }

      // Supprimer l'événement original
      await fetch(`/api/calendars/${calendarId}/events/${event.id}`, { method: "DELETE" })

      onEventSplit(event, clicked, newEvents)
    } catch (error) {
      console.error("Error splitting event:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Si on doit montrer le choix d'édition
  if (showSplitChoice && event) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;événement</DialogTitle>
            <p className="text-sm text-gray-500">{event.title}</p>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <p className="text-sm text-gray-600">
              Cet événement s&apos;étale sur plusieurs jours. Que voulez-vous modifier ?
            </p>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleChooseEditMode("full")}
            >
              <div className="text-left">
                <div className="font-medium">Toute la période</div>
                <div className="text-xs text-gray-500">
                  Modifier l&apos;événement entier
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => handleChooseEditMode("day")}
            >
              <div className="text-left">
                <div className="font-medium">Uniquement le {formattedClickedDate}</div>
                <div className="text-xs text-gray-500">
                  Découper et modifier ce jour seulement
                </div>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {event ? (editMode === "day" ? `Modifier le ${formattedClickedDate}` : "Modifier") : "Nouvel événement"}
          </DialogTitle>
          <p className="text-sm text-gray-500 capitalize">{editMode === "day" ? "" : formattedDate}</p>
        </DialogHeader>

        <form onSubmit={editMode === "day" ? (e) => { e.preventDefault(); handleSplitAndEdit(); } : handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Formation React, Congés..."
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex gap-1 flex-wrap items-center">
              <button
                type="button"
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  selectedColor === null && !customColor
                    ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                style={{ background: "linear-gradient(135deg, #f3f4f6 50%, #d1d5db 50%)" }}
                onClick={() => {
                  setSelectedColor(null)
                  setCustomColor("")
                }}
                title="Sans couleur"
              />
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-6 h-6 rounded-full transition-transform ${
                    selectedColor === color && !customColor
                      ? "ring-2 ring-offset-2 ring-gray-400 scale-110"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setSelectedColor(color)
                    setCustomColor("")
                  }}
                />
              ))}
              <Input
                type="text"
                value={customColor}
                onChange={(e) => {
                  const val = e.target.value
                  setCustomColor(val)
                  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                    setSelectedColor(val)
                  }
                }}
                placeholder="#hex"
                className="w-20 h-7 text-xs ml-1"
              />
              {customColor && /^#[0-9A-Fa-f]{6}$/.test(customColor) && (
                <span
                  className="w-6 h-6 rounded-full ring-2 ring-offset-2 ring-gray-400"
                  style={{ backgroundColor: customColor }}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPeriod"
              checked={isPeriod}
              onChange={(e) => setIsPeriod(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isPeriod" className="font-normal cursor-pointer">
              C&apos;est une période (plusieurs jours)
            </Label>
          </div>

          {isPeriod && (
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={selectedDate ? formatDateKey(selectedDate) : undefined}
                required
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {event && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                Supprimer
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading || !title.trim()}>
                {isLoading ? "..." : event ? "Modifier" : "Créer"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
