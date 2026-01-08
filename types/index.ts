export interface CalendarEvent {
  id: string
  title: string
  notes?: string | null
  color?: string | null
  order?: number
  startDate: Date
  endDate: Date
  eventTypeId?: string | null
  eventType?: EventType | null
  calendarId: string
}

export interface EventType {
  id: string
  name: string
  color: string
  calendarId: string
}

export interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  events: CalendarEvent[]
  holiday?: string
  schoolHoliday?: {
    name: string
    zones: SchoolZone[]
  }
}

export interface Holiday {
  date: Date
  name: string
}

export type SchoolZone = "A" | "B" | "C"

export interface SchoolHoliday {
  name: string
  startDate: Date
  endDate: Date
  zones: SchoolZone[]
}

export type CalendarView = "month" | "week" | "3months" | "6months" | "year"
