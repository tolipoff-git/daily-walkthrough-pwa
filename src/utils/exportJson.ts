import { InspectionSession } from '../types/inspection';
import { getReportFileName } from './formatters';

export function exportInspectionToJson(session: InspectionSession): void {
  const jsonStr = JSON.stringify(session, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = getReportFileName(session, 'json');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importInspectionFromJson(file: File): Promise<InspectionSession> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as InspectionSession;
        if (!parsed.id || !parsed.items || !Array.isArray(parsed.items)) {
          throw new Error('Invalid inspection file structure / Некорректный формат файла инспекции');
        }
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read error / Ошибка чтения файла'));
    reader.readAsText(file);
  });
}
