"use client"

import { useState, useEffect, useRef } from "react"
import { CalendarGrid } from "@/components/calendar"
import { PromptInput, PromptFeedback, PromptHistory } from "@/components/prompt"
import { CalendarEvent } from "@/types"
import { EventModal } from "./event-modal"
import { Button } from "@/components/ui/button"
import { Undo2, History, FileText } from "lucide-react"
import { CalendarSynthesis } from "@/components/calendar/calendar-synthesis"
import { EventTypesPanel } from "./event-types-panel"
import { EventType } from "@/types"

interface Prompt {
  id: string
  content: string
  interpretation: string | null
  snapshotName?: string | null
  createdAt: Date
}

interface Snapshot {
  id: string
  createdAt: Date
  prompt?: {
    content: string
    snapshotName: string | null
  }
}

interface PromptFeedbackData {
  interpretation?: string
  warnings?: string[]
  questions?: string[]
  createdCount: number
  updatedCount: number
  deletedCount: number
}

interface CalendarViewProps {
  calendarId: string
  initialEvents: CalendarEvent[]
  initialPrompts?: Prompt[]
}

export function CalendarView({
  calendarId,
  initialEvents,
  initialPrompts = [],
}: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [prompts, setPrompts] = useState<Prompt[]>(initialPrompts)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [clickedDate, setClickedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPromptLoading, setIsPromptLoading] = useState(false)
  const [isUndoing, setIsUndoing] = useState(false)
  const [feedback, setFeedback] = useState<PromptFeedbackData | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showSynthesis, setShowSynthesis] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [eventTypes, setEventTypes] = useState<EventType[]>([])

  // Historique pour l'annulation (max 20 états)
  const historyRef = useRef<{ events: CalendarEvent[]; description: string }[]>([])
  const MAX_HISTORY = 20

  function saveToHistory(description: string) {
    historyRef.current = [
      { events: [...events], description },
      ...historyRef.current.slice(0, MAX_HISTORY - 1)
    ]
  }

  function canUndo() {
    return historyRef.current.length > 0
  }

  // Raccourci clavier Ctrl+Z pour annuler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        if (canUndo() || prompts.length > 0) {
          handleUndo()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [promptsRes, snapshotsRes, typesRes] = await Promise.all([
          fetch(`/api/calendars/${calendarId}/prompts`),
          fetch(`/api/calendars/${calendarId}/snapshots`),
          fetch(`/api/calendars/${calendarId}/types`),
        ])
        if (promptsRes.ok) {
          const data = await promptsRes.json()
          setPrompts(data)
        }
        if (snapshotsRes.ok) {
          const data = await snapshotsRes.json()
          setSnapshots(data)
        }
        if (typesRes.ok) {
          const data = await typesRes.json()
          setEventTypes(data)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }
    loadData()
  }, [calendarId])

  function handleDayClick(date: Date) {
    setSelectedDate(date)
    setSelectedEvent(null)
    setIsModalOpen(true)
  }

  function handleEventClick(event: CalendarEvent, date: Date) {
    setSelectedEvent(event)
    setSelectedDate(new Date(event.startDate))
    setClickedDate(date) // La date sur laquelle on a cliqué
    setIsModalOpen(true)
  }

  function handleEventCreated(event: CalendarEvent) {
    saveToHistory("Création d'événement")
    setEvents([...events, event])
    setIsModalOpen(false)
  }

  function handleEventUpdated(updatedEvent: CalendarEvent) {
    saveToHistory("Modification d'événement")
    setEvents(events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)))
    setIsModalOpen(false)
  }

  function handleEventDeleted(eventId: string) {
    saveToHistory("Suppression d'événement")
    setEvents(events.filter((e) => e.id !== eventId))
    setIsModalOpen(false)
  }

  function handleEventSplit(originalEvent: CalendarEvent, _clickedDate: Date, newEvents: CalendarEvent[]) {
    saveToHistory("Découpage d'événement")
    // Supprimer l'événement original et ajouter les nouveaux
    setEvents(events.filter((e) => e.id !== originalEvent.id).concat(newEvents))
    setIsModalOpen(false)
  }

  async function handleEventDrop(event: CalendarEvent, fromDate: Date, toDate: Date) {
    saveToHistory("Déplacement d'événement")

    // Calculer le décalage en jours
    const fromTime = new Date(fromDate).setHours(0, 0, 0, 0)
    const toTime = new Date(toDate).setHours(0, 0, 0, 0)
    const daysDiff = Math.round((toTime - fromTime) / (1000 * 60 * 60 * 24))

    // Calculer les nouvelles dates
    const newStartDate = new Date(event.startDate)
    newStartDate.setDate(newStartDate.getDate() + daysDiff)
    const newEndDate = new Date(event.endDate)
    newEndDate.setDate(newEndDate.getDate() + daysDiff)

    // Sauvegarder l'état actuel pour rollback
    const previousEvents = [...events]

    // Mise à jour optimiste locale
    const updatedEvent = {
      ...event,
      startDate: newStartDate,
      endDate: newEndDate,
    }
    setEvents(events.map((e) => (e.id === event.id ? updatedEvent : e)))

    // Appel API pour persister
    try {
      const response = await fetch(`/api/calendars/${calendarId}/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
        }),
      })

      if (!response.ok) {
        // Annuler la mise à jour optimiste en cas d'erreur
        setEvents(previousEvents)
        const errorData = await response.json().catch(() => ({}))
        setFeedback({
          warnings: [errorData.error || "Erreur lors du déplacement - l'événement n'existe peut-être plus"],
          createdCount: 0,
          updatedCount: 0,
          deletedCount: 0,
        })
      }
    } catch {
      // Annuler la mise à jour optimiste en cas d'erreur
      setEvents(previousEvents)
      setFeedback({
        warnings: ["Erreur de connexion"],
        createdCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      })
    }
  }

  async function handlePromptSubmit(promptContent: string) {
    saveToHistory(`Instruction: ${promptContent.slice(0, 30)}...`)
    setIsPromptLoading(true)
    setFeedback(null)

    try {
      const response = await fetch(`/api/calendars/${calendarId}/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: promptContent }),
      })

      if (!response.ok) {
        const error = await response.json()
        setFeedback({
          warnings: [error.error || "Erreur lors du traitement"],
          createdCount: 0,
          updatedCount: 0,
          deletedCount: 0,
        })
        return
      }

      const data = await response.json()

      if (data.createdEvents?.length > 0) {
        const newEvents = data.createdEvents.map((e: CalendarEvent) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: new Date(e.endDate),
        }))
        setEvents((prev) => [...prev, ...newEvents])
      }

      if (data.updatedEvents?.length > 0) {
        setEvents((prev) =>
          prev.map((e) => {
            const updated = data.updatedEvents.find((u: CalendarEvent) => u.id === e.id)
            return updated
              ? { ...updated, startDate: new Date(updated.startDate), endDate: new Date(updated.endDate) }
              : e
          })
        )
      }

      if (data.deletedEventIds?.length > 0) {
        const deletedIds = new Set(data.deletedEventIds)
        setEvents((prev) => prev.filter((e) => !deletedIds.has(e.id)))
      }

      if (data.prompt) {
        setPrompts((prev) => [data.prompt, ...prev])
      }

      setFeedback({
        interpretation: data.result?.interpretation,
        warnings: data.result?.warnings,
        questions: data.result?.questions,
        createdCount: data.createdEvents?.length || 0,
        updatedCount: data.updatedEvents?.length || 0,
        deletedCount: data.deletedEventIds?.length || 0,
      })
    } catch (error) {
      console.error("Error submitting prompt:", error)
      setFeedback({
        warnings: ["Erreur de connexion"],
        createdCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      })
    } finally {
      setIsPromptLoading(false)
    }
  }

  async function handleUndo() {
    // Utiliser l'historique local s'il existe
    if (historyRef.current.length > 0) {
      const lastState = historyRef.current[0]
      historyRef.current = historyRef.current.slice(1)

      // Synchroniser avec la base de données
      try {
        // Supprimer tous les événements actuels et recréer ceux de l'historique
        const currentIds = events.map(e => e.id)
        const historyIds = lastState.events.map(e => e.id)

        // Supprimer les événements qui n'étaient pas dans l'historique
        for (const id of currentIds) {
          if (!historyIds.includes(id)) {
            await fetch(`/api/calendars/${calendarId}/events/${id}`, { method: "DELETE" })
          }
        }

        // Recréer les événements qui étaient dans l'historique mais plus maintenant
        for (const evt of lastState.events) {
          if (!currentIds.includes(evt.id)) {
            await fetch(`/api/calendars/${calendarId}/events`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: evt.title,
                startDate: new Date(evt.startDate).toISOString(),
                endDate: new Date(evt.endDate).toISOString(),
                eventTypeId: evt.eventTypeId,
                notes: evt.notes,
              }),
            })
          }
        }

        // Mettre à jour les événements modifiés
        for (const evt of lastState.events) {
          if (currentIds.includes(evt.id)) {
            await fetch(`/api/calendars/${calendarId}/events/${evt.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: evt.title,
                startDate: new Date(evt.startDate).toISOString(),
                endDate: new Date(evt.endDate).toISOString(),
                eventTypeId: evt.eventTypeId,
                notes: evt.notes,
              }),
            })
          }
        }
      } catch (error) {
        console.error("Error syncing undo:", error)
      }

      setEvents(lastState.events)
      setFeedback({
        interpretation: `Annulé : ${lastState.description}`,
        createdCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      })
      return
    }

    // Fallback sur l'ancien système pour les prompts sans historique local
    setIsUndoing(true)
    setFeedback(null)

    try {
      const response = await fetch(`/api/calendars/${calendarId}/undo`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        setFeedback({
          warnings: [error.error || "Rien à annuler"],
          createdCount: 0,
          updatedCount: 0,
          deletedCount: 0,
        })
        return
      }

      const data = await response.json()

      if (data.deletedEventIds?.length > 0) {
        const deletedIds = new Set(data.deletedEventIds)
        setEvents((prev) => prev.filter((e) => !deletedIds.has(e.id)))
      }

      if (data.undonePrompt) {
        setPrompts((prev) => prev.filter((p) => p.id !== data.undonePrompt.id))
      }

      setFeedback({
        interpretation: `Action annulée : "${data.undonePrompt?.content || "Dernière action"}"`,
        createdCount: 0,
        updatedCount: 0,
        deletedCount: data.deletedEventIds?.length || 0,
      })
    } catch (error) {
      console.error("Error undoing:", error)
      setFeedback({
        warnings: ["Erreur lors de l'annulation"],
        createdCount: 0,
        updatedCount: 0,
        deletedCount: 0,
      })
    } finally {
      setIsUndoing(false)
    }
  }

  async function handleCreateSnapshot(name: string) {
    try {
      const response = await fetch(`/api/calendars/${calendarId}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        const newSnapshot = await response.json()
        setSnapshots((prev) => [newSnapshot, ...prev])
        setFeedback({
          interpretation: `Point de sauvegarde "${name}" créé`,
          createdCount: 0,
          updatedCount: 0,
          deletedCount: 0,
        })
      }
    } catch (error) {
      console.error("Error creating snapshot:", error)
    }
  }

  async function handleRestore(snapshotId: string) {
    try {
      const response = await fetch(
        `/api/calendars/${calendarId}/snapshots/${snapshotId}/restore`,
        { method: "POST" }
      )

      if (response.ok) {
        const data = await response.json()
        setEvents(
          data.events.map((e: CalendarEvent) => ({
            ...e,
            startDate: new Date(e.startDate),
            endDate: new Date(e.endDate),
          }))
        )
        setFeedback({
          interpretation: `Version "${data.snapshotName || "sauvegarde"}" restaurée`,
          createdCount: data.events.length,
          updatedCount: 0,
          deletedCount: 0,
        })
      }
    } catch (error) {
      console.error("Error restoring snapshot:", error)
    }
  }

  function handleSynthesisApply(result: { events: CalendarEvent[]; interpretation: string }) {
    saveToHistory("Modification via synthèse")
    setEvents(
      result.events.map((e) => ({
        ...e,
        startDate: new Date(e.startDate),
        endDate: new Date(e.endDate),
      }))
    )
    setFeedback({
      interpretation: result.interpretation,
      createdCount: 0,
      updatedCount: result.events.length,
      deletedCount: 0,
    })
    setShowSynthesis(false)
  }

  function handleEventTypeCreated(eventType: EventType) {
    setEventTypes((prev) => [...prev, eventType])
  }

  function handleEventTypeUpdated(eventType: EventType) {
    setEventTypes((prev) => prev.map((t) => (t.id === eventType.id ? eventType : t)))
    // Mettre à jour les événements qui utilisent ce type
    setEvents((prev) =>
      prev.map((e) =>
        e.eventTypeId === eventType.id ? { ...e, eventType } : e
      )
    )
  }

  function handleEventTypeDeleted(typeId: string) {
    setEventTypes((prev) => prev.filter((t) => t.id !== typeId))
    // Les événements gardent leur eventTypeId mais eventType devient null
    setEvents((prev) =>
      prev.map((e) =>
        e.eventTypeId === typeId ? { ...e, eventType: null } : e
      )
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex gap-4 flex-1 overflow-hidden">
        <div className="w-56 shrink-0">
          <EventTypesPanel
            calendarId={calendarId}
            eventTypes={eventTypes}
            onEventTypeCreated={handleEventTypeCreated}
            onEventTypeUpdated={handleEventTypeUpdated}
            onEventTypeDeleted={handleEventTypeDeleted}
          />
        </div>
        <div className="flex-1 overflow-auto">
          <CalendarGrid
            events={events}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
          />
        </div>

        {showHistory && (
          <div className="w-72 bg-white rounded-lg shadow p-4 overflow-hidden flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Historique & Sauvegardes</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                title="Fermer"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <PromptHistory
                prompts={prompts}
                snapshots={snapshots}
                calendarId={calendarId}
                onRestore={handleRestore}
                onCreateSnapshot={handleCreateSnapshot}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {feedback && (
          <PromptFeedback
            interpretation={feedback.interpretation}
            warnings={feedback.warnings}
            questions={feedback.questions}
            createdCount={feedback.createdCount}
            updatedCount={feedback.updatedCount}
            deletedCount={feedback.deletedCount}
            onDismiss={() => setFeedback(null)}
          />
        )}
        <div className="flex gap-2">
          <div className="flex-1">
            <PromptInput onSubmit={handlePromptSubmit} isLoading={isPromptLoading} />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSynthesis(true)}
            title="Voir la synthèse"
            className="h-[60px] w-[60px]"
          >
            <FileText className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            title={showHistory ? "Masquer l'historique" : "Afficher l'historique"}
            className="h-[60px] w-[60px]"
          >
            <History className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleUndo}
            disabled={isUndoing || (!canUndo() && prompts.length === 0)}
            title="Annuler la dernière action (Ctrl+Z)"
            className="h-[60px] w-[60px]"
          >
            <Undo2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {showSynthesis && (
        <CalendarSynthesis
          events={events}
          calendarId={calendarId}
          onApply={handleSynthesisApply}
          onClose={() => setShowSynthesis(false)}
        />
      )}

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        calendarId={calendarId}
        selectedDate={selectedDate}
        clickedDate={clickedDate}
        event={selectedEvent}
        eventTypes={eventTypes}
        onEventCreated={handleEventCreated}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
        onEventSplit={handleEventSplit}
      />
    </div>
  )
}
