import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// PATCH /api/calendars/[id]/types/[typeId] - Modifier un type d'événement
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; typeId: string }> }
) {
  const { id: calendarId, typeId } = await params
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

    // Vérifier que le type existe
    const existing = await prisma.eventType.findUnique({
      where: { id: typeId },
    })

    if (!existing || existing.calendarId !== calendarId) {
      return NextResponse.json({ error: "Type non trouvé" }, { status: 404 })
    }

    // Si on change le nom, vérifier qu'il n'existe pas déjà
    if (name && name !== existing.name) {
      const duplicate = await prisma.eventType.findUnique({
        where: { calendarId_name: { calendarId, name } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: "Un type avec ce nom existe déjà" },
          { status: 400 }
        )
      }
    }

    const eventType = await prisma.eventType.update({
      where: { id: typeId },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
    })

    return NextResponse.json(eventType)
  } catch (error) {
    console.error("Error updating event type:", error)
    return NextResponse.json(
      { error: "Erreur lors de la modification" },
      { status: 500 }
    )
  }
}

// DELETE /api/calendars/[id]/types/[typeId] - Supprimer un type d'événement
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; typeId: string }> }
) {
  const { id: calendarId, typeId } = await params
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
    const existing = await prisma.eventType.findUnique({
      where: { id: typeId },
    })

    if (!existing || existing.calendarId !== calendarId) {
      return NextResponse.json({ error: "Type non trouvé" }, { status: 404 })
    }

    // Mettre à null les events qui utilisent ce type
    await prisma.event.updateMany({
      where: { eventTypeId: typeId },
      data: { eventTypeId: null },
    })

    await prisma.eventType.delete({
      where: { id: typeId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting event type:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
