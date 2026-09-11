# CSEC-ASTU Platform — UI/UX Design System & Experience Guide

> **Philosophy**: *Laidback Academic.*  
> Minimalist, deliberate, and high-performance. The interface should feel like a state-of-the-art engineering workspace (Linear, Raycast, Vercel) — uncluttered, breathable, and deeply satisfying to interact with.

---

## 1. Core Principles

1. **Breathing Room is a Feature, Not Wasted Space**
   - High information density leads to cognitive exhaustion. Generous margins, wider containers, and intentional whitespace allow users to scan effortlessly without feeling overwhelmed.
2. **Signals Over Noise (Restraint in Color & Borders)**
   - Eliminate the "Card-inside-Card" border clutter. 90% of the UI should live in monochromatic harmony (obsidian, zinc, clean slate). Color is strictly reserved for high-value semantic signals and brand identity.
3. **Progressive Disclosure**
   - Show the essential numbers first (Hero Metrics); provide drill-downs, modals, and slide-overs for granular audit trails. Do not dump every database column onto the main dashboard.
4. **Wide, Unconstrained Canvas**
   - Modals, dialogs, and tables must have room to breathe. Narrow, claustrophobic 400px popups are replaced with spacious, multi-column cards and wide modal viewports.

---

## 2. Curated Color Palette

Avoid rainbow chaos. The palette is strictly partitioned into **Canvas Neutrals**, **One Primary Brand Accent**, and **Three Semantic Signals**.

### A. Canvas Neutrals (The Foundation)

| Token | Light Mode | Dark Mode (Default) | Role |
| :--- | :--- | :--- | :--- |
| **App Background** | `#FAFAFA` (`zinc-50`) | `#09090B` (`zinc-950`) | Deep obsidian canvas; immersive & calm. |
| **Surface (Card/Panel)** | `#FFFFFF` (`white`) | `#121216` (`zinc-900/60`) | Elevated surface with `backdrop-blur-xl`. |
| **Subtle Surface** | `#F4F4F5` (`zinc-100`) | `#18181E` (`zinc-800/40`) | Input fields, table headers, hover states. |
| **Border Soft** | `#E4E4E7` (`zinc-200`) | `rgba(255, 255, 255, 0.07)` | Soft, low-contrast boundary; never harsh. |
| **Border Active** | `#D4D4D8` (`zinc-300`) | `rgba(255, 255, 255, 0.16)` | Focused inputs, hovered cards. |
| **Text Primary** | `#09090B` (`zinc-950`) | `#F4F4F5` (`zinc-100`) | High-contrast headings and values. |
| **Text Secondary** | `#52525B` (`zinc-600`) | `#A1A1AA` (`zinc-400`) | Descriptions, table data, subtext. |
| **Text Muted** | `#71717A` (`zinc-500`) | `#71717A` (`zinc-500`) | Timestamps, placeholders, inactive hints. |

---

### B. Brand Accent: **Electric Violet**

The signature CSEC-ASTU aesthetic accent. Used sparingly for primary interactive elements, active navigation states, and subtle ambient glows.

- **Primary**: `#8B5CF6` (`violet-500`) / Dark Mode: `#A78BFA` (`violet-400`)
- **Hover/Active**: `#7C3AED` (`violet-600`)
- **Glow / Ambient Tint**: `rgba(139, 92, 246, 0.12)` (`bg-violet-500/10`)
- **Usage**: Primary CTA buttons ("Claim Task", "Submit"), active sidebar highlight, progress bars, achievement badge highlights.

```css
/* Tailwind Class Pattern */
bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20
```

---

### C. Semantic Functional Signals (Strictly Purpose-Driven)

Do not introduce random blues, pinks, or teals. Every functional color has one unmistakable meaning:

| Signal | Color | Tailwind | Usage |
| :--- | :--- | :--- | :--- |
| **Success / Approved** | **Mint Emerald** (`#10B981`) | `text-emerald-400`, `bg-emerald-500/10` | Approved claims, positive points (+pts), active status dot, complete state. |
| **Pending / Caution** | **Warm Amber** (`#F59E0B`) | `text-amber-400`, `bg-amber-500/10` | Pending approvals in queue, Yellow warnings, trophy highlights. |
| **Danger / Rejected** | **Crimson Rose** (`#F43F5E`) | `text-rose-400`, `bg-rose-500/10` | Rejected claims, Red warnings, layoffs, destructive confirmations. |

---

## 3. Spatial System & Layout Architecture

### A. Centered Breathing Container
Ban full-bleed wall-to-wall stretching on desktop displays. All pages must use a centered, constrained layout with generous padding:

```tsx
// Standard Page Wrapper Template
<main className="flex-1 overflow-auto bg-[#09090B] text-zinc-100">
  <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-8">
    {/* Page Header */}
    {/* Main Content Sections */}
  </div>
</main>
```

### B. Card Surface Stacking (Layered Depth)
Instead of harsh 1px borders on flat backgrounds:
- **Base**: `bg-[#09090B]`
- **Card**: `rounded-2xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-xl p-6 sm:p-7 shadow-xl shadow-black/20`
- **Sub-card / Row**: `rounded-xl border border-white/[0.05] bg-zinc-900/30 p-4 hover:bg-zinc-800/40 transition-colors`

---

## 4. Modal & Dialog Architecture (Wide & Laidback)

### The Anti-Cramming Rule
> **Forbidden**: `className="sm:max-w-md"` (448px) for forms, inputs, and member details.  
> Squeezing form labels, textareas, and buttons into 400px creates claustrophobic, anxious UI.

### Modal Standards Matrix

| Modal Tier | Max Width | Target Use Cases |
| :--- | :--- | :--- |
| **Small (`max-w-md`)** | `28rem` (448px) | **Strictly** for single-question destructive confirmations (e.g. "Revoke grant?", "Delete division?"). |
| **Standard (`max-w-2xl`)** | `42rem` (672px) | **Default** for all forms: Claim Task Dialog, Issue Warning, Single Member Edit, Add Task. |
| **Spacious (`max-w-4xl`)** | `56rem` (896px) | Multi-step wizards, Batch Officer Event Adjustments, Ledger Inspections, Permission Matrix. |
| **Fullsheet (`max-w-5xl`)** | `64rem` (1024px) | CSV Import Wizard with preview spreadsheet, Annual History analytics. |

### Modal Form Layout Blueprint (`max-w-2xl`)

```tsx
<DialogContent className="max-w-2xl rounded-2xl border border-white/10 bg-[#0F0F13] p-0 shadow-2xl backdrop-blur-2xl">
  {/* Header with breathing room */}
  <div className="px-7 pt-7 pb-4 border-b border-white/5">
    <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-100">
      Submit Activity Claim
    </DialogTitle>
    <DialogDescription className="text-sm text-zinc-400 mt-1">
      Provide details of your contribution for division officer review.
    </DialogDescription>
  </div>

  {/* Form Body: 2-Column responsive grid, generous gaps */}
  <div className="p-7 space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Task Category
        </label>
        {/* Select Input */}
      </div>
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Session / Duty Date
        </label>
        {/* Date Input */}
      </div>
    </div>

    <div className="space-y-2">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Evidence & Contribution Summary
      </label>
      <Textarea className="min-h-[110px] bg-zinc-900/60 border-white/10 focus:border-violet-500/60 text-sm" />
    </div>
  </div>

  {/* Dedicated Footer with clear hierarchy */}
  <div className="px-7 py-4 bg-zinc-950/50 border-t border-white/5 flex items-center justify-end gap-3 rounded-b-2xl">
    <Button variant="ghost" className="text-zinc-400 hover:text-zinc-200">
      Cancel
    </Button>
    <Button className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25 px-5">
      Submit Claim
    </Button>
  </div>
</DialogContent>
```

---

## 5. Typography Scale & Anti-Clutter Rules

A common mistake in data dashboards is reducing everything to `text-[11px]` and `text-xs` to cram more fields. This makes the UI feel like an Excel sheet.

### Typography Hierarchy

- **Hero Stat Display**: `text-4xl sm:text-5xl font-black tracking-tight tabular-nums` (e.g. `120 pts`)
- **Page Title**: `text-2xl font-bold tracking-tight text-zinc-100`
- **Card / Section Header**: `text-base sm:text-lg font-semibold text-zinc-100`
- **Body / Primary Value**: `text-sm font-normal text-zinc-300 leading-relaxed`
- **Labels & Micro-Tags**: `text-xs font-medium text-zinc-400` (Use `uppercase tracking-wider` for table headers and form labels)

---

## 6. Page-by-Page Experience Enhancements

### A. Dashboard (`/dashboard`)
- **Old Issue**: 3 identical, cramped cards in `List01` packed with tiny text, progress bars, and multiple warning chips.
- **New Pattern (Asymmetric Hero + Pulse)**:
  - **Hero Card (65% width)**: A striking spotlight card featuring the member's cycle score in bold `text-5xl`, an animated violet-to-emerald score cap track, current badge tier, and a direct "Claim Points" button.
  - **Quick Pulse (35% width)**: Vertical stack with 3 clean items: Standing Rank, Approved Claims count, and Division Standing — each with clear typography and no visual noise.
  - **Recent Activity Ledger**: Replace dense inline table rows with clean, spacious item cards (`p-4 hover:bg-zinc-800/30 rounded-xl`).

### B. Sidebar Navigation (`sidebar.tsx`)
- **Old Issue**: Flat list of 10+ nav items stacked vertically with identical weight.
- **New Pattern (Grouped Sections)**:
  - **CORE**: Dashboard, Tasks, Leaderboard
  - **DIRECTORY**: Members, My History
  - **ADMINISTRATION** *(Officers only)*: Approvals (with live glowing count badge), Permissions, Platform Settings
  - Section headers rendered in `text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 py-2`.

### C. Tasks Page (`/tasks`)
- **New Pattern**:
  - Filter pills at top (`All`, `Division Sessions`, `Projects`, `Mentorship`) with smooth active pill transitions.
  - Task cards rendered in a 2-column or 3-column relaxed grid.
  - Each card displays category pill, point value (`+15 pts` in green badge), title, and an uncluttered summary.
  - Clicking opens the **Spacious (`max-w-2xl`) Claim Modal**.

### D. Leaderboard (`/leaderboard`)
- **Top 3 Podium**:
  - Before the table, display the Top 3 members in a stylish 3-column podium layout.
  - #1 Center (Gold accent border, slight elevation lift).
  - #2 Left (Silver accent).
  - #3 Right (Bronze accent).
- Ranks 4+ displayed in a clean, roomy table with sticky headers and generous row height (`py-4`).

---

## 7. Interactive Micro-Interactions & Polish

1. **Card Hover Lift**:
   ```css
   transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-lg hover:shadow-violet-500/5
   ```
2. **Smooth Focus Rings**:
   ```css
   focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]
   ```
3. **Ambient Lighting (Atmosphere)**:
   Add subtle background glows behind hero sections:
   ```tsx
   <div className="absolute top-0 right-1/4 -z-10 h-72 w-72 rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
   <div className="absolute top-20 left-1/3 -z-10 h-64 w-64 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
   ```
4. **Soft Badges & Status Chips**:
   Instead of solid bright badges, use tinted translucent pills:
   - `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`
   - `bg-amber-500/10 text-amber-400 border border-amber-500/20`
   - `bg-violet-500/10 text-violet-400 border border-violet-500/20`

---

## 8. Implementation Checklist for UI Overhaul

- [ ] **Global Spacing**: Update [`Layout`](file:///d:/Full-Stack_Projects/csec-astu-platform/frontend/components/kokonutui/layout.tsx) to use `max-w-7xl mx-auto w-full px-4 sm:px-8 py-8`.
- [ ] **Accent Color Standardization**: Align primary CTA buttons and active states to `violet-600` / `violet-500`.
- [ ] **Sidebar Grouping**: Partition sidebar links into `Core`, `Directory`, and `Administration` sections.
- [ ] **Modal Widening**: Upgrade all dialogs from `sm:max-w-md` to `max-w-2xl` (forms) or `max-w-4xl` (inspection/wizards).
- [ ] **Dashboard Hero Refactor**: Redesign `List01` into an Asymmetric Spotlight Card + Quick Pulse stack.
- [ ] **Leaderboard Podium**: Add Top 3 podium cards above the main ranking table.
- [ ] **Surface Elevation**: Replace solid `#0F0F12` card backgrounds with `bg-zinc-900/40 backdrop-blur-xl border-white/[0.08]`.
