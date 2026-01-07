import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/calendars/[id] - Récupérer un calendrier
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const calendar = await prisma.calendar.findUnique({
    where: { id },
    include: {
      events: { include: { eventType: true } },
      eventTypes: true,
    },
  })

  if (!calendar || calendar.userId !== session.user.id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
  }

  return NextResponse.json(calendar)
}

// PUT /api/calendars/[id] - Modifier un calendrier
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const calendar = await prisma.calendar.findUnique({ where: { id } })
  if (!calendar || calendar.userId !== session.user.id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
  }

  try {
    const { name } = await req.json()

    const updated = await prisma.calendar.update({
      where: { id },
      data: { name },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error updating calendar:", error)
    return NextResponse.json(
      { error: "Erreur lors de la modification" },
      { status: 500 }
    )
  }
}

// DELETE /api/calendars/[id] - Supprimer un calendrier
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const calendar = await prisma.calendar.findUnique({ where: { id } })
  if (!calendar || calendar.userId !== session.user.id) {
    return NextResponse.json({ error: "Non trouvé" }, { status: 404 })
  }

  await prisma.calendar.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
