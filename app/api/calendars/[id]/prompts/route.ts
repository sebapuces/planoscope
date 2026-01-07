import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  interpretPrompt,
  getPromptContext,
  PromptResult,
} from "@/lib/prompt-interpreter"

// GET /api/calendars/[id]/prompts - Liste des prompts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: calendarId } = await params
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const calendar = await prisma.calendar.findUnique({
    where: { id: calendarId },
  })

  if (!calendar || calendar.userId !== session.user.id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
  }

  const prompts = await prisma.prompt.findMany({
    where: { calendarId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(prompts)
}

// POST /api/calendars/[id]/prompts - Traiter un nouveau prompt
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
    const { content } = await req.json()

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Contenu du prompt requis" },
        { status: 400 }
      )
    }

    // Préparer le contexte pour l'interprétation
    const events = calendar.events.map((e) => ({
      ...e,
      startDate: e.startDate,
      endDate: e.endDate,
    }))

    const context = getPromptContext(events, calendar.eventTypes)

    // Interpréter le prompt avec Claude
    let result: PromptResult
    try {
      result = await interpretPrompt(content, context)
    } catch (error) {
      console.error("Error interpreting prompt:", error)
      return NextResponse.json(
        { error: "Erreur lors de l'interprétation du prompt" },
        { status: 500 }
      )
    }

    // Créer les nouveaux types d'événements si nécessaire
    const newTypeMap: Record<string, string> = {}
    for (const newType of result.newEventTypes) {
      const existing = await prisma.eventType.findUnique({
        where: { calendarId_name: { calendarId, name: newType.name } },
      })

      if (!existing) {
        const created = await prisma.eventType.create({
          data: {
            calendarId,
            name: newType.name,
            color: newType.suggestedColor,
          },
        })
        newTypeMap[newType.name] = created.id
      } else {
        newTypeMap[newType.name] = existing.id
      }
    }

    // Exécuter les actions
    const createdEvents = []
    const updatedEvents = []
    const deletedEventIds = []

    for (const action of result.actions) {
      if (action.action === "create") {
        // Trouver l'ID du type d'événement
        let eventTypeId: string | null = null
        if (action.event.eventType) {
          const existingType = calendar.eventTypes.find(
            (t) => t.name.toLowerCase() === action.event.eventType?.toLowerCase()
          )
          eventTypeId = existingType?.id || newTypeMap[action.event.eventType] || null
        }

        const event = await prisma.event.create({
          data: {
            calendarId,
            title: action.event.title,
            startDate: new Date(action.event.startDate),
            endDate: new Date(action.event.endDate),
            eventTypeId,
          },
          include: { eventType: true },
        })
        createdEvents.push(event)
      } else if (action.action === "update" && action.event.id) {
        let eventTypeId: string | null = null
        if (action.event.eventType) {
          const existingType = calendar.eventTypes.find(
            (t) => t.name.toLowerCase() === action.event.eventType?.toLowerCase()
          )
          eventTypeId = existingType?.id || newTypeMap[action.event.eventType] || null
        }

        const event = await prisma.event.update({
          where: { id: action.event.id },
          data: {
            title: action.event.title,
            startDate: new Date(action.event.startDate),
            endDate: new Date(action.event.endDate),
            eventTypeId,
          },
          include: { eventType: true },
        })
        updatedEvents.push(event)
      } else if (action.action === "delete" && action.event.id) {
        await prisma.event.delete({ where: { id: action.event.id } })
        deletedEventIds.push(action.event.id)
      }
    }

    // Sauvegarder le prompt dans l'historique
    const prompt = await prisma.prompt.create({
      data: {
        calendarId,
        content,
        interpretation: result.interpretation,
      },
    })

    // Récupérer les nouveaux types créés
    const newEventTypes = await prisma.eventType.findMany({
      where: {
        id: { in: Object.values(newTypeMap) },
      },
    })

    return NextResponse.json({
      prompt,
      result: {
        interpretation: result.interpretation,
        warnings: result.warnings,
        questions: result.questions,
      },
      createdEvents,
      updatedEvents,
      deletedEventIds,
      newEventTypes,
    })
  } catch (error) {
    console.error("Error processing prompt:", error)
    return NextResponse.json(
      { error: "Erreur lors du traitement du prompt" },
      { status: 500 }
    )
  }
}
