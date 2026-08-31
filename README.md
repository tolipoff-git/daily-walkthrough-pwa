# Daily Facility & EHS Walkthrough Inspection PWA
> **Итоговый чек-лист ежедневного обхода предприятия (Безопасность, 5S, Склад, Инфраструктура)**
> **Bilingual (Russian / English) PWA for Facility Safety & 5S Walkthrough Audits**

A high-performance, offline-first Progressive Web App (PWA) built with **React 18**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, and **SheetJS (xlsx)**, designed for direct deployment to **Cloudflare Pages**.

---

## 🌟 Key Features

1. **Complete Bilingual (RU / ENG) Internationalization (i18n)**:
   - **Header Language Toggle (RU | ENG)**: Instant live switching with persistence in `localStorage` (defaulting to Russian).
   - **Checklist Items**: All 17 audit items with full titles, audit criteria, and requirements in both Russian and English.
   - **Categories**: All 4 categories with dual-language titles and descriptions.
   - **UI & Modals**: Comprehensive localization across all forms, counters, tabs, confirmation dialogs, and CAPA logs.
   - **Priority Badges**: `P1` (Критический - Немедленно / Critical - Immediate), `P2` (Текущая смена / This shift), `P3` (Плановый / Scheduled).
   - **Departments & Presets**: Localized department assignees (ТОиР/Maintenance, Логистика/Logistics, Служба ТБ/Safety, АХО/Facilities, Производство/Production, Склад/Warehouse, etc.) and facility zone presets.
   - **Bilingual Export Engines**: Plaintext ASCII protocols, multi-sheet Excel (.xlsx) workbooks, and printable PDF reports in the active language.

2. **Complete 17-Point Audit Checklist (4 Core Categories)**:
   - **Category 1: Life Safety & Egress** (1.1 - 1.5) — Emergency exits, aisles, fire extinguishers (36" clearance), electrical panels & sprinkler risers, illuminated Exit signs.
   - **Category 2: Shop Floor & Workstations (5S)** (2.1 - 2.4) — Trip hazards & loose cables, floor cleanliness/spills, workstation 5S & tooling return, machine guarding & E-Stops.
   - **Category 3: Warehouse, Racking & Docks** (3.1 - 3.4) — Rack uprights & safety pins, pallet load stacking, loading dock doors & barriers, battery charging ventilation & eyewash.
   - **Category 4: Facility, Grounds & Waste** (4.1 - 4.4) — Waste & scrap bins (80% haul trigger), high-bay lighting, perimeter access control & fire lanes, 100% PPE compliance.

3. **Interactive Walkthrough Experience**:
   - **Fast 3-State Toggle**: `PASS` (Emerald) / `FAIL` (Red) / `N/A` (Slate) with tactile haptic feedback.
   - **Inline Defect Drawer on FAIL**:
     - **Priority Selector**: `P1` (Critical - Immediate / Stop), `P2` (This shift / Tomorrow AM), `P3` (Scheduled / 3-5 days).
     - **Location Selector**: Quick preset chips (`Цех 1`, `Цех 2`, `Склад ГП`, `Рампа 1-4`, `ЧПУ`, `АКБ`) + custom input.
     - **Assignee & Target Date**: `Maintenance`, `Logistics`, `Facilities`, `Safety & EHS`, `Production`, `Warehouse`, `Quality`, `Cleaning`.
     - **Repeat Defect Flag**: Mark chronic or recurring safety hazards.
     - **Camera / Gallery Attachment**: Auto client-side compression via HTML5 Canvas (max 1024px, JPEG 0.75) with timestamp watermark and full-screen zoom preview.
   - **Anti-Pencil-Whipping & Bulk Ergonomics**:
     - Category-level batch pass (`Пройти раздел`).
     - Global batch pass with confirmation modal.
     - Sample Demo Data filler for training and testing in RU or ENG.
     - Search & filter by keyword, category, and status (`Все`, `Замечания`, `Ожидают`).

4. **Offline-First & Local Persistence**:
   - **IndexedDB (`EHS_Walkthrough_DB`)** for high-capacity photo storage and state preservation.
   - **PWA Service Worker (`sw.js`)** with offline asset caching and network fallback.
   - **W3C `manifest.webmanifest`** for native Android/iOS/Desktop installation.
   - Automatic local auto-save on every keystroke and toggle.

5. **Multi-Format Export & Reporting Engines**:
   - 📄 **ASCII Plaintext Protocol**: Exact structured template matching field reporting requirements in selected language (ready for Telegram, Email, Slack).
   - 📊 **Excel (.xlsx) Multi-Sheet Workbook**: Built with SheetJS (`xlsx`) — Sheet 1: Executive Summary & KPIs, Sheet 2: CAPA Action Log, Sheet 3: Full 17-Item Audit in active language.
   - 🖨️ **Vector Print / PDF (A4)**: Dedicated `@media print` layout with KPI tables, defect photo thumbnails, and formal sign-off signature block.
   - 💾 **JSON Backup & Restore**: One-click full database export and import.
   - 🗂️ **Offline History Log**: Local audit archive with instant reload and export.

---

## 📁 Project Structure

```
/home/admin/projects/daily-walkthrough-pwa
├── public/
│   ├── _headers               # Cloudflare Pages security & cache headers
│   ├── _routes.json           # Cloudflare Pages SPA routing
│   ├── favicon.svg            # Modern SVG favicon
│   ├── icon.svg               # Scalable PWA vector icon
│   ├── icon-192.png           # 192x192 PNG icon
│   ├── icon-512.png           # 512x512 PNG icon
│   ├── manifest.webmanifest   # PWA manifest
│   └── sw.js                  # Service Worker with offline caching
├── src/
│   ├── components/
│   │   ├── ActionPlanView.tsx     # CAPA defects action log modal
│   │   ├── ChecklistFilterBar.tsx # Category pills, search & bulk pass
│   │   ├── ChecklistItemCard.tsx  # Interactive inspection item card with drawer
│   │   ├── ExportModal.tsx        # Multi-tab export hub (TXT, XLSX, Print, JSON)
│   │   ├── GeneralNotes.tsx       # 5S observations & sign-off signatures
│   │   ├── Header.tsx             # PWA app bar, language toggle (RU|ENG), online/offline
│   │   ├── HistoryModal.tsx       # Local inspection log & history viewer
│   │   ├── InspectorBar.tsx       # Inspector metadata, facility & time tracking
│   │   ├── MetricsBar.tsx         # Score gauge, segmented progress, P1/P2/P3 pills
│   │   ├── PhotoModal.tsx         # High-res photo preview modal
│   │   └── PrintReportView.tsx    # Clean A4 executive printable report
│   ├── data/
│   │   ├── checklistData.ts       # All 17 items & categories (bilingual)
│   │   └── mockData.ts            # Realistic demo walkthrough dataset (RU & ENG)
│   ├── hooks/
│   │   ├── useHistory.ts          # History state & DB synchronization
│   │   └── useInspection.ts       # Core walkthrough state & IndexedDB auto-save
│   ├── i18n/
│   │   ├── en.ts                  # English translation dictionary
│   │   ├── ru.ts                  # Russian translation dictionary
│   │   ├── types.ts               # Translation interfaces & schema
│   │   └── LanguageContext.tsx    # React Context for language state & helpers
│   ├── types/
│   │   └── inspection.ts          # Complete TypeScript domain interfaces
│   ├── utils/
│   │   ├── exportExcel.ts         # SheetJS Excel workbook builder (bilingual)
│   │   ├── exportJson.ts          # JSON backup & restore parser
│   │   ├── exportPlaintext.ts     # ASCII text formatter (bilingual)
│   │   ├── haptics.ts             # Mobile vibration feedback
│   │   ├── imageCompressor.ts     # HTML5 Canvas JPEG compressor (1024px)
│   │   ├── indexedDb.ts           # IndexedDB asynchronous storage wrapper
│   │   ├── metrics.ts             # Score & KPI aggregation
│   │   └── pwa.ts                 # Service Worker registration
│   ├── App.tsx                    # Master Application container
│   ├── index.css                  # Tailwind CSS directives & @media print rules
│   └── main.tsx                   # React root entry point with LanguageProvider
├── dist/                          # Production build output
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Development & Build

```bash
# Navigate to project directory
cd /home/admin/projects/daily-walkthrough-pwa

# Start local development server
npm run dev

# Compile TypeScript and generate production build in dist/
npm run build

# Preview production build locally
npm run preview
```

---

## ☁️ Cloudflare Pages Deployment

### Option A: Direct Git Integration (Recommended)
1. Push this repository to GitHub / GitLab.
2. In the **Cloudflare Dashboard**, navigate to **Compute (Workers & Pages)** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository and configure build settings:
   - **Framework Preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js Version**: `18+` or `20+`
4. Click **Save and Deploy**. Cloudflare Pages automatically respects `_headers` and `_routes.json` in `public/`.

### Option B: Direct CLI Deployment via Wrangler
```bash
# Install Wrangler globally or use npx
npx wrangler pages deploy dist --project-name=daily-walkthrough-pwa
```
