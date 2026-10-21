"use client"

import { Mail, MapPin, Send, CheckCircle2 } from "lucide-react"
import { useReveal } from "@/hooks/use-reveal"
import { useState, type FormEvent } from "react"
import { CLUB } from "@/lib/club-content"

export function ContactSection({ isActive }: { isActive?: boolean }) {
  const { ref, isVisible: revealVisible } = useReveal(0.15)
  const isVisible = isActive !== undefined ? isActive : revealVisible
  const [formData, setFormData] = useState({ name: "", email: "", message: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.message) {
      return
    }

    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 800))

    setIsSubmitting(false)
    setSubmitSuccess(true)
    setFormData({ name: "", email: "", message: "" })

    setTimeout(() => setSubmitSuccess(false), 5000)
  }

  return (
    <section
      id="community"
      ref={ref}
      className="relative w-full border-t border-zinc-800/80 bg-[#0B0C0E] px-6 py-24 md:px-12 md:py-32 lg:px-16"
    >
      <div id="contact" className="scroll-mt-24" />

      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16 items-start">
          {/* Left Column: Clean Typographic Info (No Cluttered Heavy Boxes) */}
          <div
            className={`lg:col-span-5 transition-all duration-700 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <div className="mb-2.5 text-xs font-mono font-medium text-violet-400">
              COMMUNITY &amp; CORRESPONDENCE
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl md:text-5xl">
              Connect with CSEC ASTU.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-400">
              We welcome university faculty, technology partners, contest sponsors, and prospective builders.
              Reach out directly or send our leadership a note below.
            </p>

            {/* Clean Typographic Metadata Strip */}
            <div className="mt-10 space-y-6 border-t border-zinc-800/80 pt-8">
              <div>
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-violet-400" />
                  Official Email
                </div>
                <a
                  href={CLUB.links.email}
                  className="mt-1.5 block text-base font-medium text-zinc-200 hover:text-white transition-colors"
                >
                  {CLUB.email}
                </a>
              </div>

              <div>
                <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-violet-400" />
                  Headquarters
                </div>
                <p className="mt-1.5 text-sm font-medium text-zinc-200">
                  {CLUB.university}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {CLUB.department} · {CLUB.city}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Clean, Uncrowded Inquiry Form */}
          <div
            className={`lg:col-span-7 transition-all duration-700 ${
              isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            <div className="rounded-xl border border-zinc-800/80 bg-[#111215]/60 p-7 md:p-9 backdrop-blur-sm">
              <div className="border-b border-zinc-800/80 pb-5">
                <h3 className="text-lg font-semibold text-zinc-100">Send an Inquiry</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Technical workshops, hackathon sponsorships, or guild questions.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1.5">Your Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="e.g. Dawit Alemayehu"
                      className="w-full rounded-md border border-zinc-800 bg-[#0A0B0D] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-zinc-400 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="name@astu.edu.et"
                      className="w-full rounded-md border border-zinc-800 bg-[#0A0B0D] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">Message</label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    placeholder="Tell us about your project, workshop inquiry, or idea..."
                    className="w-full rounded-md border border-zinc-800 bg-[#0A0B0D] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-zinc-100 px-6 py-2.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSubmitting ? "Dispatching..." : "Submit Message"}
                  </button>

                  {submitSuccess && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Thank you. Your message has been sent.</span>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
