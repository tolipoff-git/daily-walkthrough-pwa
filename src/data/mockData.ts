import { InspectionSession } from '../types/inspection';
import { CHECKLIST_ITEMS_TEMPLATE } from './checklistData';
import { Language } from '../i18n/types';

// Realistic base64 sample thumbnails for demo photos
const SAMPLE_PHOTO_1 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23fee2e2"/><path d="M50 150 L150 50 L250 150 Z" fill="%23ef4444"/><circle cx="150" cy="115" r="8" fill="white"/><rect x="146" y="80" width="8" height="25" rx="4" fill="white"/><text x="150" y="180" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23991b1b" text-anchor="middle">DEFECT: BLOCKED AISLE</text></svg>';

const SAMPLE_PHOTO_2 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23fef3c7"/><rect x="40" y="40" width="220" height="120" rx="8" fill="%23f59e0b"/><text x="150" y="105" font-family="sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">OIL SPILL NEAR CNC #4</text><text x="150" y="135" font-family="sans-serif" font-size="12" fill="%2378350f" text-anchor="middle">Absorbent mat needed</text></svg>';

const SAMPLE_PHOTO_3 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23e0e7ff"/><polygon points="150,30 270,170 30,170" fill="%234338ca"/><text x="150" y="120" font-family="sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">RACK BENT BEAM</text><text x="150" y="150" font-family="sans-serif" font-size="12" fill="%23c7d2fe" text-anchor="middle">Bay 04-B / Level 2</text></svg>';

export function getSampleDemoSession(lang: Language = 'ru'): InspectionSession {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const startTime = '08:30';
  const endTime = '09:15';

  const isRu = lang === 'ru';

  const items = CHECKLIST_ITEMS_TEMPLATE.map((tpl) => {
    const item = { ...tpl };

    if (item.id === '1.2') {
      // Fail: Aisle blocked
      item.status = 'FAIL';
      item.defectDetails = {
        location: isRu
          ? 'Главный проезд цеха №2, напротив станка Лазерной резки'
          : 'Shop Floor #2 Main Aisle, opposite Laser Cutter #1',
        zonePreset: isRu ? 'Цех №2 (Сборка & Упаковка)' : 'Shop Floor 2 (Assembly & Pkg)',
        description: isRu
          ? 'Паллета с необработанным листовым металлом оставлена посреди основного эвакуационного прохода. Сужение прохода до 70 см.'
          : 'Pallet of unprocessed sheet metal staged in the middle of primary emergency evacuation aisle. Aisle width narrowed to 70 cm.',
        priority: 'P1',
        assignedTo: 'Logistics',
        targetDate: 'Today',
        photos: [
          {
            id: 'photo-1',
            url: SAMPLE_PHOTO_1,
            caption: isRu ? 'Паллета перекрывает разметку прохода' : 'Pallet encroaching yellow aisle demarcation',
            timestamp: new Date().toISOString(),
          },
        ],
        notes: isRu
          ? 'Уведомлен бригадир логистики. Требуется немедленно переместить в зону буферного хранения B-12.'
          : 'Logistics shift lead notified. Immediate relocation to buffer storage bay B-12 required.',
        resolutionStatus: 'Open',
      };
    } else if (item.id === '2.2') {
      // Fail: Oil spill
      item.status = 'FAIL';
      item.defectDetails = {
        location: isRu
          ? 'Фрезерный участок, рабочая станция CNC-04'
          : 'Milling & Turning cell, CNC station #04',
        zonePreset: isRu ? 'Цех №1 (Металлообработка)' : 'Shop Floor 1 (Machining & Fab)',
        description: isRu
          ? 'Капельная течь СОЖ/масла из гидравлического шланга, лужа диаметром ~40 см без предупредительного знака.'
          : 'Hydraulic coolant/oil dripping from pressurized hose fitting, creating a ~40cm puddle with no warning cone.',
        priority: 'P2',
        assignedTo: 'Maintenance',
        targetDate: 'Today',
        photos: [
          {
            id: 'photo-2',
            url: SAMPLE_PHOTO_2,
            caption: isRu ? 'Масляное пятно у основания станка' : 'Oil puddle at machine base',
            timestamp: new Date().toISOString(),
          },
        ],
        notes: isRu
          ? 'Сорбент нанесен оператором. Служба ТО вызвана для замены уплотнительного кольца штуцера.'
          : 'Absorbent granules applied by operator. Maintenance dispatched for O-ring and fitting replacement.',
        resolutionStatus: 'In Progress',
      };
    } else if (item.id === '3.1') {
      // Fail: Bent rack upright
      item.status = 'FAIL';
      item.defectDetails = {
        location: isRu
          ? 'Склад готовой продукции, Ряд 04, Секция B (Bay 04-B)'
          : 'Finished Goods Warehouse, Row 04, Bay B (Bay 04-B)',
        zonePreset: isRu ? 'Склад ГП (Ряды 1-10)' : 'FG Warehouse (Aisles 1-10)',
        description: isRu
          ? 'След удара вилочного погрузчика на нижней части вертикальной стойки. Глубина деформации около 15 мм. Отсутствует один защитный штифт на втором ярусе.'
          : 'Forklift impact visible on lower rack upright column. Dent depth approximately 15mm. Missing safety beam lock pin on tier 2.',
        priority: 'P1',
        assignedTo: 'Facilities',
        targetDate: 'Tomorrow AM',
        photos: [
          {
            id: 'photo-3',
            url: SAMPLE_PHOTO_3,
            caption: isRu ? 'Деформация профиля стойки стеллажа' : 'Structural rack column deformation',
            timestamp: new Date().toISOString(),
          },
        ],
        notes: isRu
          ? 'Ярус временно разгружен. Заказан ремонтный комплект отбойника и балочный штифт.'
          : 'Tier offloaded temporarily. Replacement column protector and beam locking pin ordered.',
        resolutionStatus: 'Open',
      };
    } else if (item.id === '4.1') {
      // Fail: Scrap bin overflowing
      item.status = 'FAIL';
      item.defectDetails = {
        location: isRu
          ? 'Уличная площадка сбора ТБО и металлической стружки (Рампа 3)'
          : 'Outdoor Scrap & Waste Yard (Ramp 3)',
        zonePreset: isRu ? 'Наружный периметр & КПП' : 'Perimeter & Security Gate',
        description: isRu
          ? 'Контейнер для алюминиевой стружки заполнен на 100% с «горкой». Мелкая стружка осыпается на асфальт.'
          : 'Aluminum scrap dumpster filled past rim level. Metal shavings spilling onto asphalt roadway.',
        priority: 'P3',
        assignedTo: 'Facilities',
        targetDate: 'Tomorrow AM',
        photos: [],
        notes: isRu
          ? 'Заявка региональному оператору на вывоз контейнера отправлена диспетчером.'
          : 'Haul-away pickup request submitted to regional recycling contractor.',
        resolutionStatus: 'Open',
      };
    } else if (item.id === '3.4') {
      // Pass with note
      item.status = 'PASS';
      item.itemNotes = isRu
        ? 'Зарядная станция АКБ штабелеров в идеальном порядке. Фонтанчик для глаз протестирован.'
        : 'Forklift battery charging area clean and ventilated. Emergency eyewash tested.';
    } else if (item.id === '4.3') {
      item.status = 'PASS';
      item.itemNotes = isRu
        ? 'Все 4 турникета и наружные двери защелкнуты на магнитные замки.'
        : 'All 4 access turnstiles and exterior magnetic door locks fully functional.';
    } else {
      // Everything else passed
      item.status = 'PASS';
    }

    return item;
  });

  return {
    id: `INS-${dateStr.replace(/-/g, '')}-DEMO`,
    date: dateStr,
    startTime,
    endTime,
    facilityName: isRu
      ? 'Производственно-складской комплекс «Север»'
      : 'North Industrial & Logistics Complex',
    facilityArea: isRu
      ? 'Цех металлообработки №1, Склад ГП, Доковая зона и Периметр'
      : 'Fabrication Shop 1, FG Warehouse, Loading Docks & Perimeter',
    shift: isRu
      ? 'Смена 1 (Дневная / 08:00 - 20:00)'
      : 'Shift 1 (Day / 08:00 - 20:00)',
    inspectorName: isRu ? 'Смирнов Дмитрий Владимирович' : 'David S. Miller',
    inspectorRole: isRu
      ? 'Ведущий инженер по ОТ, ПБ и 5S (EHS Lead)'
      : 'Lead EHS Specialist & 5S Auditor',
    items,
    generalNotes: isRu
      ? 'Общий уровень соблюдения стандартов 5S оценивается на 88%. Персонал цеха в 100% составе в защитных очках. Выявлены 2 критических несоответствия (P1: загромождение прохода и деформация стойки стеллажа), оперативные меры приняты в ходе обхода.'
      : 'Overall 5S compliance assessed at 88%. 100% of shop floor personnel wearing safety glasses. 2 critical issues identified (P1: aisle obstruction and rack upright deformation); corrective containment initiated during the walk.',
    status: 'Completed',
    signatures: {
      inspector: isRu ? 'Смирнов Д. В.' : 'David S. Miller',
      inspectorTitle: isRu ? 'Ведущий инженер EHS' : 'Lead EHS Specialist',
      timestamp: new Date().toISOString(),
      reviewedBy: isRu ? 'Ковалев М. Н. (Начальник производства)' : 'Mark Stevens (Operations Lead)',
      reviewTimestamp: new Date().toISOString(),
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
