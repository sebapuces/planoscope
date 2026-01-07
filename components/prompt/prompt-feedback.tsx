"use client"

import { AlertCircle, CheckCircle2, HelpCircle } from "lucide-react"

interface PromptFeedbackProps {
  interpretation?: string
  warnings?: string[]
  questions?: string[]
  createdCount?: number
  updatedCount?: number
  deletedCount?: number
  onDismiss?: () => void
}

export function PromptFeedback({
  interpretation,
  warnings = [],
  questions = [],
  createdCount = 0,
  updatedCount = 0,
  deletedCount = 0,
  onDismiss,
}: PromptFeedbackProps) {
  if (!interpretation && warnings.length === 0 && questions.length === 0) {
    return null
  }

  const hasActions = createdCount > 0 || updatedCount > 0 || deletedCount > 0

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 space-y-3">
      {interpretation && (
        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-gray-700">{interpretation}</p>
            {hasActions && (
              <p className="text-xs text-gray-500 mt-1">
                {createdCount > 0 && `${createdCount} créé(s)`}
                {updatedCount > 0 &&
                  `${createdCount > 0 ? ", " : ""}${updatedCount} modifié(s)`}
                {deletedCount > 0 &&
                  `${createdCount > 0 || updatedCount > 0 ? ", " : ""}${deletedCount} supprimé(s)`}
              </p>
            )}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {warnings.map((warning, i) => (
              <p key={i} className="text-sm text-amber-700">
                {warning}
              </p>
            ))}
          </div>
        </div>
      )}

      {questions.length > 0 && (
        <div className="flex gap-3">
          <HelpCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {questions.map((question, i) => (
              <p key={i} className="text-sm text-blue-700">
                {question}
              </p>
            ))}
          </div>
        </div>
      )}

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Fermer
        </button>
      )}
    </div>
  )
}
