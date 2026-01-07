import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/calendars/[id]/snapshots - Liste des snapshots
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

  const snapshots = await prisma.calendarState.findMany({
    where: { calendarId },
    include: {
      prompt: {
        select: { content: true, snapshotName: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json(snapshots)
}

// POST /api/calendars/[id]/snapshots - Créer un snapshot manuellement
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
      rules: true,
    },
  })

  if (!calendar || calendar.userId !== session.user.id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
  }

  try {
    const { name } = await req.json()

    // Créer un prompt "vide" pour le snapshot nommé
    const prompt = await prisma.prompt.create({
      data: {
        calendarId,
        content: `Snapshot: ${name || "Sans nom"}`,
        snapshotName: name || `Snapshot ${new Date().toLocaleDateString("fr-FR")}`,
      },
    })

    // Créer le snapshot de l'état actuel
    const stateJson = JSON.stringify({
      events: calendar.events.map((e) => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate.toISOString(),
        eventTypeId: e.eventTypeId,
      })),
      eventTypes: calendar.eventTypes.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })),
      rules: calendar.rules.map((r) => ({
        id: r.id,
        description: r.description,
        ruleType: r.ruleType,
        parameters: r.parameters,
        isActive: r.isActive,
      })),
    })

    const snapshot = await prisma.calendarState.create({
      data: {
        calendarId,
        promptId: prompt.id,
        stateJson,
      },
      include: {
        prompt: {
          select: { content: true, snapshotName: true },
        },
      },
    })

    return NextResponse.json(snapshot, { status: 201 })
  } catch (error) {
    console.error("Error creating snapshot:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du snapshot" },
      { status: 500 }
    )
  }
}
