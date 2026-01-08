import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// POST /api/calendars/[id]/events/reorder - Réordonner les événements
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
    const { eventIds } = await req.json()

    if (!Array.isArray(eventIds)) {
      return NextResponse.json(
        { error: "eventIds doit être un tableau" },
        { status: 400 }
      )
    }

    // Mettre à jour l'ordre de chaque événement
    const updates = eventIds.map((eventId: string, index: number) =>
      prisma.event.update({
        where: { id: eventId },
        data: { order: index },
      })
    )

    await prisma.$transaction(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering events:", error)
    return NextResponse.json(
      { error: "Erreur lors du réordonnancement" },
      { status: 500 }
    )
  }
}
