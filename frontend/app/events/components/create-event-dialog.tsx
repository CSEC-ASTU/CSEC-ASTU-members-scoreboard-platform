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
import { Calendar, Clock, MapPin, Sparkles, Plus, Loader2, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"
import type { EventItem } from "./event-card"

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventCreated: (event: EventItem) => void
  divisions: Array<{ id: string; name: string }>
}

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
      const res = await fetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || "Failed to create event")
      }

      const createdEvent: EventItem = await res.json()
      toast.success("Event created and published successfully!")
      onEventCreated(createdEvent)
      onOpenChange(false)
      // Reset form
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
    } catch (err: any) {
      toast.error(err.message || "An error occurred while publishing the event")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-neutral-900 border-neutral-800 text-neutral-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            Publish New Event & Workshop
          </DialogTitle>
          <DialogDescription className="text-neutral-400 text-xs">
            Link with your Luma event page for zero-lag RSVP and seamless post-event certificate minting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div>
            <Label className="text-xs text-neutral-300 font-semibold">Event Title *</Label>
            <Input
              required
              placeholder="e.g. Hands-on Reverse Engineering 101"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 bg-neutral-950 border-neutral-800 focus:border-primary text-sm"
            />
          </div>

          {/* Luma URL & Event ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-neutral-300 font-semibold flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-rose-400" />
                Luma Event URL
              </Label>
              <Input
                placeholder="https://lu.ma/re-101"
                value={formData.luma_url}
                onChange={(e) => setFormData({ ...formData, luma_url: e.target.value })}
                className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-300 font-semibold">Luma Event ID (Optional)</Label>
              <Input
                placeholder="evt-xxxxxxxxxx"
                value={formData.luma_event_id}
                onChange={(e) => setFormData({ ...formData, luma_event_id: e.target.value })}
                className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
              />
            </div>
          </div>

          {/* Scope & Division */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-neutral-300 font-semibold">Division Scoping</Label>
              <select
                value={formData.division_id}
                onChange={(e) => setFormData({ ...formData, division_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-primary focus:outline-none"
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
              <Label className="text-xs text-neutral-300 font-semibold">Audience Scope</Label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="mt-1 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:border-primary focus:outline-none"
              >
                <option value="external">Public & Club Members</option>
                <option value="internal">Internal Lab Only</option>
              </select>
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-neutral-300 font-semibold">Start Time *</Label>
              <Input
                required
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-300 font-semibold">End Time *</Label>
              <Input
                required
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
              />
            </div>
          </div>

          {/* Venue & Points */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label className="text-xs text-neutral-300 font-semibold">Location / Venue</Label>
              <Input
                placeholder="ASTU Main Campus, Lab 508"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-neutral-300 font-semibold">Leaderboard Pts</Label>
              <Input
                type="number"
                min="0"
                max="200"
                value={formData.points_reward}
                onChange={(e) => setFormData({ ...formData, points_reward: e.target.value })}
                className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
              />
            </div>
          </div>

          {/* Banner URL */}
          <div>
            <Label className="text-xs text-neutral-300 font-semibold">Banner Image URL (16:9)</Label>
            <Input
              placeholder="https://.../event-banner.jpg"
              value={formData.cover_image_url}
              onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
              className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs text-neutral-300 font-semibold">Event Description *</Label>
            <Textarea
              required
              rows={3}
              placeholder="Provide event details, prerequisites, and workshop objectives..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 bg-neutral-950 border-neutral-800 text-sm"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-neutral-800 text-neutral-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Publish Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
