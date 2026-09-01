# Daily Facility & EHS Walkthrough Inspection PWA
> **Итоговый чек-лист ежедневного обхода предприятия (Безопасность, 5S, Склад, Инфраструктура)**
> **Bilingual (Russian / English) PWA for Facility Safety & 5S Walkthrough Audits**

A high-performance, offline-first Progressive Web App (PWA) built with **React 18**, **TypeScript**, **Tailwind CSS**, **Lucide Icons**, and **SheetJS (xlsx)**, designed for direct deployment to **Cloudflare Pages**.

---

## 🌟 Key Features

1. **Complete Bilingual (RU / ENG) Internationalization (i18n)**:
   - **Header Language Toggle (RU | ENG)**: Instant live switching with persistence in `localStorage` (defaulting to Russian).
   - **Checklist Items**: All 16 audit items with full titles, audit criteria, and requirements in both Russian and English.
   - **Categories**: All 4 categories with dual-language titles and descriptions.
   - **UI & Modals**: Comprehensive localization across all forms, counters, tabs, confirmation dialogs, personnel directory, and CAPA logs.
   - **Priority Badges**: `P1` (Критический - Немедленно / Critical - Immediate), `P2` (Текущая смена / This shift), `P3` (Плановый / Scheduled).
   - **Departments & Presets**: Localized department assignees (ТОиР/Maintenance, Логистика/Logistics, Служба ТБ/Safety, АХО/Facilities, Производство/Production, Склад/Warehouse, etc.) and facility zone presets.
   - **Bilingual Export Engines**: Plaintext ASCII protocols, multi-sheet Excel (.xlsx) workbooks, and printable US Letter PDF reports in the active language.

2. **16-Point Audit Checklist (4 Core Categories)**:
   - **Category 1: Life Safety & Egress** (1.1 - 1.5) — Emergency exits, aisles, fire extinguishers (36" clearance), electrical panels & sprinkler risers, illuminated Exit signs.
   - **Category 2: Shop Floor & Workstations (5S)** (2.1 - 2.4) — Trip hazards & loose cables, floor cleanliness/spills, workstation 5S & tooling return, machine guarding & E-Stops.
   - **Category 3: Warehouse, Racking & Docks** (3.1 - 3.3) — Rack uprights & safety pins, pallet load stacking, loading dock doors & barriers.
   - **Category 4: Facility, Grounds & Waste** (4.1 - 4.4) — Waste & scrap bins (80% haul trigger), high-bay lighting, perimeter access control & fire lanes, 100% PPE compliance.

3. **Personnel & Staff Management (Справочник персонала)**:
   - **Dedicated Personnel Directory**: Full CRUD interface (`PersonnelModal.tsx`) with search, filter, and default inspector assignment.
   - **Quick 1-Click Inspector Selection**: In `InspectorBar`, instantly choose inspector from saved staff.
   - **Save Inspector On-The-Fly**: Save typed inspector name and role directly into the directory.
   - **Assigned Staff in Defect Cards & Sign-Off**: Pick authorized personnel directly in defect assignee dropdowns (`ChecklistItemCard`) and manager approvals (`GeneralNotes`).
   - **Persistent Storage**: Saved in `localStorage` (`ehs_saved_personnel`) with pre-populated bilingual staff templates.

4. **Interactive Walkthrough Experience**:
   - **Fast 3-State Toggle**: `PASS` (Emerald) / `FAIL` (Red) / `N/A` (Slate) with tactile haptic feedback.
   - **Inline Defect Drawer on FAIL**:
     - **Priority Selector**: `P1` (Critical - Immediate / Stop), `P2` (This shift / Tomorrow AM), `P3` (Scheduled / 3-5 days).
     - **Location Selector**: Quick preset chips (`Цех 1`, `Цех 2`, `Склад ГП`, `Рампа 1-4`, `ЧПУ`, `ВРУ`) + custom input.
     - **Assignee & Target Date**: Grouped by departments & saved personnel directory.
     - **Repeat Defect Flag**: Mark chronic or recurring safety hazards.
     - **Camera / Gallery Attachment**: Auto client-side compression via HTML5 Canvas (max 1024px, JPEG 0.75) with timestamp watermark and full-screen zoom preview.
   - **Anti-Pencil-Whipping & Bulk Ergonomics**:
     - Category-level batch pass (`Пройти раздел`).
     - Global batch pass with confirmation modal.
     - Search & filter by keyword, category, and status (`Все`, `Замечания`, `Ожидают`).

5. **Offline-First & Local Persistence**:
   - **IndexedDB (`EHS_Walkthrough_DB`)** for high-capacity photo storage and state preservation.
   - **PWA Service Worker (`sw.js`)** with offline asset caching and network fallback.
   - **W3C `manifest.webmanifest`** for native Android/iOS/Desktop installation.
   - Automatic local auto-save on every keystroke and toggle.

6. **Multi-Format Export & Reporting Engines**:
   - 📄 **ASCII Plaintext Protocol**: Exact structured template matching field reporting requirements in selected language (ready for Telegram, Email, Slack).
   - 📊 **Excel (.xlsx) Multi-Sheet Workbook**: Built with SheetJS (`xlsx`) — Sheet 1: Executive Summary & KPIs, Sheet 2: CAPA Action Log, Sheet 3: Full Audit in active language.
   - 🖨️ **US Letter (8.5" × 11") Vector Print / PDF**: Dedicated `@media print` layout with KPI tables, defect photo thumbnails, and formal sign-off signature block with clean page-break isolation.
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
│   │   ├── InspectorBar.tsx       # Inspector metadata, facility & personnel selector
│   │   ├── MetricsBar.tsx         # Score gauge, segmented progress, P1/P2/P3 pills
│   │   ├── PersonnelModal.tsx     # Personnel & staff directory management modal
│   │   ├── PhotoModal.tsx         # High-res photo preview modal
│   │   └── PrintReportView.tsx    # Clean US Letter printable report
│   ├── data/
│   │   └── checklistData.ts       # All 16 items & categories (bilingual)
│   ├── hooks/
│   │   ├── useHistory.ts          # History state & DB synchronization
│   │   ├── useInspection.ts       # Core walkthrough state & IndexedDB auto-save
│   │   └── usePersonnel.ts        # Personnel directory management hook
│   ├── i18n/
│   │   ├── en.ts                  # English translation dictionary
│   │   ├── ru.ts                  # Russian translation dictionary
│   │   ├── types.ts               # Translation interfaces & schema
│   │   └── LanguageContext.tsx    # React Context for language state & helpers
│   ├── types/
│   │   ├── inspection.ts          # Complete TypeScript domain interfaces
│   │   └── personnel.ts           # Personnel data model interfaces
│   ├── utils/
│   │   ├── exportExcel.ts         # SheetJS Excel workbook builder (bilingual)
│   │   ├── exportJson.ts          # JSON backup & restore parser
│   │   ├── exportPlaintext.ts     # ASCII text formatter (bilingual)
│   │   ├── haptics.ts             # Mobile vibration feedback
│   │   ├── imageCompressor.ts     # HTML5 Canvas JPEG compressor (1024px)
│   │   ├── indexedDb.ts           # IndexedDB asynchronous storage wrapper
│   │   ├── metrics.ts             # Inspection KPI computation engine
│   │   ├── personnelStorage.ts    # Personnel localStorage persistence
│   │   └── pwa.ts                 # Service worker registration
│   ├── App.tsx                    # Main walkthrough application controller
│   ├── index.css                  # Tailwind styles & print stylesheet
│   ├── main.tsx                   # React 18 DOM mount
│   └── vite-env.d.ts              # Vite environment declarations
├── index.html                     # HTML5 root with PWA meta tags
├── package.json                   # Dependencies and scripts
├── tailwind.config.js             # Tailwind typography & dark theme
├── tsconfig.json                  # Strict TypeScript configuration
└── vite.config.ts                 # Vite bundler configuration
```

---

## 🚀 Building & Testing

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run type check and production build
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Cloudflare Pages Deployment

This application is ready for Cloudflare Pages deployment:
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Routing**: Client-side routing with `_routes.json`
- **Headers**: Immutable asset caching and Content-Security-Policy configured in `_headers`.
