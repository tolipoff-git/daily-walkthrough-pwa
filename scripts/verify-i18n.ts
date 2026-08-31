import { en } from '../src/i18n/en';
import { 
  CHECKLIST_ITEMS_TEMPLATE, 
  INITIAL_CHECKLIST_DATA, 
  getItemTitle, 
  getItemStandard, 
  getItemGuidelines, 
  getCategoryName, 
  getCategoryDescription,
  createNewInspectionSession
} from '../src/data/checklistData';
import { getSampleDemoSession } from '../src/data/mockData';
import { generatePlaintextReport } from '../src/utils/exportPlaintext';
import { DEFAULT_PERSONNEL_EN } from '../src/utils/personnelStorage';

const CYRILLIC_REGEX = /[\u0400-\u04FF]/;

function checkNoCyrillic(obj: any, path = ''): string[] {
  const errors: string[] = [];
  if (typeof obj === 'string') {
    if (CYRILLIC_REGEX.test(obj)) {
      errors.push(`[${path}]: Found Cyrillic in English text: "${obj}"`);
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((val, idx) => {
      errors.push(...checkNoCyrillic(val, `${path}[${idx}]`));
    });
  } else if (typeof obj === 'object' && obj !== null) {
    Object.keys(obj).forEach((key) => {
      errors.push(...checkNoCyrillic(obj[key], path ? `${path}.${key}` : key));
    });
  }
  return errors;
}

console.log('--- STARTING COMPREHENSIVE ENGLISH LOCALIZATION AUDIT ---');

let totalErrors: string[] = [];

// 1. Audit en.ts dictionary
console.log('1. Auditing en.ts dictionary...');
const enErrors = checkNoCyrillic(en, 'i18n/en.ts');
totalErrors.push(...enErrors);
console.log(`   en.ts errors: ${enErrors.length}`);

// 2. Audit checklist items in English
console.log('2. Auditing CHECKLIST_ITEMS_TEMPLATE in English...');
CHECKLIST_ITEMS_TEMPLATE.forEach((item) => {
  const title = getItemTitle(item, 'en');
  const standard = getItemStandard(item, 'en');
  const guidelines = getItemGuidelines(item, 'en');

  if (!title) totalErrors.push(`Item ${item.id} missing titleEn`);
  if (!standard) totalErrors.push(`Item ${item.id} missing standardEn`);
  if (!guidelines || guidelines.length === 0) totalErrors.push(`Item ${item.id} missing guidelinesEn`);

  totalErrors.push(...checkNoCyrillic(title, `Item ${item.id} titleEn`));
  totalErrors.push(...checkNoCyrillic(standard, `Item ${item.id} standardEn`));
  totalErrors.push(...checkNoCyrillic(guidelines, `Item ${item.id} guidelinesEn`));
});
console.log(`   Total checklist items verified: ${CHECKLIST_ITEMS_TEMPLATE.length}`);

// 3. Audit categories in English
console.log('3. Auditing INITIAL_CHECKLIST_DATA in English...');
INITIAL_CHECKLIST_DATA.forEach((cat) => {
  const name = getCategoryName(cat, 'en');
  const desc = getCategoryDescription(cat, 'en');
  totalErrors.push(...checkNoCyrillic(name, `Category ${cat.id} titleEn`));
  totalErrors.push(...checkNoCyrillic(desc, `Category ${cat.id} descriptionEn`));
});

// 4. Audit new English session
console.log('4. Auditing createNewInspectionSession("en")...');
const newSessionEn = createNewInspectionSession('en');
totalErrors.push(...checkNoCyrillic(newSessionEn.facilityName, 'newSessionEn.facilityName'));
totalErrors.push(...checkNoCyrillic(newSessionEn.facilityArea, 'newSessionEn.facilityArea'));
totalErrors.push(...checkNoCyrillic(newSessionEn.shift, 'newSessionEn.shift'));
totalErrors.push(...checkNoCyrillic(newSessionEn.inspectorName, 'newSessionEn.inspectorName'));
totalErrors.push(...checkNoCyrillic(newSessionEn.inspectorRole, 'newSessionEn.inspectorRole'));
totalErrors.push(...checkNoCyrillic(newSessionEn.generalNotes, 'newSessionEn.generalNotes'));
totalErrors.push(...checkNoCyrillic(newSessionEn.signatures.inspector, 'newSessionEn.signatures.inspector'));
totalErrors.push(...checkNoCyrillic(newSessionEn.signatures.inspectorTitle, 'newSessionEn.signatures.inspectorTitle'));

// 5. Audit English demo data fields
console.log('5. Auditing getSampleDemoSession("en") rendered fields...');
const demoSessionEn = getSampleDemoSession('en');
totalErrors.push(...checkNoCyrillic(demoSessionEn.facilityName, 'demoSessionEn.facilityName'));
totalErrors.push(...checkNoCyrillic(demoSessionEn.facilityArea, 'demoSessionEn.facilityArea'));
totalErrors.push(...checkNoCyrillic(demoSessionEn.shift, 'demoSessionEn.shift'));
totalErrors.push(...checkNoCyrillic(demoSessionEn.inspectorName, 'demoSessionEn.inspectorName'));
totalErrors.push(...checkNoCyrillic(demoSessionEn.inspectorRole, 'demoSessionEn.inspectorRole'));
totalErrors.push(...checkNoCyrillic(demoSessionEn.generalNotes, 'demoSessionEn.generalNotes'));
totalErrors.push(...checkNoCyrillic(demoSessionEn.signatures, 'demoSessionEn.signatures'));

demoSessionEn.items.forEach((item) => {
  if (item.defectDetails) {
    totalErrors.push(...checkNoCyrillic(item.defectDetails.location, `demoSessionEn item ${item.id} location`));
    totalErrors.push(...checkNoCyrillic(item.defectDetails.zonePreset, `demoSessionEn item ${item.id} zonePreset`));
    totalErrors.push(...checkNoCyrillic(item.defectDetails.description, `demoSessionEn item ${item.id} description`));
    totalErrors.push(...checkNoCyrillic(item.defectDetails.notes, `demoSessionEn item ${item.id} notes`));
    item.defectDetails.photos?.forEach((photo, pIdx) => {
      totalErrors.push(...checkNoCyrillic(photo.caption, `demoSessionEn item ${item.id} photo ${pIdx} caption`));
    });
  }
  if (item.itemNotes) {
    totalErrors.push(...checkNoCyrillic(item.itemNotes, `demoSessionEn item ${item.id} itemNotes`));
  }
});

// 6. Audit English plaintext export
console.log('6. Auditing generatePlaintextReport(demoSessionEn, "en")...');
const plaintextEn = generatePlaintextReport(demoSessionEn, 'en');
totalErrors.push(...checkNoCyrillic(plaintextEn, 'plaintextEn'));

// 7. Audit DEFAULT_PERSONNEL_EN
console.log('7. Auditing DEFAULT_PERSONNEL_EN...');
totalErrors.push(...checkNoCyrillic(DEFAULT_PERSONNEL_EN, 'DEFAULT_PERSONNEL_EN'));

console.log('---------------------------------------------------------');
if (totalErrors.length === 0) {
  console.log(' SUCCESS: ZERO Cyrillic characters found in English mode! Flawless localization.');
} else {
  console.error(` FAILED: Found ${totalErrors.length} Cyrillic localization errors:`);
  totalErrors.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}
