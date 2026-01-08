"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { CalendarDay as CalendarDayType, CalendarEvent } from "@/types"
import { formatDateKey } from "@/lib/calendar-utils"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

function formatEventDate(event: CalendarEvent): string {
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

interface CalendarDayProps {
  day: CalendarDayType
  onClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent, date: Date) => void
  onEventDrop?: (event: CalendarEvent, fromDate: Date, toDate: Date) => void
  onEventsReorder?: (date: Date, eventIds: string[]) => void
}

export function CalendarDay({ day, onClick, onEventClick, onEventDrop, onEventsReorder }: CalendarDayProps) {
  const maxVisibleEvents = 3
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Trier les événements par ordre (défini tôt pour utiliser dans les handlers)
  const sortedEvents = [...day.events].sort((a, b) => (a.order || 0) - (b.order || 0))

  function handleEventClick(e: React.MouseEvent, event: CalendarEvent) {
    e.stopPropagation()
    onEventClick?.(event, day.date)
  }

  function handleDragStart(e: React.DragEvent, event: CalendarEvent, index: number) {
    e.stopPropagation()
    e.dataTransfer.setData("application/json", JSON.stringify({
      event,
      fromDate: day.date.toISOString(),
      fromIndex: index
    }))
    e.dataTransfer.effectAllowed = "move"
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleEventDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIndex(index)
  }

  function handleEventDragLeave() {
    setDragOverIndex(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    setDragOverIndex(null)

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"))
      const event = data.event as CalendarEvent
      const fromDate = new Date(data.fromDate)

      // Si on dépose sur un autre jour, déplacer l'événement
      if (formatDateKey(fromDate) !== formatDateKey(day.date)) {
        onEventDrop?.(event, fromDate, day.date)
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
  }

  function handleEventDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIndex(null)

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"))
      const event = data.event as CalendarEvent
      const fromDate = new Date(data.fromDate)
      const fromIndex = data.fromIndex as number

      // Si c'est le même jour, réordonner
      if (formatDateKey(fromDate) === formatDateKey(day.date)) {
        if (fromIndex === targetIndex) return

        // Créer le nouvel ordre à partir de sortedEvents (pas day.events qui n'est pas trié)
        const newOrder = [...sortedEvents]
        const [movedEvent] = newOrder.splice(fromIndex, 1)
        newOrder.splice(targetIndex, 0, movedEvent)

        onEventsReorder?.(day.date, newOrder.map(e => e.id))
      } else {
        // Déplacer vers un autre jour
        onEventDrop?.(event, fromDate, day.date)
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
  }

  const hasSchoolHoliday = !!day.schoolHoliday
  const isPublicHoliday = !!day.holiday

  const schoolHolidayLabel = day.schoolHoliday
    ? `${day.schoolHoliday.name} (${day.schoolHoliday.zones.join("")})`
    : undefined

  return (
    <div
      className={cn(
        "min-h-[100px] p-1 border-r border-b cursor-pointer transition-colors hover:bg-gray-50",
        !day.isCurrentMonth && "bg-gray-50 text-gray-400",
        day.isWeekend && day.isCurrentMonth && !hasSchoolHoliday && "bg-blue-50/30",
        hasSchoolHoliday && day.isCurrentMonth && "bg-amber-50/50",
        isPublicHoliday && day.isCurrentMonth && "bg-red-50/50",
        day.isToday && "ring-2 ring-blue-500 ring-inset",
        isDragOver && "bg-blue-100 ring-2 ring-blue-400 ring-inset"
      )}
      onClick={() => onClick?.(day.date)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 text-sm rounded-full shrink-0",
            day.isToday && "bg-blue-500 text-white font-semibold"
          )}
        >
          {day.date.getDate()}
        </span>
        <div className="flex flex-col items-end gap-0.5 min-w-0">
          {day.holiday && (
            <span className="text-[10px] text-red-600 truncate max-w-[70px] font-medium">
              {day.holiday}
            </span>
          )}
          {schoolHolidayLabel && !day.holiday && (
            <span className="text-[10px] text-amber-600 truncate max-w-[70px]">
              {schoolHolidayLabel}
            </span>
          )}
        </div>
      </div>

      <div className="mt-1 space-y-0.5">
        {sortedEvents.slice(0, maxVisibleEvents).map((event, index) => (
          <Tooltip key={event.id}>
            <TooltipTrigger asChild>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, event, index)}
                onDragOver={(e) => handleEventDragOver(e, index)}
                onDragLeave={handleEventDragLeave}
                onDrop={(e) => handleEventDrop(e, index)}
                onClick={(e) => handleEventClick(e, event)}
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded truncate cursor-grab transition-all",
                  "hover:ring-2 hover:ring-offset-1 active:cursor-grabbing",
                  "border-l-3",
                  !event.color && "bg-gray-100 border-gray-400 text-gray-700 hover:ring-gray-300",
                  dragOverIndex === index && "ring-2 ring-blue-400 ring-offset-1 scale-[1.02]"
                )}
                style={
                  event.color
                    ? {
                        backgroundColor: `${event.color}20`,
                        borderLeftColor: event.color,
                        color: event.color,
                      }
                    : undefined
                }
              >
                {event.title}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="font-medium">{event.title}</div>
              <div className="text-gray-300 text-[11px]">{formatEventDate(event)}</div>
            </TooltipContent>
          </Tooltip>
        ))}
        {sortedEvents.length > maxVisibleEvents && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-1.5 w-full text-left"
              >
                +{sortedEvents.length - maxVisibleEvents} autres
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-72 p-2 max-h-80 overflow-auto"
              side="right"
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-sm font-medium mb-2 text-gray-700">
                {day.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div className="space-y-1">
                {sortedEvents.map((event, index) => (
                  <div
                    key={event.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, event, index)}
                    onDragOver={(e) => handleEventDragOver(e, index)}
                    onDragLeave={handleEventDragLeave}
                    onDrop={(e) => handleEventDrop(e, index)}
                    onClick={(e) => handleEventClick(e, event)}
                    className={cn(
                      "text-xs px-2 py-1.5 rounded cursor-grab transition-all",
                      "hover:ring-2 hover:ring-offset-1 active:cursor-grabbing",
                      "border-l-3",
                      !event.color && "bg-gray-100 border-gray-400 text-gray-700 hover:ring-gray-300",
                      dragOverIndex === index && "ring-2 ring-blue-400 ring-offset-1"
                    )}
                    style={
                      event.color
                        ? {
                            backgroundColor: `${event.color}20`,
                            borderLeftColor: event.color,
                            color: event.color,
                          }
                        : undefined
                    }
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="text-[10px] opacity-70">{formatEventDate(event)}</div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  )
}
