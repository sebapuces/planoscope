// Outils de calcul de dates pour Claude

export interface DateToolResult {
  success: boolean
  date?: string // YYYY-MM-DD
  dayOfWeek?: string
  error?: string
}

const DAYS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
const DAYS_EN_TO_NUM: Record<string, number> = {
  sunday: 0, dimanche: 0,
  monday: 1, lundi: 1,
  tuesday: 2, mardi: 2,
  wednesday: 3, mercredi: 3,
  thursday: 4, jeudi: 4,
  friday: 5, vendredi: 5,
  saturday: 6, samedi: 6,
}

// Calcule le Nième jour de la semaine d'un mois donné
// Ex: 2ème vendredi de janvier 2026
export function getNthWeekdayOfMonth(
  year: number,
  month: number, // 1-12
  weekday: string,
  nth: number
): DateToolResult {
  const weekdayNum = DAYS_EN_TO_NUM[weekday.toLowerCase()]
  if (weekdayNum === undefined) {
    return { success: false, error: `Jour de semaine invalide: ${weekday}` }
  }

  const jsMonth = month - 1 // JavaScript utilise 0-11
  let count = 0
  const date = new Date(year, jsMonth, 1)

  while (date.getMonth() === jsMonth) {
    if (date.getDay() === weekdayNum) {
      count++
      if (count === nth) {
        const dateStr = formatDate(date)
        return {
          success: true,
          date: dateStr,
          dayOfWeek: DAYS_FR[date.getDay()],
        }
      }
    }
    date.setDate(date.getDate() + 1)
  }

  return {
    success: false,
    error: `Il n'y a pas de ${nth}ème ${weekday} en ${month}/${year}`,
  }
}

// Calcule le dernier jour de la semaine d'un mois donné
export function getLastWeekdayOfMonth(
  year: number,
  month: number,
  weekday: string
): DateToolResult {
  const weekdayNum = DAYS_EN_TO_NUM[weekday.toLowerCase()]
  if (weekdayNum === undefined) {
    return { success: false, error: `Jour de semaine invalide: ${weekday}` }
  }

  const jsMonth = month - 1
  // Dernier jour du mois
  const lastDay = new Date(year, jsMonth + 1, 0)

  while (lastDay.getDay() !== weekdayNum) {
    lastDay.setDate(lastDay.getDate() - 1)
  }

  return {
    success: true,
    date: formatDate(lastDay),
    dayOfWeek: DAYS_FR[lastDay.getDay()],
  }
}

// Retourne le jour de la semaine pour une date donnée
export function getDayOfWeek(dateStr: string): DateToolResult {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return { success: false, error: `Date invalide: ${dateStr}` }
  }

  return {
    success: true,
    date: formatDate(date),
    dayOfWeek: DAYS_FR[date.getDay()],
  }
}

// Calcule une date relative (X jours/semaines avant/après une date)
export function getRelativeDate(
  baseDate: string,
  offset: number,
  unit: "days" | "weeks" | "months"
): DateToolResult {
  const date = new Date(baseDate)
  if (isNaN(date.getTime())) {
    return { success: false, error: `Date invalide: ${baseDate}` }
  }

  switch (unit) {
    case "days":
      date.setDate(date.getDate() + offset)
      break
    case "weeks":
      date.setDate(date.getDate() + offset * 7)
      break
    case "months":
      date.setMonth(date.getMonth() + offset)
      break
  }

  return {
    success: true,
    date: formatDate(date),
    dayOfWeek: DAYS_FR[date.getDay()],
  }
}

// Trouve le prochain jour de la semaine à partir d'une date
export function getNextWeekday(
  fromDate: string,
  weekday: string,
  includeToday: boolean = false
): DateToolResult {
  const weekdayNum = DAYS_EN_TO_NUM[weekday.toLowerCase()]
  if (weekdayNum === undefined) {
    return { success: false, error: `Jour de semaine invalide: ${weekday}` }
  }

  const date = new Date(fromDate)
  if (isNaN(date.getTime())) {
    return { success: false, error: `Date invalide: ${fromDate}` }
  }

  if (!includeToday) {
    date.setDate(date.getDate() + 1)
  }

  while (date.getDay() !== weekdayNum) {
    date.setDate(date.getDate() + 1)
  }

  return {
    success: true,
    date: formatDate(date),
    dayOfWeek: DAYS_FR[date.getDay()],
  }
}

// Trouve le lundi de la semaine contenant une date
export function getMondayOfWeek(dateStr: string): DateToolResult {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return { success: false, error: `Date invalide: ${dateStr}` }
  }

  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day // Si dimanche, reculer de 6 jours
  date.setDate(date.getDate() + diff)

  return {
    success: true,
    date: formatDate(date),
    dayOfWeek: "lundi",
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Définition des outils pour Claude
export const dateTools = [
  {
    name: "get_nth_weekday_of_month",
    description: "Calcule le Nième jour de la semaine d'un mois donné. Par exemple: le 2ème vendredi de janvier 2026.",
    input_schema: {
      type: "object" as const,
      properties: {
        year: { type: "number", description: "L'année (ex: 2026)" },
        month: { type: "number", description: "Le mois (1-12)" },
        weekday: { type: "string", description: "Le jour de la semaine en français (lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche)" },
        nth: { type: "number", description: "Le Nième occurrence (1 pour premier, 2 pour deuxième, etc.)" },
      },
      required: ["year", "month", "weekday", "nth"],
    },
  },
  {
    name: "get_last_weekday_of_month",
    description: "Calcule le dernier jour de la semaine d'un mois donné. Par exemple: le dernier vendredi de mars 2026.",
    input_schema: {
      type: "object" as const,
      properties: {
        year: { type: "number", description: "L'année" },
        month: { type: "number", description: "Le mois (1-12)" },
        weekday: { type: "string", description: "Le jour de la semaine en français" },
      },
      required: ["year", "month", "weekday"],
    },
  },
  {
    name: "get_day_of_week",
    description: "Retourne le jour de la semaine pour une date donnée.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "La date au format YYYY-MM-DD" },
      },
      required: ["date"],
    },
  },
  {
    name: "get_relative_date",
    description: "Calcule une date relative à partir d'une date de base. Par exemple: 3 semaines avant le 2026-03-15.",
    input_schema: {
      type: "object" as const,
      properties: {
        base_date: { type: "string", description: "La date de référence au format YYYY-MM-DD" },
        offset: { type: "number", description: "Le décalage (positif pour après, négatif pour avant)" },
        unit: { type: "string", enum: ["days", "weeks", "months"], description: "L'unité du décalage" },
      },
      required: ["base_date", "offset", "unit"],
    },
  },
  {
    name: "get_next_weekday",
    description: "Trouve le prochain jour de la semaine à partir d'une date.",
    input_schema: {
      type: "object" as const,
      properties: {
        from_date: { type: "string", description: "La date de départ au format YYYY-MM-DD" },
        weekday: { type: "string", description: "Le jour de la semaine recherché en français" },
        include_today: { type: "boolean", description: "Inclure la date de départ si elle correspond" },
      },
      required: ["from_date", "weekday"],
    },
  },
  {
    name: "get_monday_of_week",
    description: "Trouve le lundi de la semaine contenant une date donnée.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: { type: "string", description: "Une date au format YYYY-MM-DD" },
      },
      required: ["date"],
    },
  },
]

// Exécute un outil et retourne le résultat
export function executeDateTool(
  toolName: string,
  input: Record<string, unknown>
): DateToolResult {
  switch (toolName) {
    case "get_nth_weekday_of_month":
      return getNthWeekdayOfMonth(
        input.year as number,
        input.month as number,
        input.weekday as string,
        input.nth as number
      )
    case "get_last_weekday_of_month":
      return getLastWeekdayOfMonth(
        input.year as number,
        input.month as number,
        input.weekday as string
      )
    case "get_day_of_week":
      return getDayOfWeek(input.date as string)
    case "get_relative_date":
      return getRelativeDate(
        input.base_date as string,
        input.offset as number,
        input.unit as "days" | "weeks" | "months"
      )
    case "get_next_weekday":
      return getNextWeekday(
        input.from_date as string,
        input.weekday as string,
        input.include_today as boolean ?? false
      )
    case "get_monday_of_week":
      return getMondayOfWeek(input.date as string)
    default:
      return { success: false, error: `Outil inconnu: ${toolName}` }
  }
}
