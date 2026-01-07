import { CalendarDay, CalendarEvent, Holiday, SchoolHoliday, SchoolZone } from "@/types"
import { getSchoolHolidaysForDate } from "./holidays"

export function getMonthDays(
  year: number,
  month: number,
  events: CalendarEvent[] = [],
  holidays: Holiday[] = [],
  schoolHolidays: SchoolHoliday[] = []
): CalendarDay[] {
  const days: CalendarDay[] = []
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  // Trouver le lundi précédent ou le premier jour du mois si c'est un lundi
  const startDate = new Date(firstDayOfMonth)
  const dayOfWeek = startDate.getDay()
  // En JS, dimanche = 0, donc on ajuste pour avoir lundi = 0
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  startDate.setDate(startDate.getDate() - mondayOffset)

  // Trouver le dimanche suivant la fin du mois
  const endDate = new Date(lastDayOfMonth)
  const endDayOfWeek = endDate.getDay()
  const sundayOffset = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek
  endDate.setDate(endDate.getDate() + sundayOffset)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateStr = formatDateKey(currentDate)
    const dayEvents = events.filter((event) => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      eventStart.setHours(0, 0, 0, 0)
      eventEnd.setHours(0, 0, 0, 0)
      const current = new Date(currentDate)
      current.setHours(0, 0, 0, 0)
      return current >= eventStart && current <= eventEnd
    })

    const holiday = holidays.find(
      (h) => formatDateKey(h.date) === dateStr
    )

    const schoolHolidayInfo = getSchoolHolidaysForDate(currentDate, schoolHolidays)

    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6

    days.push({
      date: new Date(currentDate),
      isCurrentMonth: currentDate.getMonth() === month,
      isToday: formatDateKey(currentDate) === formatDateKey(today),
      isWeekend,
      events: dayEvents,
      holiday: holiday?.name,
      schoolHoliday: schoolHolidayInfo,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
}

export function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateKey(date1) === formatDateKey(date2)
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
