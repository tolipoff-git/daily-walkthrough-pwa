import React, { useState } from 'react';
import { 
  ShieldAlert, 
  X, 
  AlertOctagon, 
  Glasses, 
  FileText, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Info,
  ShieldCheck,
  Search
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

interface SafetyReferenceModalProps {
  onClose: () => void;
}

type TabType = 'ghs' | 'ppe' | 'sds';

interface SdsSection {
  number: number;
  titleEn: string;
  titleRu: string;
  mandatory: boolean;
  descEn: string;
  descRu: string;
  auditTipEn: string;
  auditTipRu: string;
  icon: string;
}

export const SafetyReferenceModal: React.FC<SafetyReferenceModalProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('ghs');
  const [expandedSection, setExpandedSection] = useState<number | null>(null);
  const [sdsSearch, setSdsSearch] = useState<string>('');
  const isRu = language === 'ru';

  const ghsPictograms = [
    {
      nameRu: 'Опасность для здоровья (Health Hazard)',
      nameEn: 'Health Hazard',
      descRu: 'Канцерогенность, мутагенность, репродуктивная токсичность, сенсибилизация дыхательных путей.',
      descEn: 'Carcinogen, mutagenicity, reproductive toxicity, respiratory sensitizer, target organ toxicity.',
      icon: '👤',
    },
    {
      nameRu: 'Пламя (Flame / Flammables)',
      nameEn: 'Flame (Flammables)',
      descRu: 'Легковоспламеняющиеся газы, жидкости, аэрозоли, самонагревающиеся и пирофорные вещества.',
      descEn: 'Flammable gases, liquids, aerosols, self-heating, pyrophorics, self-reactives.',
      icon: '🔥',
    },
    {
      nameRu: 'Восклицательный знак (Exclamation Mark)',
      nameEn: 'Exclamation Mark (Irritant)',
      descRu: 'Раздражение кожи/глаз, кожная сенсибилизация, острая токсичность (низкая), наркотическое действие.',
      descEn: 'Skin/eye irritant, skin sensitizer, acute toxicity (harmful), narcotic effects, respiratory tract irritant.',
      icon: '❗',
    },
    {
      nameRu: 'Коррозия (Corrosion)',
      nameEn: 'Corrosion',
      descRu: 'Разъедание кожи, серьезное повреждение глаз, коррозия металлов (кислоты, щелочи).',
      descEn: 'Skin corrosion/burns, serious eye damage, corrosive to metals.',
      icon: '🧪',
    },
    {
      nameRu: 'Взрывающаяся бомба (Exploding Bomb)',
      nameEn: 'Exploding Bomb',
      descRu: 'Взрывчатые вещества, самореактивные вещества и органические пероксиды.',
      descEn: 'Explosives, self-reactives, organic peroxides.',
      icon: '💥',
    },
    {
      nameRu: 'Пламя над кругом (Flame Over Circle)',
      nameEn: 'Flame Over Circle (Oxidizers)',
      descRu: 'Окисляющие газы, жидкости и твердые вещества (усиливают горение других материалов).',
      descEn: 'Oxidizing gases, liquids, solids (intensifies combustion of surrounding materials).',
      icon: '⭕',
    },
    {
      nameRu: 'Газовый баллон (Gas Cylinder)',
      nameEn: 'Gas Cylinder (Compressed Gases)',
      descRu: 'Газы под давлением, сжатые, сжиженные, растворенные или криогенные газы.',
      descEn: 'Gases under pressure, compressed, liquefied, dissolved, or cryogenic gases.',
      icon: '🛢️',
    },
    {
      nameRu: 'Череп и скрещенные кости (Skull & Crossbones)',
      nameEn: 'Skull and Crossbones (Acute Toxicity)',
      descRu: 'Острая летальная или тяжелая токсичность при вдыхании, проглатывании или контакте с кожей.',
      descEn: 'Acute severe or fatal toxicity (oral, dermal, inhalation).',
      icon: '☠️',
    },
    {
      nameRu: 'Окружающая среда (Environment)',
      nameEn: 'Environment (Aquatic Toxicity)',
      descRu: 'Острая и хроническая токсичность для водной флоры и фауны (не регулируется OSHA напрямую).',
      descEn: 'Acute and chronic aquatic environmental toxicity (EPA regulated).',
      icon: '🐟',
    },
  ];

  const sdsSections: SdsSection[] = [
    {
      number: 1,
      titleEn: 'Identification',
      titleRu: 'Идентификация продукта и производителя',
      mandatory: true,
      icon: '🏷️',
      descRu: 'Химическое наименование продукта, номер партии, рекомендуемое использование, контактные данные производителя и круглосуточный телефон экстренной службы (24/7 Emergency Phone).',
      descEn: 'Product identifier, manufacturer name, address, 24/7 emergency phone number, and recommended use / restrictions.',
      auditTipRu: 'Наименование в паспорте SDS должно в точности совпадать с надписью на бочке, канистре или вторичной таре.',
      auditTipEn: 'The chemical name on the SDS must strictly match the label on the primary and secondary container.',
    },
    {
      number: 2,
      titleEn: 'Hazard(s) Identification',
      titleRu: 'Идентификация опасностей',
      mandatory: true,
      icon: '⚠️',
      descRu: 'Классификация опасности по стандарту GHS, сигнальное слово (DANGER или WARNING), пиктограммы опасности, краткие характеристики опасности (H-statements) и меры предосторожности (P-statements).',
      descEn: 'GHS hazard classification, signal word (DANGER or WARNING), hazard pictograms, hazard statements, and precautionary statements.',
      auditTipRu: 'Все пиктограммы и сигнальное слово из этого раздела обязаны присутствовать на этикетке вторичной емкости.',
      auditTipEn: 'All hazard pictograms and signal words in this section must be replicated on all secondary shop floor containers.',
    },
    {
      number: 3,
      titleEn: 'Composition / Information on Ingredients',
      titleRu: 'Состав и информация о компонентах',
      mandatory: true,
      icon: '🧪',
      descRu: 'Перечень всех опасных химических веществ, примесей и стабилизаторов, включая их номера CAS (Chemical Abstracts Service), концентрации и процентное соотношение в смеси.',
      descEn: 'Chemical ingredients, common names, CAS numbers, impurities, concentration percentages, and trade secret claims.',
      auditTipRu: 'Проверяется наличие точных номеров CAS для идентификации токсичных компонентов.',
      auditTipEn: 'Verify exact CAS registry numbers to ensure proper toxic chemical identification.',
    },
    {
      number: 4,
      titleEn: 'First-Aid Measures',
      titleRu: 'Меры первой помощи',
      mandatory: true,
      icon: '🩹',
      descRu: 'Пошаговые инструкции первой помощи при вдыхании (inhalation), попадании на кожу (skin), в глаза (eye contact) или проглатывании (ingestion). Важнейшие острые и отложенные симптомы.',
      descEn: 'First-aid instructions by route of exposure (inhalation, skin, eye, ingestion), acute & delayed symptoms, and immediate medical treatment.',
      auditTipRu: 'Инспектор проверяет наличие станции промывки глаз (Eyewash) в 10 секундах доступности от места работы с веществом.',
      auditTipEn: 'Auditors verify emergency eyewash stations are within 10 seconds of travel time from chemical use areas.',
    },
    {
      number: 5,
      titleEn: 'Fire-Fighting Measures',
      titleRu: 'Меры пожаротушения',
      mandatory: true,
      icon: '🧯',
      descRu: 'Подходящие и запрещенные средства тушения (вода, пена, порошок CO2), специфические опасности горения (токсичные газы при пиролизе), специальное защитное снаряжение пожарных.',
      descEn: 'Suitable and unsuitable extinguishing media, specific chemical fire hazards (toxic fumes), and firefighter protective equipment.',
      auditTipRu: 'Убедитесь, что рядом с местом хранения химиката установлен огнетушитель правильного класса (Class B для ЛВЖ).',
      auditTipEn: 'Ensure appropriate fire extinguisher class (Class B for flammable liquids) is mounted within clearance zones.',
    },
    {
      number: 6,
      titleEn: 'Accidental Release Measures',
      titleRu: 'Меры при аварийных утечках и разливах',
      mandatory: true,
      icon: '🚧',
      descRu: 'Индивидуальные меры предосторожности, защитные средства, процедуры эвакуации персонала, методы локализации утечки и материалы для нейтрализации и сбора разлива.',
      descEn: 'Personal precautions, emergency evacuation procedures, spill containment, and cleanup absorbent materials.',
      auditTipRu: 'Проверьте укомплектованность наборов ликвидации разливов (Spill Kits) в цехе (сорбирующие подушки, боны, нейтрализаторы).',
      auditTipEn: 'Verify shop floor spill kits are fully stocked with absorbent pads, socks, and neutralizers.',
    },
    {
      number: 7,
      titleEn: 'Handling and Storage',
      titleRu: 'Правила обращения и хранения',
      mandatory: true,
      icon: '📦',
      descRu: 'Меры безопасности при ежедневной работе, предотвращение накопления статического электричества (заземление), условия безопасного хранения и перечень несовместимых материалов.',
      descEn: 'Safe handling precautions, electrostatic grounding requirements, secure storage conditions, and chemical incompatibilities.',
      auditTipRu: 'Химикаты несовместимых классов (кислоты и щелочи, окислители и горючие) должны храниться раздельно.',
      auditTipEn: 'Incompatible chemicals (acids and bases, oxidizers and flammables) must be physically segregated.',
    },
    {
      number: 8,
      titleEn: 'Exposure Controls / Personal Protection',
      titleRu: 'Контроль воздействия и средства индивидуальной защиты (СИЗ)',
      mandatory: true,
      icon: '🥽',
      descRu: 'Предельно допустимые концентрации в воздухе (OSHA PEL, ACGIH TLV), требования к вытяжной вентиляции, конкретные материалы СИЗ (нитриловые/бутиловые перчатки, респираторы, защитные очки ANSI Z87.1).',
      descEn: 'OSHA PELs, ACGIH TLVs, engineering ventilation controls, and specific mandatory PPE (glove material, eye/respiratory protection).',
      auditTipRu: 'Ключевой пункт проверки: СИЗ у рабочих в цехе должны в точности соответствовать требованиям этого раздела.',
      auditTipEn: 'Audit check: Verify on-duty operators wear the exact PPE specified in this section (e.g., nitrile gloves, Z87.1 eyewear).',
    },
    {
      number: 9,
      titleEn: 'Physical and Chemical Properties',
      titleRu: 'Физико-химические свойства',
      mandatory: true,
      icon: '🌡️',
      descRu: 'Внешний вид (цвет, агрегатное состояние), запах, значение pH, температура кипения, температура вспышки (Flash point), пределы взрываемости (LEL/UEL), летучесть и растворимость.',
      descEn: 'Appearance, odor, pH, boiling point, flash point, flammability/explosion limits, vapor density, and solubility.',
      auditTipRu: 'Температура вспышки (Flash Point) ниже 100°F (37.8°C) требует хранения в сертифицированных огнестойких шкафах.',
      auditTipEn: 'Flash point below 100°F (37.8°C) requires storage in certified fire safety cabinets.',
    },
    {
      number: 10,
      titleEn: 'Stability and Reactivity',
      titleRu: 'Стабильность и реакционная способность',
      mandatory: true,
      icon: '⚡',
      descRu: 'Химическая стабильность в нормальных условиях, возможность опасных экзотермических реакций, условия, которых следует избегать (нагрев, влага), и опасные продукты разложения.',
      descEn: 'Chemical stability, hazardous reaction possibilities, conditions to avoid (heat, shock, sunlight), and hazardous decomposition products.',
      auditTipRu: 'Проверяется температурный режим хранения и исключение прямого солнечного света или искрообразования.',
      auditTipEn: 'Inspect storage temperature controls and ensure isolation from ignition sources.',
    },
    {
      number: 11,
      titleEn: 'Toxicological Information',
      titleRu: 'Токсикологическая информация',
      mandatory: true,
      icon: '🧬',
      descRu: 'Пути попадания в организм, острые и хронические последствия для здоровья, дозы токсичности (LD50/LC50), канцерогенность (списки IARC, NTP, OSHA), мутагенность и воздействие на репродуктивную систему.',
      descEn: 'Routes of entry, acute & chronic health effects, toxicity metrics (LD50/LC50), carcinogenicity (IARC, NTP, OSHA), and organ toxicity.',
      auditTipRu: 'Особое внимание инспектора: химикаты со знаком Health Hazard требуют специального регулярного медицинского наблюдения.',
      auditTipEn: 'Special attention: chemicals marked as carcinogens require health monitoring and strict exposure logs.',
    },
    {
      number: 12,
      titleEn: 'Ecological Information (Non-mandatory)',
      titleRu: 'Экологическая информация (Не обязательно по OSHA, контроль EPA)',
      mandatory: false,
      icon: '🌿',
      descRu: 'Экотоксичность для водных организмов, биоразлагаемость, период полураспада, потенциал биоаккумуляции и подвижность химиката в почве.',
      descEn: 'Aquatic and terrestrial ecotoxicity, persistence, degradability, bioaccumulation potential, and soil mobility (EPA regulated).',
      auditTipRu: 'Строго запрещается сливать химикаты или остатки промывки в обычную дождевую или хозяйственную канализацию.',
      auditTipEn: 'Strict prohibition against dumping chemical wash-down into storm or municipal drains.',
    },
    {
      number: 13,
      titleEn: 'Disposal Considerations (Non-mandatory)',
      titleRu: 'Рекомендации по утилизации (Не обязательно по OSHA, контроль RCRA/EPA)',
      mandatory: false,
      icon: '🗑️',
      descRu: 'Безопасные методы утилизации химиката и остатков, классификация опасных отходов по RCRA (EPA Hazardous Waste), требования к нейтрализации и очистке пустой загрязненной тары.',
      descEn: 'Proper disposal practices, RCRA hazardous waste classification, and contaminated container decontamination.',
      auditTipRu: 'Проверьте наличие маркированных металлических контейнеров с самозакрывающимися крышками для утилизации ветоши с растворителями.',
      auditTipEn: 'Verify closed self-closing metal cans are used for solvent-contaminated rags and waste.',
    },
    {
      number: 14,
      titleEn: 'Transport Information (Non-mandatory)',
      titleRu: 'Информация при транспортировке (Не обязательно по OSHA, контроль DOT)',
      mandatory: false,
      icon: '🚚',
      descRu: 'Номер ООН (UN Number), официальное транспортное наименование по классификации DOT, класс опасности при транспортировке, группа упаковки (Packing Group I, II, III).',
      descEn: 'UN number, DOT proper shipping name, transport hazard class, and packing group (DOT / IATA regulated).',
      auditTipRu: 'Проверяется маркировка бочек и паллет при разгрузке в зоне доков (Loading Docks).',
      auditTipEn: 'Verify transport diamond placards and UN numbers on shipping freight at the loading dock.',
    },
    {
      number: 15,
      titleEn: 'Regulatory Information (Non-mandatory)',
      titleRu: 'Нормативная информация (Не обязательно по OSHA, контроль EPA/State)',
      mandatory: false,
      icon: '⚖️',
      descRu: 'Национальные и региональные экологические нормативы США: TSCA, SARA Title III (Emergency Planning & Community Right-to-Know), California Proposition 65, Clean Air Act.',
      descEn: 'Federal and State regulatory compliance status: TSCA, SARA Title III, OSHA PSM, California Prop 65, and Clean Air Act.',
      auditTipRu: 'Все применяемые на предприятии химикаты должны входить в утвержденный реестр HazCom предприятия.',
      auditTipEn: 'All on-site chemicals must be logged in the facility chemical inventory registry.',
    },
    {
      number: 16,
      titleEn: 'Other Information',
      titleRu: 'Прочая информация',
      mandatory: true,
      icon: '📅',
      descRu: 'Дата создания или последней ревизии паспорта SDS, рейтинг опасности по шкале NFPA 704 / HMIS, пояснения к аббревиатурам и перечень внесенных изменений.',
      descEn: 'Preparation date, latest revision date, NFPA 704 / HMIS hazard rating diamonds, glossary, and revision changelog.',
      auditTipRu: 'Паспорта SDS обязаны быть актуальными и обновляться производителем не реже чем раз в 6 месяцев при появлении новых данных.',
      auditTipEn: 'SDSs must be updated by the manufacturer within 6 months of new significant safety data.',
    },
  ];

  const filteredSections = sdsSections.filter((s) => {
    if (!sdsSearch.trim()) return true;
    const q = sdsSearch.toLowerCase();
    return (
      s.number.toString().includes(q) ||
      s.titleEn.toLowerCase().includes(q) ||
      s.titleRu.toLowerCase().includes(q) ||
      s.descEn.toLowerCase().includes(q) ||
      s.descRu.toLowerCase().includes(q) ||
      s.auditTipEn.toLowerCase().includes(q) ||
      s.auditTipRu.toLowerCase().includes(q)
    );
  });

  const toggleSection = (num: number) => {
    triggerHaptic(20);
    setExpandedSection(prev => prev === num ? null : num);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fade-in print:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-750 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isRu ? 'Справочник EHS & Стандарты FSE' : 'FSE Safety & EHS Standards Guide'}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal">
                  Rev 1 (Apr 2025)
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRu 
                  ? 'Корпоративные нормативы: HazCom 29 CFR 1910.1200, СИЗ, 9 пиктограмм GHS и 16 разделов SDS' 
                  : 'OSHA HazCom 1910.1200, PPE matrices, 9 GHS pictograms, and 16 SDS sections'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Bar */}
        <div className="flex items-center px-4 pt-3 border-b border-slate-800 bg-slate-950/40 gap-2 overflow-x-auto">
          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('ghs');
            }}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ghs'
                ? 'text-amber-400 border-amber-400 bg-slate-800/70'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span>{isRu ? 'Маркировка GHS и Пиктограммы' : 'GHS Labels & Pictograms'}</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('ppe');
            }}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ppe'
                ? 'text-blue-400 border-blue-400 bg-slate-800/70'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span>{isRu ? 'Стандарты СИЗ (PPE)' : 'FSE PPE Standards'}</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab('sds');
            }}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sds'
                ? 'text-emerald-400 border-emerald-400 bg-slate-800/70'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <span>{isRu ? '16 Разделов SDS и Права OSH' : '16-Section SDS & OSH Rights'}</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: GHS PICTOGRAMS & CONTAINER LABELS */}
          {activeTab === 'ghs' && (
            <div className="space-y-6">
              {/* Important Alert about Inverted Category Scale */}
              <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200 leading-relaxed">
                  <span className="font-bold text-white">
                    {isRu ? '⚠️ Важное правило шкалы опасности GHS (Slide 18): ' : '⚠️ Critical GHS Hazard Degree Scale Rule (Slide 18): '}
                  </span>
                  {isRu
                    ? 'Степень опасности химиката УМЕНЬШАЕТСЯ с ростом номера категории! Категория 1 — НАИБОЛЕЕ ОПАСНА (Most Harmful), Категория 4 — наименее опасна.'
                    : 'Harmful effect DECREASES when category number increases! Category 1 = MOST HARMFUL, Category 4 = LEAST HARMFUL.'}
                </div>
              </div>

              {/* 6 Mandatory Elements Checklist of GHS Label */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {isRu ? '6 обязательных элементов маркировки GHS на любой таре (Slide 20)' : '6 Mandatory Elements of a GHS Chemical Label (Slide 20)'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs text-slate-300">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-bold text-amber-300 block mb-1">1. Product Identifier</span>
                    {isRu ? 'Наименование / хим. формула продукта' : 'Chemical name / batch number'}
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-bold text-red-400 block mb-1">2. Signal Word</span>
                    <span className="font-mono text-[11px] font-bold text-red-300">DANGER</span> ({isRu ? 'высокий риск' : 'severe'}) / <span className="font-mono text-[11px] font-bold text-amber-300">WARNING</span> ({isRu ? 'умеренный' : 'less severe'})
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-bold text-blue-300 block mb-1">3. Hazard Pictograms</span>
                    {isRu ? 'Символы в красных ромбах' : 'Symbols in red diamond borders'}
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-bold text-purple-300 block mb-1">4. Hazard Statements</span>
                    {isRu ? 'Описание риска (напр. "Toxic if inhaled")' : 'Nature of hazard (e.g. "Toxic if inhaled")'}
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-bold text-emerald-300 block mb-1">5. Precautionary Statements</span>
                    {isRu ? 'Меры предосторожности и защиты' : 'Prevention & response measures'}
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="font-bold text-slate-200 block mb-1">6. Supplier / Manufacturer</span>
                    {isRu ? 'Контакты производителя (телефон, адрес)' : 'Name, address & emergency phone'}
                  </div>
                </div>
              </div>

              {/* Grid of 9 GHS Pictograms */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  {isRu ? '9 Официальных пиктограмм стандарта OSHA GHS' : '9 Official OSHA / GHS Hazard Pictograms'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {ghsPictograms.map((p, idx) => (
                    <div key={idx} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3">
                      <div className="text-2xl p-2 bg-slate-900 rounded-lg border border-slate-750 flex items-center justify-center shrink-0">
                        {p.icon}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {isRu ? p.nameRu : p.nameEn}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                          {isRu ? p.descRu : p.descEn}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PPE STANDARDS */}
          {activeTab === 'ppe' && (
            <div className="space-y-5">
              {/* Highlighted Rule: Eye Protection and Face Shield */}
              <div className="p-4 bg-blue-950/40 border border-blue-800/80 rounded-xl flex items-start gap-3.5">
                <Glasses className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-2 text-slate-200 leading-relaxed">
                  <h4 className="font-bold text-white text-sm">
                    {isRu ? 'Глазная защита и обязательное правило FSE (Slide 24):' : 'Eye Protection & Strict FSE Standard (Slide 24):'}
                  </h4>
                  <p>
                    {isRu
                      ? 'Очки безопасности ANSI Z87.1 обязательны ВСЕГДА на производственном участке. Проверяйте линзы ежедневно перед сменой.'
                      : 'ANSI Z87.1 safety glasses mandatory at all times on production floors. Inspect lenses daily before shift.'}
                  </p>
                  <div className="p-2.5 bg-blue-900/50 border border-blue-700/60 rounded-lg text-blue-200 font-semibold">
                    🛡️ {isRu 
                      ? 'ПРАВИЛО FSE: Защитный щиток (Face Shield) ВСЕГДА надевается ПОВЕРХ защитных очков. Сам по себе щиток НЕ является полноценной защитой глаз!'
                      : 'FSE RULE: Face shields must ALWAYS be worn WITH safety glasses underneath. A face shield alone is NOT adequate eye protection!'}
                  </div>
                </div>
              </div>

              {/* PPE Categories Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-white block mb-1 text-sm">
                    👞 {isRu ? 'Защитная обувь (Foot Protection)' : 'Foot Protection (Steel-Toe)'}
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {isRu
                      ? 'Обувь со стальным или композитным подноском обязательна в зонах погрузочных работ, перемещения тяжелых деталей и на складе.'
                      : 'Steel or composite toe footwear required in material handling, warehouse, and heavy part staging areas.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-white block mb-1 text-sm">
                    🧤 {isRu ? 'Защита рук и кожи (Hand Protection)' : 'Hand Protection (Gloves)'}
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {isRu
                      ? 'Используйте перчатки строго по назначению: антипорезные (Cut-resistant) при работе с металлом/пилами, химически стойкие (нитрил/неопрен) при контакте с СОЖ и растворителями.'
                      : 'Match glove material to specific task hazards: cut-resistant for sharp edges/saws, chemical-resistant (nitrile/neoprene) for solvents & coolants.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-white block mb-1 text-sm">
                    🎧 {isRu ? 'Защита слуха (Hearing Protection)' : 'Hearing Protection (Noise > 85 dBA)'}
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {isRu
                      ? 'Беруши или наушники обязательны в зонах работы пил, ударного инструмента и пневматического оборудования с уровнем шума выше 85 дБА.'
                      : 'Earplugs or earmuffs required in saw cutting, impact tool, and compressed air zones exceeding 85 dBA noise levels.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-white block mb-1 text-sm">
                    🦺 {isRu ? 'Светоотражающие жилеты (Hi-Vis)' : 'High-Visibility (Hi-Vis)'}
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {isRu
                      ? 'Светоотражающая одежда обязательна в зонах движения погрузчиков и при низком уровне освещения.'
                      : 'Retroreflective garments mandatory in all moving vehicle and forklift traffic zones, and in low-light environments.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SDS & OSH ACT RIGHTS (INTERACTIVE 16 SECTIONS) */}
          {activeTab === 'sds' && (
            <div className="space-y-5">
              {/* SDS 16-Sections Overview with Search */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      {isRu ? '16 Разделов паспорта безопасности SDS (Slides 35-37)' : '16 Standardized SDS Sections (Slides 35-37)'}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {isRu 
                        ? 'Нажмите на любой раздел, чтобы открыть подробное описание и критерии проверки при инспекции:' 
                        : 'Click on any section to expand requirements and audit inspection checkpoints:'}
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={sdsSearch}
                      onChange={(e) => setSdsSearch(e.target.value)}
                      placeholder={isRu ? 'Поиск раздела (напр. СИЗ, First Aid)...' : 'Search sections (e.g. PPE, Fire)...'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Interactive Accordion Grid */}
                <div className="space-y-2">
                  {filteredSections.map((sec) => {
                    const isExpanded = expandedSection === sec.number;
                    return (
                      <div 
                        key={sec.number}
                        className={`rounded-xl border transition-all overflow-hidden ${
                          isExpanded 
                            ? 'bg-slate-900 border-emerald-500/60 shadow-lg' 
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Section Header Button */}
                        <button
                          type="button"
                          onClick={() => toggleSection(sec.number)}
                          className="w-full p-3 flex items-center justify-between text-left gap-3 focus:outline-none"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">{sec.icon}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs">
                                  {sec.number}. {sec.titleEn}
                                </span>
                                {sec.mandatory ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold uppercase">
                                    OSHA Mandatory
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400 font-semibold uppercase">
                                    Non-Mandatory (EPA/DOT)
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {sec.titleRu}
                              </span>
                            </div>
                          </div>

                          <div className="p-1 rounded-lg bg-slate-800 text-slate-400 shrink-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {/* Expanded Section Details */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 bg-slate-950/50 space-y-2.5 text-xs text-slate-300 animate-fade-in">
                            <div className="leading-relaxed">
                              <span className="font-bold text-slate-200 block mb-0.5">
                                📋 {isRu ? 'Содержание раздела:' : 'Section Requirements:'}
                              </span>
                              <p className="text-slate-300">{isRu ? sec.descRu : sec.descEn}</p>
                              {isRu && <p className="text-slate-500 text-[11px] mt-1 font-mono">{sec.descEn}</p>}
                            </div>

                            <div className="p-2.5 bg-emerald-950/40 border border-emerald-900/60 rounded-lg text-emerald-200">
                              <span className="font-bold text-emerald-300 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {isRu ? 'Критерий проверки при ежедневном обходе:' : 'Audit Inspection Checkpoint:'}
                              </span>
                              <p className="text-xs leading-relaxed">{isRu ? sec.auditTipRu : sec.auditTipEn}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 mt-4 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isRu 
                      ? 'Паспорта SDS на предприятии обязаны быть на английском языке (English mandatory) и находиться в открытом доступе для всех работников до начала работы с химическими веществами. При появлении новых данных о безопасности производитель обязан обновить паспорт в течение 6 месяцев.' 
                      : 'SDSs must be kept in English and freely accessible to all employees prior to chemical handling. Manufacturers must revise and publish updated SDS within 6 months of new safety information.'}
                  </p>
                </div>
              </div>

              {/* OSH Act Rights */}
              <div className="p-4 bg-slate-950/90 border border-indigo-800/60 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {isRu ? 'Права работников согласно OSH Act (Slide 38):' : 'Worker Rights under the OSH Act (Slide 38):'}
                </h4>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{isRu ? 'Право на безопасные и здоровые условия труда на рабочем месте.' : 'Right to safe and healthful working conditions.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{isRu ? 'Право запросить конфиденциальную инспекцию OSHA на предприятии при наличии нарушений.' : 'Right to ask OSHA to inspect the workplace for hazardous violations.'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{isRu ? 'Право изучать журнал учета производственного травматизма и профзаболеваний (OSHA 300 Log).' : 'Right to review employer records of work-related injuries and illnesses (OSHA 300 Log).'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{isRu ? 'Право получать копии своих медицинских карт и проходить обязательное обучение по стандартам HazCom.' : 'Right to obtain copies of medical records and receive comprehensive Hazard Communication training.'}</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            OSHA 29 CFR 1910.1200 HazCom Standard
          </span>
          <button
            onClick={() => {
              triggerHaptic();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            {isRu ? 'Закрыть' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
