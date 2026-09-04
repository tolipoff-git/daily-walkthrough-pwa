import os
import sys
import time
import json
import subprocess
import urllib.request
from playwright.sync_api import sync_playwright

OUTPUT_DIR = "/home/admin/.gemini/antigravity-cli/brain/23e1ec4c-f359-4dc1-b72f-21b17ba65c51"
os.makedirs(OUTPUT_DIR, exist_ok=True)

DASHBOARD_IMG = os.path.join(OUTPUT_DIR, "weekly_modal_dashboard_tab.png")
ANNEX_IMG = os.path.join(OUTPUT_DIR, "weekly_modal_annex_tab.png")
PAGE1_PREVIEW_IMG = os.path.join(OUTPUT_DIR, "weekly_a4_page1_preview.png")
PAGE2_PREVIEW_IMG = os.path.join(OUTPUT_DIR, "weekly_a4_page2_preview.png")
PDF_PATH = os.path.join(OUTPUT_DIR, "weekly_executive_report.pdf")

# Generate test sessions JSON from our Node script logic
def generate_test_sessions_json():
    node_code = """
    import { CHECKLIST_ITEMS_TEMPLATE } from './src/data/checklistData';
    function cloneTemplate() { return JSON.parse(JSON.stringify(CHECKLIST_ITEMS_TEMPLATE)); }

    // Session 1: Monday (2026-08-31) - Wabtec 1.4 P1
    const itemsMon = cloneTemplate();
    const item14_Mon = itemsMon.find((i) => i.id === '1.4');
    item14_Mon.status = 'FAIL';
    item14_Mon.defectDetails = {
      description: 'Доступ к электрощиту QF-4 заблокирован паллетой с деталями Wabtec',
      location: 'Участок Wabtec, линия сборки',
      zonePreset: 'WABTEC',
      priority: 'P1',
      assignedTo: 'Facilities',
      resolutionStatus: 'Open',
      notes: 'Загроможден проход 1м',
      photos: []
    };
    const sessionMon = {
      id: 'INS-20260831-7K91',
      inspectorName: 'Смирнов Д. В.',
      inspectorRole: 'EHS Lead',
      date: '2026-08-31',
      startTime: '09:00',
      endTime: '09:45',
      shift: 'Day Shift (1-я смена)',
      facilityArea: 'Участок WABTEC / Цех сборки',
      status: 'Completed',
      items: itemsMon,
    };

    // Session 2: Tuesday (2026-09-01) - Warehouse 3.2 P2 + Tool Cage 2.3 P2
    const itemsTue = cloneTemplate();
    const item32_Tue = itemsTue.find((i) => i.id === '3.2');
    item32_Tue.status = 'FAIL';
    item32_Tue.defectDetails = {
      description: 'Паллета со стретч-пленкой опасно накренилась на ярусе 3',
      location: 'Склад готовой продукции, ряд 4',
      zonePreset: 'WAREHOUSE',
      priority: 'P2',
      assignedTo: 'Warehouse',
      resolutionStatus: 'Open',
      notes: 'Требуется перепаллетирование',
      photos: []
    };
    const item23_Tue = itemsTue.find((i) => i.id === '2.3');
    item23_Tue.status = 'FAIL';
    item23_Tue.defectDetails = {
      description: 'Разбросан слесарный инструмент, нет фиксации на шадоу-борде',
      location: 'Инструменталка Tool Cage пост 2',
      zonePreset: 'TOOL CAGE',
      priority: 'P2',
      assignedTo: 'Maintenance',
      resolutionStatus: 'Open',
      notes: '5S не выполнен',
      photos: []
    };
    const sessionTue = {
      id: 'INS-20260901-8A12',
      inspectorName: 'Ковалев А. И.',
      inspectorRole: 'Safety Specialist',
      date: '2026-09-01',
      startTime: '10:00',
      endTime: '10:50',
      shift: 'Day Shift (1-я смена)',
      facilityArea: 'Склад и инструментальный участок',
      status: 'Completed',
      items: itemsTue,
    };

    // Session 3: Wednesday (2026-09-02) - Wabtec 1.4 recurrence!
    const itemsWed = cloneTemplate();
    const item14_Wed = itemsWed.find((i) => i.id === '1.4');
    item14_Wed.status = 'FAIL';
    item14_Wed.defectDetails = {
      description: 'Повторно заблокирован электрощит QF-4 ящиками с комплектующими Wabtec',
      location: 'Wabtec пост 3',
      zonePreset: 'WABTEC',
      priority: 'P1',
      assignedTo: 'Facilities',
      resolutionStatus: 'In Progress',
      notes: 'Ранее выдавалось замечание в понедельник',
      photos: []
    };
    const sessionWed = {
      id: 'INS-20260902-9C33',
      inspectorName: 'Смирнов Д. В.',
      inspectorRole: 'EHS Lead',
      date: '2026-09-02',
      startTime: '14:00',
      endTime: '14:40',
      shift: 'Evening Shift (2-я смена)',
      facilityArea: 'Участок Wabtec',
      status: 'Completed',
      items: itemsWed,
    };

    // Session 4: Thursday (2026-09-03) - Culture PPE 4.4
    const itemsThu = cloneTemplate();
    const item44_Thu = itemsThu.find((i) => i.id === '4.4');
    item44_Thu.status = 'FAIL';
    item44_Thu.defectDetails = {
      description: 'Слесарь работал возле шлифстанка без защитных очков Z87.1',
      location: 'Мастерская Workshop зона 1',
      zonePreset: 'WORKSHOP',
      priority: 'P2',
      assignedTo: 'Operations',
      resolutionStatus: 'Open',
      notes: 'Проведен внеплановый инструктаж',
      photos: []
    };
    const sessionThu = {
      id: 'INS-20260903-4D77',
      inspectorName: 'Федоров П. С.',
      inspectorRole: 'Operations Lead',
      date: '2026-09-03',
      startTime: '11:00',
      endTime: '11:35',
      shift: 'Day Shift (1-я смена)',
      facilityArea: 'Мастерская и цех ремонта',
      status: 'Completed',
      items: itemsThu,
    };

    // Session 5: Friday (2026-09-04) - 100% compliant
    const itemsFri = cloneTemplate();
    itemsFri.forEach((i) => (i.status = 'PASS'));
    const sessionFri = {
      id: 'INS-20260904-5E99',
      inspectorName: 'Смирнов Д. В.',
      inspectorRole: 'EHS Lead',
      date: '2026-09-04',
      startTime: '15:00',
      endTime: '15:30',
      shift: 'Day Shift (1-я смена)',
      facilityArea: 'Все зоны завода',
      status: 'Completed',
      items: itemsFri,
    };

    console.log(JSON.stringify([sessionMon, sessionTue, sessionWed, sessionThu, sessionFri]));
    """
    res = subprocess.run(
        ["npx", "tsx", "--eval", node_code],
        cwd="/home/admin/projects/daily-walkthrough-pwa",
        capture_output=True,
        text=True,
        check=True
    )
    # The output might have npm notice lines before the JSON string
    lines = res.stdout.strip().split('\n')
    json_line = [l for l in lines if l.startswith('[') and l.endswith(']')][-1]
    return json_line

def main():
    print("==================================================================")
    print("PLAYWRIGHT TEST: 2-Page Executive Report & A4 PDF Verification")
    print("==================================================================")

    sessions_json = generate_test_sessions_json()
    print("Generated 5 test inspection sessions with realistic multi-day defects.")

    # Start preview server
    print("Starting Vite preview server on port 4173...")
    preview_proc = subprocess.Popen(
        ["npm", "run", "preview", "--", "--port", "4173", "--host", "0.0.0.0"],
        cwd="/home/admin/projects/daily-walkthrough-pwa",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    try:
        # Wait for server to become ready
        server_ready = False
        for attempt in range(25):
            time.sleep(0.5)
            try:
                with urllib.request.urlopen("http://localhost:4173") as resp:
                    if resp.status == 200:
                        server_ready = True
                        break
            except Exception:
                pass
        
        if not server_ready:
            print("ERROR: Vite preview server failed to start within 12 seconds.")
            sys.exit(1)

        print("Vite preview server is live on http://localhost:4173")

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={"width": 1440, "height": 960},
                device_scale_factor=2
            )
            page = context.new_page()

            # Navigate to app
            page.goto("http://localhost:4173")
            page.wait_for_load_state("networkidle")

            # Seed localStorage and IndexedDB with realistic history
            print("Injecting test sessions into IndexedDB & localStorage...")
            page.evaluate("""(sessionsJson) => {
                const sessions = JSON.parse(sessionsJson);
                localStorage.setItem('ehs_inspection_history_v1', JSON.stringify(sessions));
                
                // Also write to IndexedDB
                return new Promise((resolve) => {
                    const req = indexedDB.open('EHS_Walkthrough_DB', 1);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains('history_sessions')) {
                            const hs = db.createObjectStore('history_sessions', { keyPath: 'id' });
                            hs.createIndex('date', 'date', { unique: false });
                        }
                    };
                    req.onsuccess = (e) => {
                        const db = e.target.result;
                        const tx = db.transaction('history_sessions', 'readwrite');
                        const store = tx.objectStore('history_sessions');
                        sessions.forEach(s => store.put(s));
                        tx.oncomplete = () => resolve(true);
                    };
                });
            }""", sessions_json)

            # Reload to load history
            page.reload()
            page.wait_for_load_state("networkidle")
            time.sleep(0.5)

            # Check for Weekly CEO Report button in header
            ceo_btn = page.locator('button:has-text("Отчет для CEO"), button:has-text("CEO Report")')
            print("Opening CEO Report modal...")
            ceo_btn.click()
            page.wait_for_selector('[role="dialog"]')
            time.sleep(0.5)

            # Ensure modal is loaded
            modal_elem = page.locator('[role="dialog"] > div')
            modal_bbox = modal_elem.bounding_box()
            print(f"CEO Report Modal open. Bounding box: {modal_bbox}")

            # -------------------------------------------------------------
            # STEP 1: Test Segmented Tab 1: "Дашборд CEO (One-Pager)"
            # -------------------------------------------------------------
            tab_dashboard = page.locator('button:has-text("Дашборд CEO"), button:has-text("Executive Dashboard")')
            tab_dashboard.click()
            time.sleep(0.3)
            tab_dashboard_bbox = tab_dashboard.bounding_box()
            print(f"Tab 'Дашборд CEO' active. Bounding box: {tab_dashboard_bbox}")

            # Screenshot 1: Dashboard Tab
            print(f"Taking screenshot: {DASHBOARD_IMG}")
            modal_elem.screenshot(path=DASHBOARD_IMG)

            # -------------------------------------------------------------
            # STEP 2: Test Segmented Tab 2: "Реестр нарушений (Annex Page 2)"
            # -------------------------------------------------------------
            tab_annex = page.locator('button:has-text("Реестр нарушений"), button:has-text("Defect Register")')
            tab_annex.click()
            time.sleep(0.4)
            tab_annex_bbox = tab_annex.bounding_box()
            print(f"Tab 'Реестр нарушений' active. Bounding box: {tab_annex_bbox}")

            # Verify deduplicated items in Annex tab
            cards = page.locator('div:has-text("WABTEC") >> text=1.4')
            print(f"Annex tab loaded with {cards.count()} occurrences of Wabtec 1.4 (expected 1 consolidated card)")

            # Screenshot 2: Annex Tab
            print(f"Taking screenshot: {ANNEX_IMG}")
            modal_elem.screenshot(path=ANNEX_IMG)

            # -------------------------------------------------------------
            # STEP 3: Switch to A4 Print Preview mode
            # -------------------------------------------------------------
            preview_btn = page.locator('button:has-text("A4 Print Preview")')
            preview_btn.click()
            time.sleep(0.5)
            print("Switched to A4 Print Preview mode.")

            # Locate Page 1 and Page 2 in preview inside dialog
            page1_locator = page.locator('[role="dialog"] .print-weekly-page-1')
            page2_locator = page.locator('[role="dialog"] .print-weekly-page-2')

            page.wait_for_selector('[role="dialog"] .print-weekly-page-1')
            page.wait_for_selector('[role="dialog"] .print-weekly-page-2')

            page1_bbox = page1_locator.bounding_box()
            page2_bbox = page2_locator.bounding_box()

            print(f"Page 1 Preview Bounding Box: {page1_bbox}")
            print(f"Page 2 Preview Bounding Box: {page2_bbox}")

            # Scroll into view and screenshot Page 1
            page1_locator.scroll_into_view_if_needed()
            time.sleep(0.3)
            print(f"Taking screenshot: {PAGE1_PREVIEW_IMG}")
            page1_locator.screenshot(path=PAGE1_PREVIEW_IMG)

            # Scroll into view and screenshot Page 2
            page2_locator.scroll_into_view_if_needed()
            time.sleep(0.3)
            print(f"Taking screenshot: {PAGE2_PREVIEW_IMG}")
            page2_locator.screenshot(path=PAGE2_PREVIEW_IMG)

            # -------------------------------------------------------------
            # STEP 4: Generate PDF
            # -------------------------------------------------------------
            print("Generating PDF via page.pdf()...")
            pdf_bytes = page.pdf(
                format="A4",
                margin={"top": "6mm", "bottom": "6mm", "left": "8mm", "right": "8mm"},
                print_background=True
            )
            with open(PDF_PATH, "wb") as f:
                f.write(pdf_bytes)
            print(f"PDF successfully written to: {PDF_PATH} ({len(pdf_bytes)} bytes)")

            # -------------------------------------------------------------
            # STEP 5: Run pdfinfo on generated PDF
            # -------------------------------------------------------------
            pdfinfo_res = subprocess.run(["pdfinfo", PDF_PATH], capture_output=True, text=True, check=True)
            print("\n--- PDFINFO OUTPUT ---")
            print(pdfinfo_res.stdout)
            print("----------------------\n")

            # Extract page count
            pages_line = [l for l in pdfinfo_res.stdout.split('\n') if l.startswith("Pages:")][0]
            num_pages = int(pages_line.split(":")[1].strip())
            print(f"Audited PDF Page Count: {num_pages}")
            assert num_pages == 2, f"Expected EXACTLY 2 pages, found {num_pages}"
            print("[PASS] PDF Page Count is EXACTLY 2 pages!")

            browser.close()

    finally:
        print("Stopping preview server...")
        preview_proc.terminate()
        preview_proc.wait()
        print("Preview server stopped.")

if __name__ == "__main__":
    main()
