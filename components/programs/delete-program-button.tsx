"use client"

import { T, useI18n } from "@/lib/i18n/context"


import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { deleteProgram } from "@/lib/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface DeleteProgramButtonProps {
  programId: string
  programName: string
}

export function DeleteProgramButton({ programId, programName }: DeleteProgramButtonProps) {
  const { t } = useI18n()
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteProgram(programId)
      if (result.success) {
        router.refresh()
      } else {
        console.error("Error deleting program:", result.error)
      }
    } catch (error) {
      console.error("Error deleting program:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label={t("Delete Program")}
          size="sm"
          variant="outline"
          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white bg-transparent"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-slate-800 border-slate-700">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white"><T text={"Delete Program"} /></AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300"><T text={"Are you sure you want to delete \""} />{programName}<T text={"\"? This action cannot be undone and will remove all associated exercises and workout sessions."} /></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-600 text-slate-300 hover:bg-slate-700"><T text={"Cancel"} /></AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <T>{isDeleting ? "Deleting..." : "Delete Program"}</T>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
