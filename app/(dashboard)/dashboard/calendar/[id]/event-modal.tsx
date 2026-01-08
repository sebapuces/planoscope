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
import { CalendarEvent, EventType } from "@/types"
import { formatDateKey } from "@/lib/calendar-utils"

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  calendarId: string
  selectedDate: Date | null
  clickedDate: Date | null // La date sur laquelle l'utilisateur a cliqué
  event: CalendarEvent | null
  eventTypes: EventType[]
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
  eventTypes,
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
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)

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
        setSelectedTypeId(null)
      }
      // Set the event type if editing
      if (event?.eventTypeId) {
        setSelectedTypeId(event.eventTypeId)
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

      const eventData = {
        title: title.trim(),
        startDate: new Date(startDateStr).toISOString(),
        endDate: new Date(endDateStr).toISOString(),
        eventTypeId: selectedTypeId,
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

          {eventTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-1 flex-wrap">
                <button
                  type="button"
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    selectedTypeId === null
                      ? "bg-gray-100 border-gray-400"
                      : "bg-white border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedTypeId(null)}
                >
                  Aucun
                </button>
                {eventTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={`px-2 py-1 text-xs rounded-full border transition-colors flex items-center gap-1 ${
                      selectedTypeId === type.id
                        ? "ring-2 ring-offset-1 ring-gray-400"
                        : "hover:border-gray-300"
                    }`}
                    style={{
                      backgroundColor: `${type.color}20`,
                      borderColor: type.color,
                      color: type.color,
                    }}
                    onClick={() => setSelectedTypeId(type.id)}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    {type.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
