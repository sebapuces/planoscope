import { Holiday, SchoolHoliday, SchoolZone } from "@/types"

// Calcul de Pâques (algorithme de Meeus/Jones/Butcher)
function getEasterDate(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function getFrenchHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year)

  const holidays: Holiday[] = [
    { date: new Date(year, 0, 1), name: "Jour de l'An" },
    { date: addDays(easter, 1), name: "Lundi de Pâques" },
    { date: new Date(year, 4, 1), name: "Fête du Travail" },
    { date: new Date(year, 4, 8), name: "Victoire 1945" },
    { date: addDays(easter, 39), name: "Ascension" },
    { date: addDays(easter, 50), name: "Lundi de Pentecôte" },
    { date: new Date(year, 6, 14), name: "Fête Nationale" },
    { date: new Date(year, 7, 15), name: "Assomption" },
    { date: new Date(year, 10, 1), name: "Toussaint" },
    { date: new Date(year, 10, 11), name: "Armistice 1918" },
    { date: new Date(year, 11, 25), name: "Noël" },
  ]

  return holidays
}

export function getHolidaysForRange(startYear: number, endYear: number): Holiday[] {
  const holidays: Holiday[] = []
  for (let year = startYear; year <= endYear; year++) {
    holidays.push(...getFrenchHolidays(year))
  }
  return holidays
}

export function isHoliday(date: Date, holidays: Holiday[]): Holiday | undefined {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  return holidays.find((h) => {
    const hStr = `${h.date.getFullYear()}-${String(h.date.getMonth() + 1).padStart(2, "0")}-${String(h.date.getDate()).padStart(2, "0")}`
    return hStr === dateStr
  })
}

// Vacances scolaires françaises par année
// Source: education.gouv.fr
const schoolHolidaysData: Record<number, SchoolHoliday[]> = {
  2025: [
    // Vacances de Noël 2024-2025 (toutes zones)
    { name: "Noël", startDate: new Date(2024, 11, 21), endDate: new Date(2025, 0, 6), zones: ["A", "B", "C"] },
    // Vacances d'hiver 2025
    { name: "Hiver", startDate: new Date(2025, 1, 8), endDate: new Date(2025, 1, 24), zones: ["A"] },
    { name: "Hiver", startDate: new Date(2025, 1, 22), endDate: new Date(2025, 2, 10), zones: ["B"] },
    { name: "Hiver", startDate: new Date(2025, 1, 15), endDate: new Date(2025, 2, 3), zones: ["C"] },
    // Vacances de printemps 2025
    { name: "Printemps", startDate: new Date(2025, 3, 5), endDate: new Date(2025, 3, 22), zones: ["A"] },
    { name: "Printemps", startDate: new Date(2025, 3, 19), endDate: new Date(2025, 4, 5), zones: ["B"] },
    { name: "Printemps", startDate: new Date(2025, 3, 12), endDate: new Date(2025, 3, 28), zones: ["C"] },
    // Pont de l'Ascension 2025 (toutes zones)
    { name: "Ascension", startDate: new Date(2025, 4, 29), endDate: new Date(2025, 5, 2), zones: ["A", "B", "C"] },
    // Vacances d'été 2025 (toutes zones)
    { name: "Été", startDate: new Date(2025, 6, 5), endDate: new Date(2025, 8, 1), zones: ["A", "B", "C"] },
    // Vacances de la Toussaint 2025 (toutes zones)
    { name: "Toussaint", startDate: new Date(2025, 9, 18), endDate: new Date(2025, 10, 3), zones: ["A", "B", "C"] },
    // Vacances de Noël 2025-2026 (toutes zones)
    { name: "Noël", startDate: new Date(2025, 11, 20), endDate: new Date(2026, 0, 5), zones: ["A", "B", "C"] },
  ],
  2026: [
    // Vacances d'hiver 2026
    { name: "Hiver", startDate: new Date(2026, 1, 7), endDate: new Date(2026, 1, 23), zones: ["A"] },
    { name: "Hiver", startDate: new Date(2026, 1, 21), endDate: new Date(2026, 2, 9), zones: ["B"] },
    { name: "Hiver", startDate: new Date(2026, 1, 14), endDate: new Date(2026, 2, 2), zones: ["C"] },
    // Vacances de printemps 2026
    { name: "Printemps", startDate: new Date(2026, 3, 4), endDate: new Date(2026, 3, 20), zones: ["A"] },
    { name: "Printemps", startDate: new Date(2026, 3, 18), endDate: new Date(2026, 4, 4), zones: ["B"] },
    { name: "Printemps", startDate: new Date(2026, 3, 11), endDate: new Date(2026, 3, 27), zones: ["C"] },
    // Pont de l'Ascension 2026 (toutes zones)
    { name: "Ascension", startDate: new Date(2026, 4, 14), endDate: new Date(2026, 4, 18), zones: ["A", "B", "C"] },
    // Vacances d'été 2026 (toutes zones)
    { name: "Été", startDate: new Date(2026, 6, 4), endDate: new Date(2026, 8, 1), zones: ["A", "B", "C"] },
    // Vacances de la Toussaint 2026 (toutes zones)
    { name: "Toussaint", startDate: new Date(2026, 9, 17), endDate: new Date(2026, 10, 2), zones: ["A", "B", "C"] },
    // Vacances de Noël 2026-2027 (toutes zones)
    { name: "Noël", startDate: new Date(2026, 11, 19), endDate: new Date(2027, 0, 4), zones: ["A", "B", "C"] },
  ],
}

export function getSchoolHolidays(year: number, zone?: SchoolZone): SchoolHoliday[] {
  const holidays = schoolHolidaysData[year] || []
  if (!zone) return holidays
  return holidays.filter((h) => h.zones.includes(zone))
}

export function isSchoolHoliday(
  date: Date,
  schoolHolidays: SchoolHoliday[]
): SchoolHoliday | undefined {
  return schoolHolidays.find((h) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const start = new Date(h.startDate.getFullYear(), h.startDate.getMonth(), h.startDate.getDate())
    const end = new Date(h.endDate.getFullYear(), h.endDate.getMonth(), h.endDate.getDate())
    return d >= start && d <= end
  })
}

// Retourne les infos de vacances scolaires pour une date, avec toutes les zones concernées
export function getSchoolHolidaysForDate(
  date: Date,
  schoolHolidays: SchoolHoliday[]
): { name: string; zones: SchoolZone[] } | undefined {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  // Trouver toutes les vacances qui couvrent cette date
  const matchingHolidays = schoolHolidays.filter((h) => {
    const start = new Date(h.startDate.getFullYear(), h.startDate.getMonth(), h.startDate.getDate())
    const end = new Date(h.endDate.getFullYear(), h.endDate.getMonth(), h.endDate.getDate())
    return d >= start && d <= end
  })

  if (matchingHolidays.length === 0) return undefined

  // Regrouper par nom et collecter toutes les zones
  const byName = new Map<string, Set<SchoolZone>>()
  for (const h of matchingHolidays) {
    if (!byName.has(h.name)) {
      byName.set(h.name, new Set())
    }
    for (const zone of h.zones) {
      byName.get(h.name)!.add(zone)
    }
  }

  // Prendre le premier nom (devrait être le même pour toutes)
  const [name, zonesSet] = byName.entries().next().value
  const zones = Array.from(zonesSet).sort() as SchoolZone[]

  return { name, zones }
}

export function getSchoolHolidaysForRange(
  startYear: number,
  endYear: number,
  zone?: SchoolZone
): SchoolHoliday[] {
  const holidays: SchoolHoliday[] = []
  for (let year = startYear; year <= endYear; year++) {
    holidays.push(...getSchoolHolidays(year, zone))
  }
  return holidays
}
