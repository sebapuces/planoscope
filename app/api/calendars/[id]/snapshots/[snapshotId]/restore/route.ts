import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

interface SnapshotState {
  events: Array<{
    id: string
    title: string
    startDate: string
    endDate: string
    eventTypeId: string | null
  }>
  eventTypes: Array<{
    id: string
    name: string
    color: string
  }>
}

// POST /api/calendars/[id]/snapshots/[snapshotId]/restore - Restaurer un snapshot
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; snapshotId: string }> }
) {
  const { id: calendarId, snapshotId } = await params
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

  const snapshot = await prisma.calendarState.findUnique({
    where: { id: snapshotId },
    include: { prompt: true },
  })

  if (!snapshot || snapshot.calendarId !== calendarId) {
    return NextResponse.json({ error: "Snapshot non trouvé" }, { status: 404 })
  }

  try {
    const state: SnapshotState = JSON.parse(snapshot.stateJson)

    // Supprimer tous les événements actuels
    await prisma.event.deleteMany({
      where: { calendarId },
    })

    // Supprimer les types d'événements qui ne sont pas dans le snapshot
    const snapshotTypeIds = state.eventTypes.map((t) => t.id)
    await prisma.eventType.deleteMany({
      where: {
        calendarId,
        id: { notIn: snapshotTypeIds },
      },
    })

    // Restaurer/mettre à jour les types d'événements
    for (const eventType of state.eventTypes) {
      await prisma.eventType.upsert({
        where: { id: eventType.id },
        update: { name: eventType.name, color: eventType.color },
        create: {
          id: eventType.id,
          calendarId,
          name: eventType.name,
          color: eventType.color,
        },
      })
    }

    // Restaurer les événements
    for (const event of state.events) {
      await prisma.event.create({
        data: {
          calendarId,
          title: event.title,
          startDate: new Date(event.startDate),
          endDate: new Date(event.endDate),
          eventTypeId: event.eventTypeId,
        },
      })
    }

    // Récupérer les données restaurées
    const restoredEvents = await prisma.event.findMany({
      where: { calendarId },
      include: { eventType: true },
      orderBy: { startDate: "asc" },
    })

    const restoredTypes = await prisma.eventType.findMany({
      where: { calendarId },
    })

    return NextResponse.json({
      message: "Snapshot restauré avec succès",
      events: restoredEvents,
      eventTypes: restoredTypes,
      snapshotName: snapshot.prompt?.snapshotName,
    })
  } catch (error) {
    console.error("Error restoring snapshot:", error)
    return NextResponse.json(
      { error: "Erreur lors de la restauration du snapshot" },
      { status: 500 }
    )
  }
}
