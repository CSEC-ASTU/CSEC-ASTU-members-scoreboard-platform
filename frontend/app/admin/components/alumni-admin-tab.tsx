"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  GraduationCap,
  Briefcase,
  Award,
  Upload,
  Camera,
  Loader2,
  CheckCircle2,
  X,
  Link as LinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  alumniService,
  divisionsService,
  type AlumniCreateIn,
  type AlumniItem,
  type DivisionOut,
} from "@/lib/api"

const EMPTY_FORM: AlumniCreateIn = {
  full_name: "",
  current_role: "",
  division_id: null,
  division_name: "",
  graduation_year: new Date().getFullYear() - 2,
  description: "",
  photo_url: "",
  profile_url: "",
  is_featured: true,
  is_active: true,
  sort_order: 0,
}

export function AlumniAdminTab() {
  const [alumni, setAlumni] = useState<AlumniItem[]>([])
  const [divisions, setDivisions] = useState<DivisionOut[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<AlumniCreateIn>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function loadAlumni() {
    try {
      setLoading(true)
      const data = await alumniService.listAlumni({ include_inactive: true })
      setAlumni(data || [])
    } catch (err: any) {
      toast.error("Failed to load alumni profiles", { description: err.message })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAlumni()
    async function loadDivisions() {
      try {
        const divs = await divisionsService.listDivisions()
        setDivisions(divs || [])
      } catch (err) {
        console.error("Failed to fetch divisions", err)
      }
    }
    loadDivisions()
  }, [])

  function openCreate() {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setShowUrlInput(false)
    setDialogOpen(true)
  }

  function openEdit(item: AlumniItem) {
    let matchedDivId = item.division_id
    if (!matchedDivId && item.division_name) {
      const match = divisions.find(
        (d) => d.name.toLowerCase() === item.division_name?.toLowerCase()
      )
      if (match) {
        matchedDivId = match.id
      }
    }

    setEditingId(item.id)
    setFormData({
      full_name: item.full_name,
      current_role: item.current_role,
      division_id: matchedDivId || null,
      division_name: item.division_name || "",
      graduation_year: item.graduation_year ?? undefined,
      description: item.description,
      photo_url: item.photo_url || "",
      profile_url: item.profile_url || "",
      is_featured: item.is_featured,
      is_active: item.is_active,
      sort_order: item.sort_order,
    })
    setShowUrlInput(
      Boolean(
        item.photo_url &&
          !item.photo_url.includes("googleusercontent.com") &&
          !item.photo_url.includes("drive.google.com")
      )
    )
    setDialogOpen(true)
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WebP)")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file is too large (max 5 MB)")
      return
    }

    try {
      setUploadingPhoto(true)
      const toastId = toast.loading("Saving photo directly to Google Drive...")
      const res = await alumniService.uploadPhoto(file)
      setFormData((prev) => ({ ...prev, photo_url: res.photo_url }))
      toast.success("Photo saved directly to Google Drive!", { id: toastId })
    } catch (err: any) {
      toast.error("Failed to upload photo to Google Drive", { description: err.message })
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
    e.target.value = ""
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.full_name.trim() || !formData.current_role.trim() || !formData.description.trim()) {
      toast.error("Please fill in Name, Current Role, and Description.")
      return
    }

    try {
      setSubmitting(true)
      if (editingId) {
        await alumniService.updateAlumni(editingId, formData)
        toast.success("Alumni profile updated")
      } else {
        await alumniService.createAlumni(formData)
        toast.success("Alumni profile created")
      }
      setDialogOpen(false)
      loadAlumni()
    } catch (err: any) {
      toast.error("Failed to save alumni", { description: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await alumniService.deleteAlumni(deleteId)
      toast.success("Alumni profile removed")
      setDeleteId(null)
      loadAlumni()
    } catch (err: any) {
      toast.error("Failed to delete alumni", { description: err.message })
    }
  }

  const filteredAlumni = alumni.filter(
    (item) =>
      item.full_name.toLowerCase().includes(search.toLowerCase()) ||
      item.current_role.toLowerCase().includes(search.toLowerCase()) ||
      (item.division_name && item.division_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Award className="h-4 w-4 text-violet-400" />
            Honorable Alumni Registry
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Manage prominent alumni displayed on the public landing page.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> Add Alumni
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
        <Input
          type="text"
          placeholder="Filter by name, company, or division..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent text-xs">
              <TableHead>Alumni</TableHead>
              <TableHead>Current Role &amp; Company</TableHead>
              <TableHead>Division</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-zinc-500">
                  Loading alumni records...
                </TableCell>
              </TableRow>
            ) : filteredAlumni.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-zinc-500">
                  No alumni records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAlumni.map((item) => (
                <TableRow key={item.id} className="text-xs">
                  <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                    <div className="flex items-center gap-2.5">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.full_name}
                          referrerPolicy="no-referrer"
                          className="h-8 w-8 rounded-full object-cover border border-zinc-700"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 text-violet-300 font-semibold border border-violet-500/20">
                          {item.full_name[0]}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{item.full_name}</div>
                        {item.profile_url && (
                          <a
                            href={item.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-violet-400 transition-colors"
                          >
                            <span>Profile</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-zinc-300">
                    {item.current_role}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {item.division_name || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {item.graduation_year || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.is_featured && (
                        <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20">
                          Featured
                        </Badge>
                      )}
                      {!item.is_active && (
                        <Badge variant="outline" className="text-[10px] text-zinc-500">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-rose-500 hover:text-rose-600"
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Alumni Profile" : "Add Honorable Alumni"}</DialogTitle>
              <DialogDescription className="text-xs">
                Featured profiles are highlighted on the public platform landing page.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <Label className="text-xs font-medium">Full Name</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="e.g. Kidus Yohannes"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-medium">Current Role &amp; Organization</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="e.g. Software Engineer @ Google"
                  value={formData.current_role}
                  onChange={(e) => setFormData({ ...formData, current_role: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Division Track</Label>
                  <Select
                    value={formData.division_id || (formData.division_name ? "custom" : "none")}
                    onValueChange={(val) => {
                      if (val === "none") {
                        setFormData((prev) => ({
                          ...prev,
                          division_id: null,
                          division_name: null,
                        }))
                      } else if (val === "custom") {
                        // Keep current division_name
                      } else {
                        const match = divisions.find((d) => d.id === val)
                        if (match) {
                          setFormData((prev) => ({
                            ...prev,
                            division_id: match.id,
                            division_name: match.name,
                          }))
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="mt-1 text-xs h-9">
                      <SelectValue placeholder="Select division track" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        None / General (Club-wide)
                      </SelectItem>
                      {divisions.map((div) => (
                        <SelectItem key={div.id} value={div.id} className="text-xs">
                          {div.name}
                        </SelectItem>
                      ))}
                      {formData.division_name &&
                        !divisions.some(
                          (d) => d.id === formData.division_id || d.name === formData.division_name
                        ) && (
                          <SelectItem value="custom" className="text-xs">
                            {formData.division_name}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Graduation Year</Label>
                  <Input
                    type="number"
                    className="mt-1 text-xs"
                    placeholder="e.g. 2022"
                    value={formData.graduation_year || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        graduation_year: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-medium">Description / Bio</Label>
                <Textarea
                  className="mt-1 text-xs resize-none"
                  rows={3}
                  placeholder="Concise 1–2 sentences about their journey, domain, or reflection for members."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium">Profile Photo</Label>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <LinkIcon className="h-3 w-3" />
                    <span>{showUrlInput ? "Hide manual URL" : "Or enter URL"}</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {formData.photo_url ? (
                  <div className="flex items-center gap-3.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
                    <img
                      src={formData.photo_url}
                      alt="Alumni photo preview"
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 rounded-full object-cover border-2 border-violet-500/30 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          Photo Uploaded
                        </span>
                        {formData.photo_url.includes("googleusercontent.com") || formData.photo_url.includes("drive.google.com") ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 py-0 px-1.5">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Saved to Google Drive
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5" title={formData.photo_url}>
                        {formData.photo_url}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] px-2"
                          disabled={uploadingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploadingPhoto ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Camera className="h-3 w-3 mr-1" />
                              Change Photo
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] px-2 text-rose-500 hover:text-rose-600"
                          onClick={() => setFormData({ ...formData, photo_url: "" })}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center p-5 rounded-xl border border-dashed cursor-pointer transition-all ${
                      dragActive
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-violet-500/60 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    {uploadingPhoto ? (
                      <div className="flex flex-col items-center gap-2 py-1">
                        <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
                        <span className="text-xs font-medium text-zinc-300">
                          Saving directly to Google Drive...
                        </span>
                        <span className="text-[11px] text-zinc-500">Creating public view link</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/10 text-violet-400">
                          <Upload className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-200">
                            Click to upload photo or drag &amp; drop
                          </span>
                          <p className="text-[11px] text-zinc-500">
                            Automatically saved to Google Drive (PNG, JPG, WebP up to 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {showUrlInput && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Input
                      className="text-xs"
                      placeholder="Paste image URL (https://...)"
                      value={formData.photo_url || ""}
                      onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-medium">Profile URL (LinkedIn / GitHub)</Label>
                <Input
                  className="mt-1 text-xs"
                  placeholder="https://linkedin.com/in/..."
                  value={formData.profile_url || ""}
                  onChange={(e) => setFormData({ ...formData, profile_url: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Featured on Landing Page</Label>
                  <p className="text-[11px] text-zinc-500">Show in the public alumni roster</p>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium">Active Status</Label>
                  <p className="text-[11px] text-zinc-500">Public visibility toggle</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : editingId ? "Update Profile" : "Create Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Alumni Record?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. The alumni entry will be permanently removed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-xs">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
