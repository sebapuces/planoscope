"use client"

import { useState, useMemo } from "react"
import { CalendarHeader } from "./calendar-header"
import { CalendarDay } from "./calendar-day"
import { getMonthDays, addMonths } from "@/lib/calendar-utils"
import { getFrenchHolidays, getSchoolHolidaysForRange } from "@/lib/holidays"
import { CalendarEvent } from "@/types"

const WEEKDAYS = [
  { name: "Lun", animal: "cat" },
  { name: "Mar", animal: "rabbit" },
  { name: "Mer", animal: "bird" },
  { name: "Jeu", animal: "fish" },
  { name: "Ven", animal: "butterfly" },
  { name: "Sam", animal: "squirrel" },
  { name: "Dim", animal: "bear" },
]

// Silhouettes d'animaux en SVG
function AnimalIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    cat: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-40" fill="currentColor">
        <path d="M12 2c-1.5 0-2.5.5-3 1.5-.3.6-.5 1.3-.5 2V7c-2 .5-4 2-4 5v4c0 2 1.5 4 4 4h7c2.5 0 4-2 4-4v-4c0-3-2-4.5-4-5V5.5c0-.7-.2-1.4-.5-2C14.5 2.5 13.5 2 12 2zm-3 4l1-3h4l1 3m-6 6a1 1 0 110 2 1 1 0 010-2m6 0a1 1 0 110 2 1 1 0 010-2m-3 3c1 0 2 .5 2 1.5S13 18 12 18s-2-.5-2-1.5.5-1.5 2-1.5z"/>
      </svg>
    ),
    rabbit: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-40" fill="currentColor">
        <path d="M18 8c0-3-1-6-3-6s-2 2-2 4v2h-2V6c0-2 0-4-2-4S6 5 6 8c0 1.5.5 3 1.5 4C6 13 5 14.5 5 16.5 5 19.5 7.5 22 11 22h2c3.5 0 6-2.5 6-5.5 0-2-1-3.5-2.5-4.5 1-.9 1.5-2.5 1.5-4zM9 14a1 1 0 110-2 1 1 0 010 2m6 0a1 1 0 110-2 1 1 0 010 2m-3 4c-1 0-1.5-.5-1.5-1s.5-1 1.5-1 1.5.5 1.5 1-.5 1-1.5 1z"/>
      </svg>
    ),
    bird: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-40" fill="currentColor">
        <path d="M21 8c-1-1-3-1-4.5 0L14 10c-1-2-3-3-5-3-3 0-5.5 2.5-5.5 5.5 0 1.5.5 3 1.5 4L3 19l3-1c1 .7 2.2 1 3.5 1 3.8 0 7-3 7-7 0-.5 0-1-.1-1.5L19 9c1.3-1 1.7-1.5 2-1zM8 13a1 1 0 110-2 1 1 0 010 2z"/>
      </svg>
    ),
    fish: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-40" fill="currentColor">
        <path d="M12 5c-4 0-8 3-10 7 2 4 6 7 10 7 2 0 4-.8 5.5-2l3.5 2v-5l-1-1 1-1v-5l-3.5 2C16 6.8 14 5 12 5zm-1 5a1 1 0 110 2 1 1 0 010-2z"/>
      </svg>
    ),
    butterfly: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-40" fill="currentColor">
        <path d="M12 8V6c0-1-1-2-2-2s-2 1-2 2m4-2c0-1 1-2 2-2s2 1 2 2M12 8c-3 0-6 2-7 5 0 3 2 5 4 5 1.5 0 2.5-1 3-2 .5 1 1.5 2 3 2 2 0 4-2 4-5-1-3-4-5-7-5zm0 2v8m-4-5a1.5 1.5 0 110 3 1.5 1.5 0 010-3m8 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3z"/>
      </svg>
    ),
    squirrel: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-40" fill="currentColor">
        <path d="M19 6c-2-2-5-2-7 0-1 1-2 3-2 5 0 .5 0 1 .1 1.5C9 13 8 14 8 15.5c0 2 1.5 3.5 3.5 3.5 1 0 2-.5 2.5-1 0 1 .5 2 1.5 2h1c1.5 0 2.5-1 2.5-2.5v-3c1-.5 2-1.5 2-3 0-2-1-4-2-5.5zm-6 8a1 1 0 110-2 1 1 0 010 2z M6 9c-1 0-2 .5-2.5 1.5C3 11.5 3 13 4 14l2 2v-2c0-1 .5-2 1-3-.5-.5-1-1.5-1-2z"/>
      </svg>
    ),
    bear: (
      <svg viewBox="0 0 24 24" className="w-4 h-4 opacity-40" fill="currentColor">
        <path d="M5 5a2 2 0 104 0 2 2 0 00-4 0m10 0a2 2 0 104 0 2 2 0 00-4 0M7 8c-2 0-4 2-4 5v3c0 2.5 2 4.5 4.5 4.5h9c2.5 0 4.5-2 4.5-4.5v-3c0-3-2-5-4-5a5.5 5.5 0 00-10 0zm3 5a1 1 0 110-2 1 1 0 010 2m4 0a1 1 0 110-2 1 1 0 010 2m-2 4c-1.5 0-2-.5-2-1.5h4c0 1-.5 1.5-2 1.5z"/>
      </svg>
    ),
  }
  return icons[type] || null
}

interface CalendarGridProps {
  events: CalendarEvent[]
  onDayClick?: (date: Date) => void
  onEventClick?: (event: CalendarEvent, date: Date) => void
  onEventDrop?: (event: CalendarEvent, fromDate: Date, toDate: Date) => void
}

export function CalendarGrid({
  events,
  onDayClick,
  onEventClick,
  onEventDrop,
}: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const holidays = useMemo(() => {
    const year = currentDate.getFullYear()
    return [
      ...getFrenchHolidays(year - 1),
      ...getFrenchHolidays(year),
      ...getFrenchHolidays(year + 1),
    ]
  }, [currentDate])

  const schoolHolidays = useMemo(() => {
    const year = currentDate.getFullYear()
    // Récupérer toutes les zones
    return getSchoolHolidaysForRange(year - 1, year + 1)
  }, [currentDate])

  const days = useMemo(() => {
    return getMonthDays(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      events,
      holidays,
      schoolHolidays
    )
  }, [currentDate, events, holidays, schoolHolidays])

  function handlePreviousMonth() {
    setCurrentDate(addMonths(currentDate, -1))
  }

  function handleNextMonth() {
    setCurrentDate(addMonths(currentDate, 1))
  }

  function handleToday() {
    setCurrentDate(new Date())
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4">
        <CalendarHeader
          currentDate={currentDate}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
        />
      </div>

      <div className="grid grid-cols-7 border-t border-l">
        {WEEKDAYS.map((day) => (
          <div
            key={day.name}
            className="py-2 text-center text-sm font-medium text-gray-600 border-r border-b bg-gray-50 flex items-center justify-center gap-1"
          >
            <AnimalIcon type={day.animal} />
            <span>{day.name}</span>
          </div>
        ))}
        {days.map((day, index) => (
          <CalendarDay
            key={index}
            day={day}
            onClick={onDayClick}
            onEventClick={onEventClick}
            onEventDrop={onEventDrop}
          />
        ))}
      </div>

      {/* Légende */}
      <div className="px-4 py-2 border-t text-[11px] text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-200"></span>
          <span>Férié</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200"></span>
          <span>Vacances scolaires</span>
        </div>
        <div className="border-l pl-4 ml-2 text-gray-400">
          <span className="font-medium">Zones :</span>
          {" A"}=Besançon, Bordeaux, Clermont, Dijon, Grenoble, Limoges, Lyon, Poitiers
          {" · B"}=Aix-Marseille, Amiens, Caen, Lille, Nancy-Metz, Nantes, Nice, Orléans, Reims, Rennes, Rouen, Strasbourg
          {" · C"}=Créteil, Montpellier, Paris, Toulouse, Versailles
        </div>
      </div>
    </div>
  )
}
