"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Loader2, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import { ApiError, eventsService } from "@/lib/api"
import type { EventItem } from "./event-card"

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventCreated: (event: EventItem) => void
  divisions: Array<{ id: string; name: string }>
}

const fieldClass =
  "mt-1 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-100"
const labelClass = "text-xs text-zinc-600 dark:text-zinc-300 font-semibold"
const selectClass =
  "mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"

export function CreateEventDialog({
  open,
  onOpenChange,
  onEventCreated,
  divisions,
}: CreateEventDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    cover_image_url: "",
    luma_url: "",
    luma_event_id: "",
    division_id: "",
    event_type: "external",
    points_reward: "20",
    start_time: "",
    end_time: "",
    location_name: "ASTU Main Campus, Lab 508",
    certificate_template_id: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.description || !formData.start_time || !formData.end_time) {
      toast.error("Please fill out all required fields.")
      return
    }

    try {
      setLoading(true)
      const createdEvent = await eventsService.createEvent({
        title: formData.title.trim(),
        description: formData.description.trim(),
        cover_image_url: formData.cover_image_url.trim() || null,
        luma_url: formData.luma_url.trim() || null,
        luma_event_id: formData.luma_event_id.trim() || null,
        division_id: formData.division_id || null,
        event_type: formData.event_type,
        points_reward: parseInt(formData.points_reward, 10) || 20,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        location_name: formData.location_name.trim(),
        certificate_template_id: formData.certificate_template_id || null,
        is_published: true,
      })

      toast.success("Event created and published successfully!")
      onEventCreated(createdEvent as EventItem)
      onOpenChange(false)
      setFormData({
        title: "",
        description: "",
        cover_image_url: "",
        luma_url: "",
        luma_event_id: "",
        division_id: "",
        event_type: "external",
        points_reward: "20",
        start_time: "",
        end_time: "",
        location_name: "ASTU Main Campus, Lab 508",
        certificate_template_id: "",
      })
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
            ? err.message
            : "An error occurred while publishing the event"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            Publish New Event & Workshop
          </DialogTitle>
          <DialogDescription className="text-xs">
            Link with your Luma event page for zero-lag RSVP and seamless post-event certificate minting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div>
            <Label className={labelClass}>Event Title *</Label>
            <Input
              required
              placeholder="e.g. Hands-on Reverse Engineering 101"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className={`${labelClass} flex items-center gap-1.5`}>
                <LinkIcon className="w-3.5 h-3.5 text-rose-500" />
                Luma Event URL
              </Label>
              <Input
                placeholder="https://luma.com/event/evt-…"
                value={formData.luma_url}
                onChange={(e) => {
                  const luma_url = e.target.value
                  const evtMatch = luma_url.match(/(evt-[a-zA-Z0-9_-]+)/i)
                  setFormData({
                    ...formData,
                    luma_url,
                    luma_event_id: evtMatch ? evtMatch[1] : formData.luma_event_id,
                  })
                }}
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Luma Event ID (Optional)</Label>
              <Input
                placeholder="evt-eXR2zsp2U0fuwY0"
                value={formData.luma_event_id}
                onChange={(e) => setFormData({ ...formData, luma_event_id: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className={labelClass}>Division Scoping</Label>
              <select
                value={formData.division_id}
                onChange={(e) => setFormData({ ...formData, division_id: e.target.value })}
                className={selectClass}
              >
                <option value="">Club-wide (All Divisions)</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className={labelClass}>Audience Scope</Label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className={selectClass}
              >
                <option value="external">Public & Club Members</option>
                <option value="internal">Internal Lab Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className={labelClass}>Start Time *</Label>
              <Input
                required
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>End Time *</Label>
              <Input
                required
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className={labelClass}>Location / Venue</Label>
              <Input
                placeholder="ASTU Main Campus, Lab 508"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Leaderboard Pts</Label>
              <Input
                type="number"
                min="0"
                max="200"
                value={formData.points_reward}
                onChange={(e) => setFormData({ ...formData, points_reward: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <Label className={labelClass}>Banner Image URL (16:9)</Label>
            <Input
              placeholder="https://.../event-banner.jpg"
              value={formData.cover_image_url}
              onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <Label className={labelClass}>Event Description *</Label>
            <Textarea
              required
              rows={3}
              placeholder="Provide event details, prerequisites, and workshop objectives..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Publish Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
