import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/calendars/[id]/events - Liste des événements
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

  const events = await prisma.event.findMany({
    where: { calendarId },
    include: { eventType: true },
    orderBy: { startDate: "asc" },
  })

  return NextResponse.json(events)
}

// POST /api/calendars/[id]/events - Créer un événement
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
    const { title, startDate, endDate, eventTypeId, color } = await req.json()

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Titre et dates requis" },
        { status: 400 }
      )
    }

    const event = await prisma.event.create({
      data: {
        calendarId,
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        eventTypeId: eventTypeId || null,
        color: color || null,
      },
      include: { eventType: true },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("Error creating event:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
