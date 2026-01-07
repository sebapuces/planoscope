import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// GET /api/calendars - Liste des calendriers de l'utilisateur
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const calendars = await prisma.calendar.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(calendars)
}

// POST /api/calendars - Créer un nouveau calendrier
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const { name } = await req.json()

    if (!name) {
      return NextResponse.json({ error: "Nom requis" }, { status: 400 })
    }

    const calendar = await prisma.calendar.create({
      data: {
        name,
        userId: session.user.id,
      },
    })

    return NextResponse.json(calendar, { status: 201 })
  } catch (error) {
    console.error("Error creating calendar:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
