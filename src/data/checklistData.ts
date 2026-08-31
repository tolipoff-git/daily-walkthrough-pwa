import { CategoryGroup, ChecklistItem, InspectionSession } from '../types/inspection';
import { Language } from '../i18n/types';
import { getDefaultPerson } from '../utils/personnelStorage';

export const INITIAL_CHECKLIST_DATA: Omit<CategoryGroup, 'items'>[] = [
  {
    id: 'cat1',
    number: 1,
    titleRu: 'Пути эвакуации и пожарная безопасность',
    titleEn: 'Life Safety & Egress',
    descriptionRu: 'Эвакуационные выходы, проходы, средства пожаротушения, электрощиты и знаки безопасности',
    descriptionEn: 'Emergency exits, travel aisles, fire extinguishers, electrical panels, and exit signage',
    iconName: 'Flame',
  },
  {
    id: 'cat2',
    number: 2,
    titleRu: 'Производственная зона и 5S',
    titleEn: 'Shop Floor & Workstations (5S)',
    descriptionRu: 'Кабельные трассы, состояние полов, порядок на столах, оснастка, кожухи, аварийные кнопки и химикаты',
    descriptionEn: 'Cables, slip & trip hazards, floor conditions, 5S workstation order, machine guarding, E-Stops & chemicals',
    iconName: 'Factory',
  },
  {
    id: 'cat3',
    number: 3,
    titleRu: 'Склад, стеллажи и доки',
    titleEn: 'Warehouse, Racking & Docks',
    descriptionRu: 'Стойки и балки стеллажей, безопасность штабелирования, ворота доков и рампы',
    descriptionEn: 'Rack uprights & beam pins, pallet stacking stability, dock levelers & gates',
    iconName: 'Warehouse',
  },
  {
    id: 'cat4',
    number: 4,
    titleRu: 'Инфраструктура, территория и отходы',
    titleEn: 'Facility, Grounds & Waste',
    descriptionRu: 'Контейнеры для отходов и стружки, общее освещение, наружный периметр, соблюдение СИЗ',
    descriptionEn: 'Scrap & waste dumpsters, high-bay lighting, perimeter access control, and mandatory PPE compliance',
    iconName: 'Building2',
  },
];

export const CHECKLIST_ITEMS_TEMPLATE: ChecklistItem[] = [
  // ==========================================
  // --- Category 1: Life Safety & Egress (5 items) ---
  // ==========================================
  {
    id: '1.1',
    categoryId: 'cat1',
    categoryTitleRu: 'Пути эвакуации и пожарная безопасность',
    categoryTitleEn: 'Life Safety & Egress',
    titleRu: '1.1. Эвакуационные выходы и двери',
    titleEn: '1.1. Emergency Exits & Doors',
    standardRu: 'Двери открываются легко, замки и защелки исправны, выходы свободны снаружи и изнутри.',
    standardEn: 'Doors operate smoothly, hardware/latches intact, exits unobstructed from both interior and exterior.',
    guidelinesRu: [
      'Проверить отсутствие навесных замков или блокировок в рабочее время',
      'Убедиться, что наружная площадка перед дверью не завалена снегом/паллетами',
      'Проверить работу нажимных штанг (panic bars / антипаника)',
    ],
    guidelinesEn: [
      'Verify no padlocks or unapproved locking devices during operational hours',
      'Ensure exterior landing is clear of snow, ice, pallets, or debris',
      'Test panic bars / exit hardware for smooth latch release',
    ],
    status: 'PENDING',
  },
  {
    id: '1.2',
    categoryId: 'cat1',
    categoryTitleRu: 'Пути эвакуации и пожарная безопасность',
    categoryTitleEn: 'Life Safety & Egress',
    titleRu: '1.2. Проходы (Main & Cross Aisles)',
    titleEn: '1.2. Aisles & Evacuation Routes',
    standardRu: 'Проходы не загромождены паллетами, коробками, оснасткой или мусором.',
    standardEn: 'Main and cross aisles remain unobstructed by pallets, cartons, tooling, or trash.',
    guidelinesRu: [
      'Минимальная ширина основных проходов соблюдена (не менее 1.2 – 1.5 м)',
      'Желтая демаркационная разметка видна и не заставлена грузами',
      'Отсутствуют временные «буферные зоны» посреди проходов',
    ],
    guidelinesEn: [
      'Minimum aisle width maintained (at least 1.2 - 1.5 m / 4-5 ft)',
      'Yellow floor striping / demarcation clearly visible and respected',
      'No staging buffers or temporary clutter blocking travel lanes',
    ],
    status: 'PENDING',
  },
  {
    id: '1.3',
    categoryId: 'cat1',
    categoryTitleRu: 'Пути эвакуации и пожарная безопасность',
    categoryTitleEn: 'Life Safety & Egress',
    titleRu: '1.3. Огнетушители и пожарные посты',
    titleEn: '1.3. Fire Extinguishers & Stations',
    standardRu: 'Доступ свободен (клиренс минимум 36" / 90 см), манометр в зеленой зоне, пломба/чека на месте, инспекционный таг подписан.',
    standardEn: 'Clear access (36" / 90cm minimum clearance), pressure gauge in green, safety seal/pin intact, monthly tag signed.',
    guidelinesRu: [
      'Зона 90 см перед огнетушителем свободна от ящиков и тележек',
      'Стрелка манометра строго в зеленом секторе',
      'Пломба целая, раструб/шланг без трещин и засоров',
      'Инспекционная бирка содержит актуальную отметку за текущий месяц',
    ],
    guidelinesEn: [
      '36-inch (90 cm) radius clear of storage, carts, or equipment',
      'Pressure gauge needle strictly in operable green zone',
      'Safety pin and tamper seal unbroken; nozzle/hose free of clogs',
      'Monthly inspection tag initialed for the current calendar month',
    ],
    status: 'PENDING',
  },
  {
    id: '1.4',
    categoryId: 'cat1',
    categoryTitleRu: 'Пути эвакуации и пожарная безопасность',
    categoryTitleEn: 'Life Safety & Egress',
    titleRu: '1.4. Электрощитовые и спринклерные узлы',
    titleEn: '1.4. Electrical Panels & Sprinkler Risers',
    standardRu: 'Доступ к рубильникам и панелям свободен (клиренс 36"), дверцы щитков закрыты.',
    standardEn: 'Access to circuit breakers and panels clear (36" clearance), panel doors latched shut.',
    guidelinesRu: [
      'Зона 1 метр перед электрощитами свободна и размечена желтой полосой',
      'Дверцы щитков заперты/зафиксированы, нет открытых токоведущих частей',
      'Спринклерные коллекторы и клапаны опломбированы в открытом положении',
    ],
    guidelinesEn: [
      '36-inch clearance maintained in front of all distribution boards and panels',
      'Panel covers and doors latched; zero exposed live wiring',
      'Sprinkler control riser valves locked/sealed in open position',
    ],
    status: 'PENDING',
  },
  {
    id: '1.5',
    categoryId: 'cat1',
    categoryTitleRu: 'Пути эвакуации и пожарная безопасность',
    categoryTitleEn: 'Life Safety & Egress',
    titleRu: '1.5. Аварийные указатели Exit и свет',
    titleEn: '1.5. Emergency Exit Signs & Lights',
    standardRu: 'Таблички «Exit» подсвечены, аварийные светильники исправны.',
    standardEn: 'Exit signs fully illuminated, emergency battery-backup lights functioning.',
    guidelinesRu: [
      'Все указатели «Выход / Exit» светятся равномерно',
      'Аварийные светильники направлены на пути эвакуации',
      'Нет разбитых плафонов или мигающих индикаторов неисправности',
    ],
    guidelinesEn: [
      'All Exit signs illuminated with no burnt-out bulbs or dark letters',
      'Emergency light heads properly aimed at egress paths',
      'No fault indicator LEDs blinking on battery backup packs',
    ],
    status: 'PENDING',
  },

  // ==========================================
  // --- Category 2: Shop Floor & Workstations (5 items) ---
  // ==========================================
  {
    id: '2.1',
    categoryId: 'cat2',
    categoryTitleRu: 'Производственная зона и 5S',
    categoryTitleEn: 'Shop Floor & Workstations (5S)',
    titleRu: '2.1. Спотыкания и кабели (Trip Hazards)',
    titleEn: '2.1. Cables & Trip Hazards',
    standardRu: 'Нет временных кабелей и удлинителей, протянутых через проходы без защиты/кабель-каналов.',
    standardEn: 'No loose cables, cords, or pneumatic hoses crossing walking paths without robust cord covers.',
    guidelinesRu: [
      'Все кабели и шланги убраны в кабельные мостики или подвешены',
      'Отсутствуют скрутки и самодельные удлинители',
      'Пневмошланги свернуты на катушках или подведены сверху',
    ],
    guidelinesEn: [
      'All power cords and airlines housed in bridge protectors or drop reels',
      'Zero daisy-chained power strips or makeshift extension cables',
      'Pneumatic coils retracted when not in active operation',
    ],
    status: 'PENDING',
  },
  {
    id: '2.2',
    categoryId: 'cat2',
    categoryTitleRu: 'Производственная зона и 5S',
    categoryTitleEn: 'Shop Floor & Workstations (5S)',
    titleRu: '2.2. Состояние полов и проливы',
    titleEn: '2.2. Floor Conditions & Cleanliness',
    standardRu: 'Поверхность сухая и чистая; нет пятен технологических жидкостей, выбоин, сколов или налипшей грязи.',
    standardEn: 'Floors dry and clean; free of oil/coolant spills, floor cracks, potholes, or heavy debris.',
    guidelinesRu: [
      'Отсутствуют лужи СОЖ, масла, воды вокруг оборудования',
      'При наличии проливов выставлены желтые таблички «Мокрый пол» и применен сорбент',
      'Покрытие пола ровное, без опасных выбоин под колеса погрузчиков',
    ],
    guidelinesEn: [
      'No standing puddles of coolant, hydraulic oil, or water around machines',
      'Wet floor caution cones placed immediately and absorbent applied to leaks',
      'Floor surface flat with no severe concrete spalls or potholes',
    ],
    status: 'PENDING',
  },
  {
    id: '2.3',
    categoryId: 'cat2',
    categoryTitleRu: 'Производственная зона и 5S',
    categoryTitleEn: 'Shop Floor & Workstations (5S)',
    titleRu: '2.3. Порядок на столах и оснастка (5S)',
    titleEn: '2.3. Workstation 5S & Tooling Storage',
    standardRu: 'Нет брошенного инструмента на столах/станках; оснастка возвращена на шадоу-борды/подставки.',
    standardEn: 'No unorganized tools on workbenches/machines; tooling returned to designated shadow boards and racks.',
    guidelinesRu: [
      'Инструмент разложен по ячейкам / оконтуренным местам',
      'Лишние детали, ветошь и брак удалены с рабочего места',
      'Шадоу-борды укомплектованы, бирки/ярлыки читаемы',
    ],
    guidelinesEn: [
      'Hand tools placed on dedicated shadow boards or pegboard hooks',
      'Scrap parts, dirty rags, and unused fixtures cleared off tables',
      'Tool bins and fixtures labeled according to 5S standards',
    ],
    status: 'PENDING',
  },
  {
    id: '2.4',
    categoryId: 'cat2',
    categoryTitleRu: 'Производственная зона и 5S',
    categoryTitleEn: 'Shop Floor & Workstations (5S)',
    titleRu: '2.4. Защита оборудования и E-Stop',
    titleEn: '2.4. Machine Guarding & E-Stops',
    standardRu: 'Защитные кожухи/экраны на месте, кнопки аварийной остановки физически доступны и не заблокированы.',
    standardEn: 'Protective guards/interlocks in place, emergency stop buttons accessible and unblocked.',
    guidelinesRu: [
      'Все защитные кожухи приводов, шпинделей и ремней зафиксированы',
      'Грибовидные кнопки E-Stop ярко-красные на желтом фоне и не загорожены деталями',
      'Световые завесы и концевики безопасности не заблокированы/не закорочены',
    ],
    guidelinesEn: [
      'All belt, spindle, and pinch-point interlocked guards secured',
      'Mushroom-head E-Stops clear of parts/tote bins and reachable within arm length',
      'Optical light curtains and safety interlocks functional without bypasses',
    ],
    status: 'PENDING',
  },
  {
    id: '2.5',
    categoryId: 'cat2',
    categoryTitleRu: 'Производственная зона и 5S',
    categoryTitleEn: 'Shop Floor & Workstations (5S)',
    titleRu: '2.5. Хранение химикатов, аптечки и промывка глаз',
    titleEn: '2.5. Chemical Storage, Eyewash & Spill Kits',
    standardRu: 'Химикаты маркированы и на поддонах-уловителях; аварийные души/промывки глаз и аптечки доступны и укомплектованы.',
    standardEn: 'Secondary containment in place for chemicals; SDS available; eyewash stations unobstructed and inspection tags updated.',
    guidelinesRu: [
      'Все емкости с химикатами и маслами имеют читаемые этикетки и паспорта безопасности (SDS)',
      'Поддоны для локализации проливов сухие и не заполнены отходами',
      'Доступ к станциям промывки глаз и аптечкам первой помощи свободен (не менее 90 см)',
    ],
    guidelinesEn: [
      'All chemical and oil containers clearly labeled with GHS pictograms and SDS accessible',
      'Spill containment pallets clean, dry, and capable of holding volume capacity',
      'Eyewash stations and first aid kits accessible within 10 seconds and unobstructed',
    ],
    status: 'PENDING',
  },

  // ==========================================
  // --- Category 3: Warehouse, Racking & Docks (3 items) ---
  // ==========================================
  {
    id: '3.1',
    categoryId: 'cat3',
    categoryTitleRu: 'Склад, стеллажи и доки',
    categoryTitleEn: 'Warehouse, Racking & Docks',
    titleRu: '3.1. Стеллажи (Rack Uprights & Beams)',
    titleEn: '3.1. Rack Uprights & Safety Pins',
    standardRu: 'Нет деформаций от погрузочной техники; предохранительные штифты (safety pins) на балках на месте.',
    standardEn: 'No structural impacts/bents from forklifts; beam safety pins fully locked in place.',
    guidelinesRu: [
      'Стойки стеллажей без вмятин и искривлений, отбойники на месте',
      'Каждое замковое соединение балки имеет фиксатор/штифт',
      'Таблички допустимой грузоподъемности (Load Capacity) на торцах стеллажей',
    ],
    guidelinesEn: [
      'Upright columns free of forklift dents or creases; column guards intact',
      'Every beam connector secured with approved locking safety pin',
      'Maximum load rating capacity plaques posted on aisle end frames',
    ],
    status: 'PENDING',
  },
  {
    id: '3.2',
    categoryId: 'cat3',
    categoryTitleRu: 'Склад, стеллажи и доки',
    categoryTitleEn: 'Warehouse, Racking & Docks',
    titleRu: '3.2. Укладка грузов и стабильность паллет',
    titleEn: '3.2. Pallet Stacking & Load Stability',
    standardRu: 'Паллеты на полках стоят ровно, без перекосов и опасных свесов.',
    standardEn: 'Pallets placed uniformly on beams, shrink-wrapped, no dangerous overhangs or tilt.',
    guidelinesRu: [
      'Стретч-пленка не повреждена, верхние ярусы обмотаны надежно',
      'Свес паллеты не превышает 50 мм за край балки',
      'Нижние паллеты не раздавлены весом верхних уровней',
    ],
    guidelinesEn: [
      'Stretch wrap intact with no loose corners or leaning columns',
      'Pallet overhang across beam edges does not exceed 50 mm (2 inches)',
      'Bottom cartons on pallets not crushed by excessive top load weight',
    ],
    status: 'PENDING',
  },
  {
    id: '3.3',
    categoryId: 'cat3',
    categoryTitleRu: 'Склад, стеллажи и доки',
    categoryTitleEn: 'Warehouse, Racking & Docks',
    titleRu: '3.3. Зона доков (Loading Docks & Gates)',
    titleEn: '3.3. Loading Docks & Gates',
    standardRu: 'Подъемные ворота исправны; защитные цепочки/шлагбаумы на открытых доках опущены; зона аппарелей чистая.',
    standardEn: 'Dock doors operational; safety chains/barriers latched when open; dock leveler pit clean.',
    guidelinesRu: [
      'На неиспользуемых открытых воротах натянута сигнальная цепь/барьер',
      'Уравнительные платформы (левеллеры) установлены заподлицо с полом',
      'В приямках доков нет мусора, снега и посторонних предметов',
    ],
    guidelinesEn: [
      'Safety chains or guard barriers latched across unoccupied open dock doors',
      'Dock leveler lip stored flush with floor level',
      'Dock pits swept clean of broken wood, shrink wrap, and water/ice',
    ],
    status: 'PENDING',
  },

  // ==========================================
  // --- Category 4: Facility, Grounds & Waste (4 items) ---
  // ==========================================
  {
    id: '4.1',
    categoryId: 'cat4',
    categoryTitleRu: 'Инфраструктура, территория и отходы',
    categoryTitleEn: 'Facility, Grounds & Waste',
    titleRu: '4.1. Контейнеры для отходов и металлолома',
    titleEn: '4.1. Waste & Scrap Dumpsters',
    standardRu: 'Контейнеры не заполнены с «горкой», вокруг нет рассыпанного мусора/стружки, вывоз заказывается при заполнении 80%+.',
    standardEn: 'Dumpsters not overflowing, area around bins swept clean, haul-away triggered at 80%+ capacity.',
    guidelinesRu: [
      'Крышки контейнеров могут закрываться, нет переполнения свыше бортов',
      'Раздельный сбор: металл, дерево, картон, опасные отходы не смешиваются',
      'Масляная ветошь утилизируется исключительно в герметичные металлические баки',
    ],
    guidelinesEn: [
      'Lids close securely; waste not piled over top rim',
      'Waste segregation: scrap metal, wood pallets, cardboard, and hazardous waste isolated',
      'Oily shop rags stored strictly in self-closing metal safety cans',
    ],
    status: 'PENDING',
  },
  {
    id: '4.2',
    categoryId: 'cat4',
    categoryTitleRu: 'Инфраструктура, территория и отходы',
    categoryTitleEn: 'Facility, Grounds & Waste',
    titleRu: '4.2. Освещение объекта и цеха',
    titleEn: '4.2. Facility & High-Bay Lighting',
    standardRu: 'Нет перегоревших ламп в цехе, на складе, над рабочими станциями и на рампе.',
    standardEn: 'No dead or flickering luminaires across shop floor, warehouse aisles, workbenches, or ramps.',
    guidelinesRu: [
      'Уровень освещенности на рабочих поверхностях достаточный для точных операций',
      'Нет стробоскопического эффекта и мерцания LED светильников',
      'Наружное освещение погрузочной рампы и дорожек исправно',
    ],
    guidelinesEn: [
      'Adequate lux/foot-candles on precision assembly benches and inspection points',
      'Zero strobe or flickering LED high-bay fixtures',
      'Exterior dock floodlights and personnel walking paths brightly lit',
    ],
    status: 'PENDING',
  },
  {
    id: '4.3',
    categoryId: 'cat4',
    categoryTitleRu: 'Инфраструктура, территория и отходы',
    categoryTitleEn: 'Facility, Grounds & Waste',
    titleRu: '4.3. Наружный периметр и входные группы',
    titleEn: '4.3. Perimeter, Entrances & Badge Readers',
    standardRu: 'Входные двери закрываются на доводчики, считыватели бейджей работают, подъезды к зданию свободны.',
    standardEn: 'Exterior doors close & latch via door closers, access control readers active, fire lanes clear.',
    guidelinesRu: [
      'СКУД (считыватели пропусков) срабатывают без задержек и сбоев',
      'Пожарные проезды вокруг здания свободны от припаркованного транспорта',
      'Ступени и пандусы входных групп не имеют наледи и сколов',
    ],
    guidelinesEn: [
      'Badge access card readers grant rapid access without mechanical fault',
      'Fire lanes around perimeter completely unobstructed by parked vehicles',
      'Exterior stairs and entrance ramps free of ice, salt build-up, and cracks',
    ],
    status: 'PENDING',
  },
  {
    id: '4.4',
    categoryId: 'cat4',
    categoryTitleRu: 'Инфраструктура, территория и отходы',
    categoryTitleEn: 'Facility, Grounds & Waste',
    titleRu: '4.4. СИЗ (PPE Compliance)',
    titleEn: '4.4. Personal Protective Equipment (PPE)',
    standardRu: 'Персонал в зоне производства использует защитные очки и спецобувь.',
    standardEn: '100% floor staff and visitors adhere to mandatory safety glasses, high-vis vests, and steel-toe boots.',
    guidelinesRu: [
      'Защитные очки надеты на всех сотрудниках и гостях в активной зоне',
      'Защитная обувь с металлическим/композитным подноском',
      'При повышенном уровне шума (станки, штампы) используются беруши/наушники',
    ],
    guidelinesEn: [
      'ANSI Z87.1 safety glasses worn by all personnel in manufacturing areas',
      'Steel/composite-toe safety footwear worn across plant and warehouse',
      'Hearing protection used in posted high-noise machining/stamping zones',
    ],
    status: 'PENDING',
  },
];

// Helper functions for dynamic localization
export function getItemTitle(item: { titleRu?: string; titleEn?: string; title?: string }, lang: Language = 'ru'): string {
  if (lang === 'en') return item.titleEn || item.title || item.titleRu || '';
  return item.titleRu || item.title || item.titleEn || '';
}

export function getItemStandard(item: { standardRu?: string; standardEn?: string; standard?: string }, lang: Language = 'ru'): string {
  if (lang === 'en') return item.standardEn || item.standard || item.standardRu || '';
  return item.standardRu || item.standard || item.standardEn || '';
}

export function getItemGuidelines(item: { guidelinesRu?: string[]; guidelinesEn?: string[]; guidelines?: string[] }, lang: Language = 'ru'): string[] {
  if (lang === 'en') return item.guidelinesEn || item.guidelines || item.guidelinesRu || [];
  return item.guidelinesRu || item.guidelines || item.guidelinesEn || [];
}

export function getItemGuideline(item: { guidelinesRu?: string[]; guidelinesEn?: string[]; guidelines?: string[] }, lang: Language = 'ru'): string[] {
  return getItemGuidelines(item, lang);
}

export function getCategoryName(cat: { titleRu?: string; titleEn?: string; title?: string }, lang: Language = 'ru'): string {
  if (lang === 'en') return cat.titleEn || cat.title || cat.titleRu || '';
  return cat.titleRu || cat.title || cat.titleEn || '';
}

export function getCategoryDescription(cat: { descriptionRu?: string; descriptionEn?: string; description?: string }, lang: Language = 'ru'): string {
  if (lang === 'en') return cat.descriptionEn || cat.description || cat.descriptionRu || '';
  return cat.descriptionRu || cat.description || cat.descriptionEn || '';
}

export function createNewInspectionSession(lang: Language = 'ru'): InspectionSession {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);

  const defaultPerson = typeof window !== 'undefined' ? getDefaultPerson(lang) : undefined;
  const defaultInspectorRu = defaultPerson?.name || 'Смирнов Д. В.';
  const defaultInspectorEn = defaultPerson?.name || 'J. Smith';
  const defaultRoleRu = defaultPerson?.role || 'Специалист по ОТ и ПБ / 5S Lead';
  const defaultRoleEn = defaultPerson?.role || 'Lead EHS Specialist & 5S Auditor';
  const defaultFacilityRu = 'Основной производственно-логистический комплекс';
  const defaultFacilityEn = 'Main Manufacturing & Logistics Complex';
  const defaultAreaRu = 'Все зоны (Цех 1 & 2, Склад ГП, Доки, Периметр)';
  const defaultAreaEn = 'All Zones (Shop Floor 1 & 2, FG Warehouse, Loading Docks, Grounds)';
  const defaultShiftRu = 'Смена 1 (Дневная / 08:00 - 20:00)';
  const defaultShiftEn = 'Shift 1 (Day / 08:00 - 20:00)';

  const savedInspector = typeof window !== 'undefined' ? localStorage.getItem('ehs_last_inspector') : null;
  const savedRole = typeof window !== 'undefined' ? localStorage.getItem('ehs_last_role') : null;
  const savedFacility = typeof window !== 'undefined' ? localStorage.getItem('ehs_last_facility') : null;

  const inspector = defaultPerson?.name || savedInspector || (lang === 'ru' ? defaultInspectorRu : defaultInspectorEn);
  const role = defaultPerson?.role || savedRole || (lang === 'ru' ? defaultRoleRu : defaultRoleEn);
  const facility = savedFacility || (lang === 'ru' ? defaultFacilityRu : defaultFacilityEn);
  const area = lang === 'ru' ? defaultAreaRu : defaultAreaEn;
  const shift = lang === 'ru' ? defaultShiftRu : defaultShiftEn;

  return {
    id: `INS-${dateStr.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    date: dateStr,
    startTime: timeStr,
    endTime: '',
    facilityName: facility,
    facilityArea: area,
    shift: shift,
    inspectorName: inspector,
    inspectorRole: role,
    items: CHECKLIST_ITEMS_TEMPLATE.map((item) => ({ ...item })),
    generalNotes: '',
    status: 'In Progress',
    signatures: {
      inspector: inspector,
      inspectorTitle: role,
      timestamp: new Date().toISOString(),
      reviewedBy: 'Rich Fitzgerald (Operations Manager)',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
