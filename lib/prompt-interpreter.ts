import { anthropic } from "./claude"
import { CalendarEvent, EventType, Holiday, SchoolHoliday, SchoolZone } from "@/types"
import { getFrenchHolidays, getSchoolHolidaysForRange } from "./holidays"
import { formatDateKey } from "./calendar-utils"
import { dateTools, executeDateTool } from "./date-tools"
import type { MessageParam, ContentBlockParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages"

export interface PromptAction {
  action: "create" | "update" | "delete"
  event: {
    id?: string
    title: string
    startDate: string
    endDate: string
    eventType?: string
  }
}

export interface PromptResult {
  interpretation: string
  actions: PromptAction[]
  newEventTypes: { name: string; suggestedColor: string }[]
  warnings: string[]
  questions: string[]
}

interface PromptContext {
  today: Date
  events: CalendarEvent[]
  eventTypes: EventType[]
  holidays: Holiday[]
  schoolHolidays: SchoolHoliday[]
  schoolZone: SchoolZone
}

function buildSystemPrompt(context: PromptContext): string {
  const holidaysList = context.holidays
    .map((h) => `- ${formatDateKey(h.date)}: ${h.name}`)
    .join("\n")

  const schoolHolidaysList = context.schoolHolidays
    .map((h) => `- ${h.name}: du ${formatDateKey(h.startDate)} au ${formatDateKey(h.endDate)} (zones ${h.zones.join(", ")})`)
    .join("\n")

  const joursSemaine = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

  // Créer un Set des dates de jours fériés pour recherche rapide
  const holidayDates = new Set(context.holidays.map(h => formatDateKey(h.date)))
  const holidayNames = new Map(context.holidays.map(h => [formatDateKey(h.date), h.name]))

  // Fonction pour analyser les jours spéciaux couverts par un événement
  function getSpecialDaysInRange(start: Date, end: Date): { weekends: string[], holidays: string[] } {
    const weekends: string[] = []
    const holidays: string[] = []
    const current = new Date(start)
    current.setHours(0, 0, 0, 0)
    const endDate = new Date(end)
    endDate.setHours(0, 0, 0, 0)

    while (current <= endDate) {
      const dateKey = formatDateKey(current)
      const day = current.getDay()

      // Vérifier si c'est un jour férié
      if (holidayDates.has(dateKey)) {
        holidays.push(`${holidayNames.get(dateKey)} (${dateKey})`)
      }
      // Vérifier si c'est un week-end
      if (day === 0 || day === 6) {
        weekends.push(`${joursSemaine[day]} ${dateKey}`)
      }
      current.setDate(current.getDate() + 1)
    }
    return { weekends, holidays }
  }

  const eventsList =
    context.events.length > 0
      ? context.events
          .map((e) => {
            const start = new Date(e.startDate)
            const end = new Date(e.endDate)
            const { weekends, holidays } = getSpecialDaysInRange(start, end)
            let warnings = ""
            if (holidays.length > 0) {
              warnings += ` ⚠️ INCLUT JOUR(S) FÉRIÉ(S): ${holidays.join(", ")}`
            }
            if (weekends.length > 0) {
              warnings += ` ⚠️ INCLUT WEEK-END(S): ${weekends.join(", ")}`
            }
            return `- [id: ${e.id}] "${e.title}" du ${joursSemaine[start.getDay()]} ${formatDateKey(start)} au ${joursSemaine[end.getDay()]} ${formatDateKey(end)}${e.eventType ? ` (type: ${e.eventType.name})` : ""}${warnings}`
          })
          .join("\n")
      : "Aucun événement"

  const typesList =
    context.eventTypes.length > 0
      ? context.eventTypes.map((t) => `- ${t.name} (${t.color})`).join("\n")
      : "Aucun type défini"

  const todayDayOfWeek = joursSemaine[context.today.getDay()]

  // Générer un calendrier de référence pour les 12 prochains mois
  function generateCalendarReference(): string {
    const months = ["janvier", "février", "mars", "avril", "mai", "juin",
                    "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
    const lines: string[] = []

    const startDate = new Date(context.today)
    startDate.setDate(1) // Premier du mois actuel

    for (let i = 0; i < 14; i++) { // 14 mois pour couvrir l'année suivante
      const year = startDate.getFullYear()
      const month = startDate.getMonth()
      const firstDay = new Date(year, month, 1)
      const firstDayOfWeek = joursSemaine[firstDay.getDay()]

      // Trouver tous les lundis, vendredis et samedis du mois
      const mondays: number[] = []
      const fridays: number[] = []
      const saturdays: number[] = []
      const current = new Date(year, month, 1)
      while (current.getMonth() === month) {
        if (current.getDay() === 1) mondays.push(current.getDate())
        if (current.getDay() === 5) fridays.push(current.getDate())
        if (current.getDay() === 6) saturdays.push(current.getDate())
        current.setDate(current.getDate() + 1)
      }

      lines.push(`${months[month]} ${year}: 1er = ${firstDayOfWeek}, lundis = ${mondays.join(", ")}, vendredis = ${fridays.join(", ")}, samedis = ${saturdays.join(", ")}`)

      startDate.setMonth(startDate.getMonth() + 1)
    }

    return lines.join("\n")
  }

  const calendarReference = generateCalendarReference()

  return `Tu es un assistant de planification de calendrier. Tu reçois des instructions en langage naturel pour créer, modifier ou supprimer des événements.

CONTEXTE ACTUEL :
- Date du jour : ${todayDayOfWeek} ${formatDateKey(context.today)}
- Année en cours : ${context.today.getFullYear()}
- Zone scolaire : ${context.schoolZone}

CALENDRIER DE RÉFÉRENCE - OBLIGATOIRE À UTILISER :
${calendarReference}

⚠️ IMPORTANT : Tu DOIS utiliser ce calendrier de référence pour déterminer les dates. N'utilise JAMAIS ta propre estimation des jours de la semaine car elle est souvent incorrecte. Par exemple, pour "le 2ème vendredi de janvier 2026", regarde la ligne "janvier 2026" ci-dessus et prends le 2ème nombre dans la liste des vendredis.

ÉVÉNEMENTS EXISTANTS :
${eventsList}

TYPES D'ÉVÉNEMENTS DISPONIBLES :
${typesList}

JOURS FÉRIÉS FRANÇAIS :
${holidaysList}

VACANCES SCOLAIRES (zone ${context.schoolZone}) :
${schoolHolidaysList}

RÈGLES PAR DÉFAUT :
- Les événements sont placés du lundi au vendredi sauf instruction contraire
- Éviter les jours fériés sauf demande explicite
- Prendre en compte les vacances scolaires dans la planification
- "Semaine" = 5 jours ouvrés (lundi-vendredi)
- "Quinzaine" = 2 semaines
- Si aucune année n'est précisée, utiliser l'année en cours ou l'année prochaine si la date est passée

IMPORTANT - ÉVÉNEMENTS MULTI-JOURS, WEEK-ENDS ET JOURS FÉRIÉS :
- Un événement avec startDate et endDate s'affiche sur TOUS les jours entre ces deux dates, Y COMPRIS les week-ends et jours fériés
- Les événements marqués avec ⚠️ contiennent des jours spéciaux qu'il faut potentiellement découper
- Exemple : un événement du lundi 2 mars au mercredi 11 mars apparaît AUSSI le samedi 7 et dimanche 8 mars

Pour "retirer les week-ends" ou "exclure les jours fériés" :
- Tu dois DÉCOUPER l'événement en plusieurs segments qui évitent ces jours
- Exemple "Formation" du 2 au 11 mars → découper en : "Formation" du 2 au 6 mars (avant le WE) + "Formation" du 9 au 11 mars (après le WE)
- Exemple "Pont Ascension" du 14 au 18 mai (inclut Ascension le 14) → découper en : "Pont Ascension" du 15 au 18 mai
- Pour découper : créer les nouveaux segments avec "create" ET supprimer l'événement original avec "delete"

INTERPRÉTATION DES DATES :
- "début janvier" = 1er-10 janvier
- "mi-janvier" = 10-20 janvier
- "fin janvier" = 20-31 janvier
- "semaine du 15" = du lundi de la semaine contenant le 15 au vendredi
- "3 semaines avant X" = calculer la date
- "après les vacances de février" = utiliser les dates des vacances scolaires ci-dessus
- "pendant les vacances de X" = utiliser les dates des vacances scolaires ci-dessus

INSTRUCTIONS :
1. Interprète la demande utilisateur avec précision
2. UTILISE OBLIGATOIREMENT les outils de calcul de dates fournis pour déterminer les dates exactes. Ne devine JAMAIS une date de tête car tu fais souvent des erreurs sur les jours de la semaine.
   - Pour "le 2ème vendredi de janvier 2026" → utilise get_nth_weekday_of_month
   - Pour "3 semaines avant le 15 mars" → utilise get_relative_date
   - Pour vérifier quel jour tombe une date → utilise get_day_of_week
3. Crée/modifie les types d'événements si nécessaire
4. Retourne UNIQUEMENT un JSON valide, sans texte avant ou après

FORMAT DE RÉPONSE (JSON uniquement, pas de markdown) :
{
  "interpretation": "Explication claire de ce que tu as compris et des actions que tu vas effectuer",
  "actions": [
    {
      "action": "create",
      "event": {
        "title": "Titre de l'événement",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "eventType": "nom du type (optionnel)"
      }
    },
    {
      "action": "update",
      "event": {
        "id": "id de l'événement existant (OBLIGATOIRE pour update)",
        "title": "Nouveau titre",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "eventType": "nom du type (optionnel)"
      }
    },
    {
      "action": "delete",
      "event": {
        "id": "id de l'événement à supprimer (OBLIGATOIRE pour delete)",
        "title": "titre pour référence"
      }
    }
  ],
  "newEventTypes": [
    { "name": "Nouveau type", "suggestedColor": "#3b82f6" }
  ],
  "warnings": ["Avertissement si conflit ou ambiguïté"],
  "questions": ["Question si clarification nécessaire"]
}`
}

export async function interpretPrompt(
  userPrompt: string,
  context: PromptContext
): Promise<PromptResult> {
  const systemPrompt = buildSystemPrompt(context)

  // Messages pour la conversation avec Claude
  const messages: MessageParam[] = [
    {
      role: "user",
      content: userPrompt,
    },
  ]

  // Boucle pour gérer les appels d'outils
  let maxIterations = 10 // Sécurité pour éviter les boucles infinies
  let iteration = 0

  while (iteration < maxIterations) {
    iteration++

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: systemPrompt,
      tools: dateTools,
      messages,
    })

    // Vérifier si la réponse a été tronquée
    if (response.stop_reason === "max_tokens") {
      console.error("Response was truncated due to max_tokens")
      return {
        interpretation: "La réponse a été tronquée car elle était trop longue.",
        actions: [],
        newEventTypes: [],
        warnings: ["Essayez de diviser votre demande en plusieurs instructions plus courtes."],
        questions: [],
      }
    }

    // Si Claude a fini (end_turn), extraire le JSON
    if (response.stop_reason === "end_turn") {
      const textContent = response.content.find((c) => c.type === "text")
      if (!textContent || textContent.type !== "text") {
        return {
          interpretation: "Pas de réponse textuelle de Claude.",
          actions: [],
          newEventTypes: [],
          warnings: ["Erreur inattendue."],
          questions: [],
        }
      }

      return parseJsonResponse(textContent.text)
    }

    // Si Claude veut utiliser des outils
    if (response.stop_reason === "tool_use") {
      // Ajouter la réponse de Claude aux messages
      messages.push({
        role: "assistant",
        content: response.content as ContentBlockParam[],
      })

      // Exécuter chaque outil demandé
      const toolResults: ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type === "tool_use") {
          console.log(`Executing tool: ${block.name}`, block.input)
          const result = executeDateTool(block.name, block.input as Record<string, unknown>)
          console.log(`Tool result:`, result)

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          })
        }
      }

      // Ajouter les résultats des outils aux messages
      messages.push({
        role: "user",
        content: toolResults,
      })

      // Continuer la boucle pour obtenir la réponse finale
      continue
    }

    // Cas inattendu
    console.error("Unexpected stop_reason:", response.stop_reason)
    break
  }

  return {
    interpretation: "Erreur: trop d'itérations ou cas inattendu.",
    actions: [],
    newEventTypes: [],
    warnings: ["Une erreur s'est produite lors du traitement."],
    questions: [],
  }
}

function parseJsonResponse(text: string): PromptResult {
  try {
    // Parse JSON response - extraire le JSON même s'il est entouré de markdown
    let jsonText = text
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }
    const firstBrace = jsonText.indexOf("{")
    const lastBrace = jsonText.lastIndexOf("}")
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1)
    }

    // Vérifier que le JSON semble complet (se termine par })
    if (!jsonText.trim().endsWith("}")) {
      console.error("JSON appears truncated, last chars:", jsonText.slice(-100))
      return {
        interpretation: "La réponse semble incomplète.",
        actions: [],
        newEventTypes: [],
        warnings: ["La réponse de l'IA a été tronquée. Essayez une demande plus courte."],
        questions: [],
      }
    }

    const result = JSON.parse(jsonText) as PromptResult
    return result
  } catch (parseError) {
    // Log pour debug
    console.error("JSON parse error:", parseError)
    console.error("Raw response (first 1000 chars):", text.substring(0, 1000))
    console.error("Raw response (last 500 chars):", text.slice(-500))
    // If JSON parsing fails, return a structured error
    return {
      interpretation: "Je n'ai pas pu interpréter correctement la demande.",
      actions: [],
      newEventTypes: [],
      warnings: ["Erreur lors de l'analyse de la réponse. Essayez de simplifier votre demande."],
      questions: [],
    }
  }
}

export function getPromptContext(
  events: CalendarEvent[],
  eventTypes: EventType[],
  schoolZone: SchoolZone = "B"
): PromptContext {
  const today = new Date()
  const currentYear = today.getFullYear()

  return {
    today,
    events,
    eventTypes,
    holidays: [
      ...getFrenchHolidays(currentYear),
      ...getFrenchHolidays(currentYear + 1),
    ],
    schoolHolidays: getSchoolHolidaysForRange(currentYear, currentYear + 1, schoolZone),
    schoolZone,
  }
}
