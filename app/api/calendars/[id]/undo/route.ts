import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// POST /api/calendars/[id]/undo - Annuler le dernier prompt
export async function POST(
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

  try {
    // Trouver le dernier prompt qui a des événements associés
    const lastPromptWithEvents = await prisma.prompt.findFirst({
      where: {
        calendarId,
        events: { some: {} },
      },
      orderBy: { createdAt: "desc" },
      include: {
        events: true,
      },
    })

    if (!lastPromptWithEvents) {
      return NextResponse.json(
        { error: "Aucune action à annuler" },
        { status: 400 }
      )
    }

    // Supprimer les événements créés par ce prompt
    const deletedEventIds = lastPromptWithEvents.events.map((e) => e.id)

    await prisma.event.deleteMany({
      where: {
        id: { in: deletedEventIds },
      },
    })

    // Supprimer le prompt
    await prisma.prompt.delete({
      where: { id: lastPromptWithEvents.id },
    })

    // Récupérer l'état actuel du calendrier
    const updatedCalendar = await prisma.calendar.findUnique({
      where: { id: calendarId },
      include: {
        events: { include: { eventType: true } },
        eventTypes: true,
      },
    })

    return NextResponse.json({
      success: true,
      undonePrompt: lastPromptWithEvents,
      deletedEventIds,
      currentEvents: updatedCalendar?.events || [],
      currentEventTypes: updatedCalendar?.eventTypes || [],
    })
  } catch (error) {
    console.error("Error undoing:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'annulation" },
      { status: 500 }
    )
  }
}
