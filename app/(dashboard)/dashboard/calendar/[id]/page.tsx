import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarView } from "./calendar-view"

interface CalendarPageProps {
  params: Promise<{ id: string }>
}

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { id } = await params
  const session = await auth()

  const calendar = await prisma.calendar.findUnique({
    where: { id },
    include: {
      events: {
        orderBy: { startDate: "asc" },
        include: { eventType: true },
      },
    },
  })

  if (!calendar || calendar.userId !== session!.user.id) {
    notFound()
  }

  const events = calendar.events.map((event) => ({
    ...event,
    startDate: event.startDate,
    endDate: event.endDate,
    eventType: event.eventType,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← Retour
              </Button>
            </Link>
            <h1 className="text-xl font-bold">{calendar.name}</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session?.user?.email}
            </span>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <CalendarView
          calendarId={calendar.id}
          initialEvents={events}
        />
      </main>
    </div>
  )
}
