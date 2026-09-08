"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { GraduationCap, Building2, Calendar, Send, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select"
import { DIVISIONS, type Division } from "@/lib/csec-data"

const DEPARTMENTS = [
  "Software Engineering",
  "Computer Science",
  "Information Technology",
  "Electrical Engineering",
  "Electronics & Communication Engineering",
  "Applied Mathematics",
  "Mechanical Engineering",
]

const JOINING_YEARS = [2026, 2025, 2024, 2023, 2022, 2021]

export default function OnboardingPage() {
  const router = useRouter()
  const [department, setDepartment] = useState("")
  const [joiningYear, setJoiningYear] = useState("2026")
  const [division, setDivision] = useState<Division>("Development")
  const [telegram, setTelegram] = useState("")
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!department) {
      toast.error("Please select your academic department.")
      return
    }

    setLoading(true)
    setTimeout(() => {
      toast.success("Welcome to CSEC ASTU!", {
        description: "Your profile has been created with a +50 pts starting buffer.",
      })
      router.push("/dashboard")
    }, 600)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F0F12] text-zinc-900 dark:text-zinc-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white dark:bg-zinc-50 dark:text-zinc-900 shadow-md">
          CS
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Welcome to CSEC ASTU
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Complete your member profile to initialize your +50 pts loss-aversion buffer.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="rounded-2xl border border-zinc-200 bg-white/80 p-8 backdrop-blur shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Division Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Building2 className="h-4 w-4 text-zinc-500" />
                Assigned / Preferred Division <span className="text-red-500">*</span>
              </Label>
              <Select value={division} onValueChange={(val) => setDivision(val as Division)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a division" />
                </SelectTrigger>
                <SelectContent>
                  {DIVISIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Your primary technical track in CSEC ASTU.
              </p>
            </div>

            {/* Academic Department */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <GraduationCap className="h-4 w-4 text-zinc-500" />
                Academic Department <span className="text-red-500">*</span>
              </Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your department at ASTU" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Joining Year */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Calendar className="h-4 w-4 text-zinc-500" />
                Year Joined ASTU / CSEC <span className="text-red-500">*</span>
              </Label>
              <Select value={joiningYear} onValueChange={setJoiningYear}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOINING_YEARS.map((yr) => (
                    <SelectItem key={yr} value={String(yr)}>
                      {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Telegram Username */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Send className="h-4 w-4 text-zinc-500" />
                Telegram Handle <span className="text-xs text-zinc-400 font-normal">(optional)</span>
              </Label>
              <Input
                placeholder="@username"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
              />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Used for notification handshake and duty digests.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="font-semibold">+50 Initial Buffer</span>: You start with 50 points on the ledger. Keep your standing high by fulfilling assigned duties.
                </div>
              </div>
            </div>

            <Button type="submit" disabled={loading || !department} className="w-full py-5 rounded-xl text-sm font-medium">
              {loading ? "Creating Profile..." : "Complete Onboarding & Enter Platform"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
