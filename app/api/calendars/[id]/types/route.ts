import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/calendars/[id]/types - Liste des types d'événements
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

  const eventTypes = await prisma.eventType.findMany({
    where: { calendarId },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(eventTypes)
}

// POST /api/calendars/[id]/types - Créer un type d'événement
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
  })

  if (!calendar || calendar.userId !== session.user.id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
  }

  try {
    const { name, color } = await req.json()

    if (!name || !color) {
      return NextResponse.json(
        { error: "Nom et couleur requis" },
        { status: 400 }
      )
    }

    // Vérifier si un type avec ce nom existe déjà
    const existing = await prisma.eventType.findUnique({
      where: { calendarId_name: { calendarId, name } },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Un type avec ce nom existe déjà" },
        { status: 400 }
      )
    }

    const eventType = await prisma.eventType.create({
      data: {
        calendarId,
        name,
        color,
      },
    })

    return NextResponse.json(eventType, { status: 201 })
  } catch (error) {
    console.error("Error creating event type:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
