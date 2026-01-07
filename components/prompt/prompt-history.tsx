"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { MessageSquare, RotateCcw, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Prompt {
  id: string
  content: string
  interpretation: string | null
  snapshotName?: string | null
  createdAt: Date
}

interface Snapshot {
  id: string
  createdAt: Date
  prompt?: {
    content: string
    snapshotName: string | null
  }
}

interface PromptHistoryProps {
  prompts: Prompt[]
  snapshots: Snapshot[]
  calendarId: string
  onRestore: (snapshotId: string) => Promise<void>
  onCreateSnapshot: (name: string) => Promise<void>
}

export function PromptHistory({
  prompts,
  snapshots,
  calendarId,
  onRestore,
  onCreateSnapshot,
}: PromptHistoryProps) {
  const [snapshotName, setSnapshotName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  async function handleCreateSnapshot() {
    if (!snapshotName.trim()) return
    setIsCreating(true)
    try {
      await onCreateSnapshot(snapshotName.trim())
      setSnapshotName("")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRestore(snapshotId: string) {
    setRestoringId(snapshotId)
    try {
      await onRestore(snapshotId)
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Créer un snapshot */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Nom du point de sauvegarde..."
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateSnapshot()}
            className="text-sm h-8"
          />
          <Button
            size="sm"
            onClick={handleCreateSnapshot}
            disabled={!snapshotName.trim() || isCreating}
            className="h-8 px-2"
          >
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Liste des snapshots */}
      {snapshots.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Sauvegardes
          </p>
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="flex items-center justify-between p-2 rounded border bg-amber-50/50 border-amber-200"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-amber-900 truncate">
                  {snapshot.prompt?.snapshotName || "Sans nom"}
                </p>
                <p className="text-[10px] text-amber-600">
                  {formatDistanceToNow(new Date(snapshot.createdAt), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRestore(snapshot.id)}
                disabled={restoringId === snapshot.id}
                className="h-7 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                title="Restaurer cette version"
              >
                {restoringId === snapshot.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Liste des prompts */}
      {prompts.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Historique
          </p>
          {prompts.filter(p => !p.snapshotName).map((prompt) => (
            <div
              key={prompt.id}
              className="p-2 rounded border text-left hover:bg-gray-50"
            >
              <p className="text-xs text-gray-700 line-clamp-2">
                {prompt.content}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                {formatDistanceToNow(new Date(prompt.createdAt), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {prompts.length === 0 && snapshots.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Aucun historique</p>
        </div>
      )}
    </div>
  )
}
