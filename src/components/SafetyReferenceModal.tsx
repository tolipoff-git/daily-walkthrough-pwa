import React, { useState } from 'react';
import { 
  ShieldAlert, 
  X, 
  AlertOctagon, 
  Glasses, 
  FileText, 
  CheckCircle2, 
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerHaptic } from '../utils/haptics';

interface SafetyReferenceModalProps {
  onClose: () => void;
}

type TabType = 'ghs' | 'ppe' | 'sds';

export const SafetyReferenceModal: React.FC<SafetyReferenceModalProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('ghs');
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
      nameRu: 'Пламя над кругом (Flame Over Circle / Oxidizers)',
      nameEn: 'Flame Over Circle (Oxidizers)',
      descRu: 'Окислители: вещества, выделяющие кислород и усиливающие горение других материалов.',
      descEn: 'Oxidizing gases, liquids and solids (substances that release oxygen to support combustion).',
      icon: '⭕🔥',
    },
    {
      nameRu: 'Газовый баллон (Gas Cylinder)',
      nameEn: 'Gas Cylinder',
      descRu: 'Газы под давлением, сжатые, сжиженные или охлажденные растворенные газы.',
      descEn: 'Gases under pressure (compressed, liquefied, dissolved, refrigerated).',
      icon: '🛢️',
    },
    {
      nameRu: 'Череп и скрещенные кости (Skull & Crossbones)',
      nameEn: 'Skull & Crossbones (Acute Toxicity)',
      descRu: 'Острая токсичность: смертельно или ядовито при проглатывании, вдыхании или контакте с кожей.',
      descEn: 'Acute toxicity (fatal or toxic if swallowed, inhaled, or absorbed through skin).',
      icon: '☠️',
    },
    {
      nameRu: 'Окружающая среда (Environment)',
      nameEn: 'Environment (Aquatic Toxicity)',
      descRu: 'Токсичность для водной флоры и фауны (в OSHA не является обязательной, но рекомендуется).',
      descEn: 'Aquatic toxicity (acute/chronic). Note: non-mandatory under OSHA HCS.',
      icon: '🐟🌳',
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fade-in print:hidden"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative max-w-4xl w-full bg-slate-900 border border-slate-750 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
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
                <span>{isRu ? 'Справочник безопасности FSE (HazCom & PPE)' : 'FSE Safety & HazCom Refresher Guide'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/60 font-mono">
                  Rev 1 (Apr 2025)
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isRu 
                  ? 'Стандарты OSHA 29 CFR 1910.1200, правила СИЗ и маркировки химикатов' 
                  : 'OSHA 29 CFR 1910.1200 HazCom, PPE Rules & SDS Standards'}
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/50 px-4 pt-2 gap-2 overflow-x-auto">
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
            <span>{isRu ? '9 Пиктограмм GHS и Этикетки' : '9 GHS Pictograms & Labels'}</span>
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
            <span>{isRu ? 'Паспорта SDS и Права OSH' : '16-Section SDS & OSH Rights'}</span>
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
              {/* Eye & Face Rule Card (Highlighted) */}
              <div className="p-4 bg-gradient-to-r from-red-950/50 via-slate-900 to-slate-900 border-2 border-red-800/80 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-red-600/20 border border-red-500 rounded-lg text-red-400 shrink-0">
                    <Glasses className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{isRu ? 'Критическое правило FSE: Лицевой щиток и защитные очки' : 'FSE Core Rule: Face Shield & Eye Protection'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded font-bold">MANDATORY</span>
                    </h4>
                    <p className="text-xs text-red-200 font-semibold mt-1">
                      {isRu
                        ? '«Лицевой щиток НЕ предназначен для самостоятельной защиты глаз. Защитные очки (ANSI Z87.1) должны быть ВСЕГДА надеты ПОД лицевым щитком!»'
                        : '«A face shield is NOT designed to protect your eyes. Always use the correct type eye protection (ANSI Z87.1) WITH a face shield!»'}
                    </p>
                    <div className="mt-2 text-xs text-slate-300 space-y-1">
                      <p>• {isRu ? 'Ежедневный осмотр очков: замена при наличии сколов, трещин и глубоких царапин на линзах.' : 'Daily lens inspection: replace pitted or cracked lenses immediately.'}</p>
                      <p>• {isRu ? 'Обязательны при: резке, шлифовке, сверлении, работе с химикатами и каплями СОЖ.' : 'Required for: grinding, cutting, drilling, machining, chemical splashes.'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Other PPE Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="font-bold text-blue-400 text-sm block mb-1">
                    👟 {isRu ? 'Защита ног (Foot Protection)' : 'Foot Protection'}
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {isRu
                      ? 'Обувь со стальным/композитным подноском и защитой от прокола. Защищает от падения инструмента и бочек, острых гвоздей/стружки, горячих и скользких полов.'
                      : 'Steel/composite toe footwear. Protects against heavy rolling tools/drums, sharp nails/chips, hot/slippery floors, and chemical splashes.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="font-bold text-emerald-400 text-sm block mb-1">
                    🧤 {isRu ? 'Защита рук (Hand Protection)' : 'Hand Protection'}
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {isRu
                      ? 'Перчатки по типу работ: против порезов (Cut-Resistant), термостойкие от ожогов, нитриловые/химические для предотвращения впитывания токсинов.'
                      : 'Task-specific gloves: cut-resistant, thermal burn protection, and chemical-resistant gloves to prevent absorption and amputations.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="font-bold text-purple-400 text-sm block mb-1">
                    🎧 {isRu ? 'Защита слуха (Hearing Protection)' : 'Hearing Protection'}
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {isRu
                      ? 'Беруши или наушники в зонах повышенного шума, при работе с торцовочными пилами и пневмоинструментом.'
                      : 'Earplugs / earmuffs required in high noise areas, saw cutting, and pneumatic impact operations.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
                  <span className="font-bold text-amber-400 text-sm block mb-1">
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

          {/* TAB 3: SDS & OSH ACT RIGHTS */}
          {activeTab === 'sds' && (
            <div className="space-y-5">
              {/* SDS 16-Sections Overview */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {isRu ? '16 Разделов паспорта безопасности SDS (Slides 35-37)' : '16 Standardized SDS Sections (Slides 35-37)'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {[
                    '1. Identification',
                    '2. Hazard(s) ID',
                    '3. Composition / Ingredients',
                    '4. First-Aid Measures',
                    '5. Fire-Fighting Measures',
                    '6. Accidental Release',
                    '7. Handling & Storage',
                    '8. Exposure Controls / PPE',
                    '9. Physical & Chemical Props',
                    '10. Stability & Reactivity',
                    '11. Toxicological Info',
                    '12. Ecological (Non-mand.)',
                    '13. Disposal (Non-mand.)',
                    '14. Transport (Non-mand.)',
                    '15. Regulatory (Non-mand.)',
                    '16. Other Information',
                  ].map((sec, i) => (
                    <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      <span className="font-semibold text-slate-200">{sec}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-3 italic">
                  {isRu 
                    ? '*Паспорта SDS обязаны быть на английском языке и доступны всем работникам перед началом работы с химикатом.' 
                    : '*SDSs must be in English and reviewed by workers prior to chemical handling.'}
                </p>
              </div>

              {/* OSH Act Rights */}
              <div className="p-4 bg-slate-950/90 border border-indigo-800/60 rounded-xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
                  {isRu ? 'Права работников согласно OSH Act (Slide 38):' : 'Worker Rights under the OSH Act (Slide 38):'}
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>{isRu ? 'Право на безопасные и здоровые условия труда на рабочем месте.' : 'Right to safe and healthful working conditions.'}</li>
                  <li>{isRu ? 'Право запросить инспекцию OSHA на предприятии.' : 'Right to ask OSHA to inspect the workplace.'}</li>
                  <li>{isRu ? 'Право изучать журнал травматизма и профзаболеваний работодателя.' : 'Right to review employer records of work-related injuries & illnesses.'}</li>
                  <li>{isRu ? 'Право получать копии своих медицинских карт и регулярное обучение по стандартам OSHA.' : 'Right to obtain copies of medical records and receive Hazard Communication training.'}</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {isRu ? 'First Source Electronics • Safety Refresher 2025' : 'First Source Electronics • Safety Refresher 2025'}
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
