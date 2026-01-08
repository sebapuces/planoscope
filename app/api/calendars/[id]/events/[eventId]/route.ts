import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// PUT /api/calendars/[id]/events/[eventId] - Modifier un événement
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id: calendarId, eventId } = await params
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

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event || event.calendarId !== calendarId) {
    return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 })
  }

  try {
    const body = await req.json()

    // Construire les données à mettre à jour (mise à jour partielle)
    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate)
    if (body.eventTypeId !== undefined) data.eventTypeId = body.eventTypeId || null
    if (body.color !== undefined) data.color = body.color || null
    if (body.notes !== undefined) data.notes = body.notes

    const updated = await prisma.event.update({
      where: { id: eventId },
      data,
      include: { eventType: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating event:", error)
    return NextResponse.json(
      { error: "Erreur lors de la modification" },
      { status: 500 }
    )
  }
}

// DELETE /api/calendars/[id]/events/[eventId] - Supprimer un événement
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { id: calendarId, eventId } = await params
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

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event || event.calendarId !== calendarId) {
    return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 })
  }

  await prisma.event.delete({ where: { id: eventId } })

  return NextResponse.json({ success: true })
}
