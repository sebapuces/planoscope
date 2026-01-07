import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { anthropic } from "@/lib/claude"
import { formatDateKey } from "@/lib/calendar-utils"
import { getFrenchHolidays } from "@/lib/holidays"

interface EventInput {
  id: string
  title: string
  notes?: string | null
  startDate: Date | string
  endDate: Date | string
  eventType?: { name: string; color: string } | null
}

// POST /api/calendars/[id]/synthesis - Appliquer les modifications de synthèse
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: calendarId } = await params
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const calendar = await prisma.calendar.findUnique({
    where: { id: calendarId },
    include: {
      events: { include: { eventType: true } },
      eventTypes: true,
    },
  })

  if (!calendar || calendar.userId !== session.user.id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
  }

  try {
    const { currentEvents, synthesisText } = await req.json()

    // Construire le contexte pour Claude
    const joursSemaine = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]

    // Récupérer les jours fériés pour 2026 et 2027
    const holidays = [...getFrenchHolidays(2026), ...getFrenchHolidays(2027)]
    const holidayDates = new Set(holidays.map(h => formatDateKey(h.date)))
    const holidayNames = new Map(holidays.map(h => [formatDateKey(h.date), h.name]))

    // Fonction pour analyser les jours spéciaux couverts par un événement
    function getSpecialDaysInRange(start: Date, end: Date): { weekends: string[], holidays: string[] } {
      const weekends: string[] = []
      const foundHolidays: string[] = []
      const current = new Date(start)
      current.setHours(0, 0, 0, 0)
      const endDate = new Date(end)
      endDate.setHours(0, 0, 0, 0)

      while (current <= endDate) {
        const dateKey = formatDateKey(current)
        const day = current.getDay()

        // Vérifier si c'est un jour férié
        if (holidayDates.has(dateKey)) {
          foundHolidays.push(`${holidayNames.get(dateKey)} (${dateKey})`)
        }
        // Vérifier si c'est un week-end
        if (day === 0 || day === 6) {
          weekends.push(`${joursSemaine[day]} ${dateKey}`)
        }
        current.setDate(current.getDate() + 1)
      }
      return { weekends, holidays: foundHolidays }
    }

    const currentEventsText = (currentEvents as EventInput[])
      .map((e) => {
        const start = new Date(e.startDate)
        const end = new Date(e.endDate)
        const jourDebut = joursSemaine[start.getDay()]
        const jourFin = joursSemaine[end.getDay()]
        const { weekends, holidays: foundHolidays } = getSpecialDaysInRange(start, end)
        let warnings = ""
        if (foundHolidays.length > 0) {
          warnings += ` ⚠️ INCLUT JOUR(S) FÉRIÉ(S): ${foundHolidays.join(", ")}`
        }
        if (weekends.length > 0) {
          warnings += ` ⚠️ INCLUT WEEK-END(S): ${weekends.join(", ")}`
        }
        return `[id:${e.id}] ${e.title} | ${jourDebut} ${formatDateKey(start)} → ${jourFin} ${formatDateKey(end)} | type: ${e.eventType?.name || "aucun"}${warnings}`
      })
      .join("\n")

    const typesText = calendar.eventTypes
      .map((t) => `- ${t.name} (${t.color})`)
      .join("\n")

    const systemPrompt = `Tu es un assistant qui modifie un calendrier selon les instructions de l'utilisateur.

ÉTAT ACTUEL DU CALENDRIER :
${currentEventsText || "Aucun événement"}

TYPES D'ÉVÉNEMENTS DISPONIBLES :
${typesText || "Aucun type"}

RÈGLES :
1. Les dates sont en français. Année par défaut : 2026.
2. Pour SUPPRIMER : action "delete" avec l'id exact
3. Pour MODIFIER : action "update" avec l'id exact
4. Pour CRÉER : action "create" (sans id)

CAS SPÉCIAL - EXCLURE LES WEEK-ENDS ET/OU JOURS FÉRIÉS :
IMPORTANT : Les événements marqués avec ⚠️ contiennent des jours spéciaux (week-ends ou fériés) qu'il faut découper si demandé.

Si l'utilisateur demande de "retirer/exclure les week-ends" ou "ne pas travailler le week-end" :
→ DÉCOUPER les événements multi-jours qui chevauchent des week-ends.
Exemple : "Formation" du lundi 2 au mercredi 11 mars contient le week-end du 7-8.
→ Génère : 1 delete (l'original) + 2 create ("Formation" 2-6 mars ET "Formation" 9-11 mars)

Si l'utilisateur demande de "retirer/exclure les jours fériés" :
→ DÉCOUPER les événements multi-jours qui chevauchent des jours fériés.
Exemple : "Pont de l'Ascension" du jeudi 14 au lundi 18 mai contient l'Ascension (14 mai).
→ Génère : 1 delete (l'original) + 1 create ("Pont de l'Ascension" 15-18 mai)

Pour chaque événement à découper :
- Supprime l'événement original (action: delete)
- Crée de nouveaux événements pour chaque segment de jours ouvrés (action: create)
- Samedi = jour où la semaine se termine, Dimanche = jour avant lundi

RÉPONDS UNIQUEMENT EN JSON :
{
  "interpretation": "Description claire de ce que tu fais",
  "actions": [
    {
      "action": "create" | "update" | "delete",
      "event": {
        "id": "OBLIGATOIRE pour update/delete",
        "title": "titre",
        "notes": "notes (optionnel)",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD",
        "eventType": "nom du type (optionnel)"
      }
    }
  ],
  "newEventTypes": []
}`

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Voici la nouvelle synthèse du calendrier :\n\n${synthesisText}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== "text") {
      throw new Error("Unexpected response type")
    }

    let result
    try {
      // Extraire le JSON même s'il est entouré de markdown
      let jsonText = content.text
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim()
      }
      // Ou trouver le premier { et le dernier }
      const firstBrace = jsonText.indexOf("{")
      const lastBrace = jsonText.lastIndexOf("}")
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1)
      }
      result = JSON.parse(jsonText)
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Raw text:", content.text)
      return NextResponse.json(
        { error: "Erreur d'interprétation de la réponse" },
        { status: 500 }
      )
    }

    // Créer les nouveaux types d'événements
    const newTypeMap: Record<string, string> = {}
    for (const newType of result.newEventTypes || []) {
      const existing = await prisma.eventType.findUnique({
        where: { calendarId_name: { calendarId, name: newType.name } },
      })

      if (!existing) {
        const created = await prisma.eventType.create({
          data: {
            calendarId,
            name: newType.name,
            color: newType.suggestedColor || "#3b82f6",
          },
        })
        newTypeMap[newType.name] = created.id
      } else {
        newTypeMap[newType.name] = existing.id
      }
    }

    // Appliquer les actions
    for (const action of result.actions || []) {
      let eventTypeId: string | null = null
      if (action.event.eventType) {
        const existingType = calendar.eventTypes.find(
          (t) => t.name.toLowerCase() === action.event.eventType.toLowerCase()
        )
        eventTypeId = existingType?.id || newTypeMap[action.event.eventType] || null
      }

      if (action.action === "create") {
        await prisma.event.create({
          data: {
            calendarId,
            title: action.event.title,
            notes: action.event.notes || null,
            startDate: new Date(action.event.startDate),
            endDate: new Date(action.event.endDate),
            eventTypeId,
          },
        })
      } else if (action.action === "update" && action.event.id) {
        await prisma.event.update({
          where: { id: action.event.id },
          data: {
            title: action.event.title,
            notes: action.event.notes || null,
            startDate: new Date(action.event.startDate),
            endDate: new Date(action.event.endDate),
            eventTypeId,
          },
        })
      } else if (action.action === "delete" && action.event.id) {
        await prisma.event.delete({
          where: { id: action.event.id },
        })
      }
    }

    // Récupérer l'état final
    const updatedEvents = await prisma.event.findMany({
      where: { calendarId },
      include: { eventType: true },
      orderBy: { startDate: "asc" },
    })

    return NextResponse.json({
      interpretation: result.interpretation,
      events: updatedEvents,
    })
  } catch (error) {
    console.error("Error processing synthesis:", error)
    return NextResponse.json(
      { error: "Erreur lors du traitement de la synthèse" },
      { status: 500 }
    )
  }
}
