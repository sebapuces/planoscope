"use client"

import { useState, useMemo } from "react"
import { CalendarHeader } from "./calendar-header"
import { CalendarDay } from "./calendar-day"
import { getMonthDays, addMonths } from "@/lib/calendar-utils"
import { getFrenchHolidays, getSchoolHolidaysForRange } from "@/lib/holidays"
import { CalendarEvent } from "@/types"

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

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
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-600 border-r border-b bg-gray-50"
          >
            {day}
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
