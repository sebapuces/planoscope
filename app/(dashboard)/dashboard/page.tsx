import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()

  const calendars = await prisma.calendar.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Planoscope</h1>
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Mes calendriers</h2>
          <p className="text-gray-600">Gérez vos calendriers et planifications</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {calendars.map((calendar) => (
            <a
              key={calendar.id}
              href={`/dashboard/calendar/${calendar.id}`}
              className="block p-6 bg-white rounded-lg border hover:border-blue-500 hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-lg">{calendar.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Créé le {new Date(calendar.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </a>
          ))}
        </div>

        {calendars.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border">
            <p className="text-gray-500">Aucun calendrier pour le moment.</p>
            <p className="text-sm text-gray-400 mt-1">
              Un calendrier sera créé automatiquement lors de l inscription.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
