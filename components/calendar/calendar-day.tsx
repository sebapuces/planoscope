"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { CalendarDay as CalendarDayType, CalendarEvent } from "@/types"
import { formatDateKey } from "@/lib/calendar-utils"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

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
}

export function CalendarDay({ day, onClick, onEventClick, onEventDrop }: CalendarDayProps) {
  const maxVisibleEvents = 3
  const [isDragOver, setIsDragOver] = useState(false)

  function handleEventClick(e: React.MouseEvent, event: CalendarEvent) {
    e.stopPropagation()
    onEventClick?.(event, day.date)
  }

  function handleDragStart(e: React.DragEvent, event: CalendarEvent) {
    e.stopPropagation()
    // Stocker l'événement et la date de départ
    e.dataTransfer.setData("application/json", JSON.stringify({
      event,
      fromDate: day.date.toISOString()
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"))
      const event = data.event as CalendarEvent
      const fromDate = new Date(data.fromDate)

      // Ne rien faire si on dépose sur le même jour
      if (formatDateKey(fromDate) === formatDateKey(day.date)) return

      onEventDrop?.(event, fromDate, day.date)
    } catch {
      // Ignorer les erreurs de parsing
    }
  }

  const hasSchoolHoliday = !!day.schoolHoliday
  const isPublicHoliday = !!day.holiday

  // Formater l'affichage des zones
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
        {day.events.slice(0, maxVisibleEvents).map((event) => (
          <Tooltip key={event.id}>
            <TooltipTrigger asChild>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, event)}
                onClick={(e) => handleEventClick(e, event)}
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded truncate cursor-grab transition-colors",
                  "hover:ring-2 hover:ring-offset-1 active:cursor-grabbing",
                  "border-l-3",
                  !event.color && "bg-gray-100 border-gray-400 text-gray-700 hover:ring-gray-300"
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
        {day.events.length > maxVisibleEvents && (
          <div className="text-xs text-gray-500 px-1.5">
            +{day.events.length - maxVisibleEvents} autres
          </div>
        )}
      </div>
    </div>
  )
}
