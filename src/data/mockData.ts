import { InspectionSession } from '../types/inspection';
import { CHECKLIST_ITEMS_TEMPLATE } from './checklistData';

// Realistic base64 sample thumbnails for demo photos
const SAMPLE_PHOTO_1 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23fee2e2"/><path d="M50 150 L150 50 L250 150 Z" fill="%23ef4444"/><circle cx="150" cy="115" r="8" fill="white"/><rect x="146" y="80" width="8" height="25" rx="4" fill="white"/><text x="150" y="180" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23991b1b" text-anchor="middle">DEFECT: BLOCKED AISLE</text></svg>';

const SAMPLE_PHOTO_2 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23fef3c7"/><rect x="40" y="40" width="220" height="120" rx="8" fill="%23f59e0b"/><text x="150" y="105" font-family="sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">OIL SPILL NEAR CNC #4</text><text x="150" y="135" font-family="sans-serif" font-size="12" fill="%2378350f" text-anchor="middle">Absorbent mat needed</text></svg>';

const SAMPLE_PHOTO_3 = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect width="300" height="200" fill="%23e0e7ff"/><polygon points="150,30 270,170 30,170" fill="%234338ca"/><text x="150" y="120" font-family="sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">RACK BENT BEAM</text><text x="150" y="150" font-family="sans-serif" font-size="12" fill="%23c7d2fe" text-anchor="middle">Bay 04-B / Level 2</text></svg>';

export function getSampleDemoSession(): InspectionSession {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const startTime = '08:30';
  const endTime = '09:15';

  const items = CHECKLIST_ITEMS_TEMPLATE.map((tpl) => {
    const item = { ...tpl };

    if (item.id === '1.2') {
      // Fail: Aisle blocked
      item.status = 'FAIL';
      item.defectDetails = {
        location: 'Главный проезд цеха №2, напротив станка Лазерной резки',
        description: 'Паллета с необработанным листовым металлом оставлена посреди основного эвакуационного прохода. Сужение прохода до 70 см.',
        priority: 'P1',
        assignedTo: 'Logistics',
        targetDate: 'Today',
        photos: [
          {
            id: 'photo-1',
            url: SAMPLE_PHOTO_1,
            caption: 'Паллета перекрывает разметку прохода',
            timestamp: new Date().toISOString(),
          },
        ],
        notes: 'Уведомлен бригадир логистики. Требуется немедленно переместить в зону буферного хранения B-12.',
        resolutionStatus: 'Open',
      };
    } else if (item.id === '2.2') {
      // Fail: Oil spill
      item.status = 'FAIL';
      item.defectDetails = {
        location: 'Фрезерный участок, рабочая станция CNC-04',
        description: 'Капельная течь СОЖ/масла из гидравлического шланга, лужа диаметром ~40 см без предупредительного знака.',
        priority: 'P2',
        assignedTo: 'Maintenance',
        targetDate: 'Today',
        photos: [
          {
            id: 'photo-2',
            url: SAMPLE_PHOTO_2,
            caption: 'Масляное пятно у основания станка',
            timestamp: new Date().toISOString(),
          },
        ],
        notes: 'Сорбент нанесен оператором. Служба ТО вызвана для замены уплотнительного кольца штуцера.',
        resolutionStatus: 'In Progress',
      };
    } else if (item.id === '3.1') {
      // Fail: Bent rack upright
      item.status = 'FAIL';
      item.defectDetails = {
        location: 'Склад готовой продукции, Ряд 04, Секция B (Bay 04-B)',
        description: 'След удара вилочного погрузчика на нижней части вертикальной стойки. Глубина деформации около 15 мм. Отсутствует один защитный штифт на втором ярусе.',
        priority: 'P1',
        assignedTo: 'Facilities',
        targetDate: 'Tomorrow AM',
        photos: [
          {
            id: 'photo-3',
            url: SAMPLE_PHOTO_3,
            caption: 'Деформация профиля стойки стеллажа',
            timestamp: new Date().toISOString(),
          },
        ],
        notes: 'Ярус временно разгружен. Заказан ремонтный комплект отбойника и балочный штифт.',
        resolutionStatus: 'Open',
      };
    } else if (item.id === '4.1') {
      // Fail: Scrap bin overflowing
      item.status = 'FAIL';
      item.defectDetails = {
        location: 'Уличная площадка сбора ТБО и металлической стружки (Рампа 3)',
        description: 'Контейнер для алюминиевой стружки заполнен на 100% с «горкой». Мелкая стружка осыпается на асфальт.',
        priority: 'P3',
        assignedTo: 'Facilities',
        targetDate: 'Tomorrow AM',
        photos: [],
        notes: 'Заявка региональному оператору на вывоз контейнера отправлена диспетчером.',
        resolutionStatus: 'Open',
      };
    } else if (item.id === '3.4') {
      // Pass with note
      item.status = 'PASS';
      item.itemNotes = 'Зарядная станция АКБ штабелеров в идеальном порядке. Фонтанчик для глаз протестирован.';
    } else if (item.id === '4.3') {
      item.status = 'PASS';
      item.itemNotes = 'Все 4 турникета и наружные двери защелкнуты на магнитные замки.';
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
    facilityName: 'Производственно-складской комплекс «Север»',
    facilityArea: 'Цех металлообработки №1, Склад ГП, Доковая зона и Периметр',
    shift: 'Смена 1 (Дневная / 08:00 - 20:00)',
    inspectorName: 'Смирнов Дмитрий Владимирович',
    inspectorRole: 'Ведущий инженер по ОТ, ПБ и 5S (EHS Lead)',
    items,
    generalNotes: 'Общий уровень соблюдения стандартов 5S оценивается на 88%. Персонал цеха в 100% составе в защитных очках. Выявлены 2 критических несоответствия (P1: загромождение прохода и деформация стойки стеллажа), оперативные меры приняты в ходе обхода.',
    status: 'Completed',
    signatures: {
      inspector: 'Смирнов Д. В.',
      inspectorTitle: 'Ведущий инженер EHS',
      timestamp: new Date().toISOString(),
      reviewedBy: 'Ковалев М. Н. (Начальник производства)',
      reviewTimestamp: new Date().toISOString(),
    },
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
