import { ChecklistItem, InspectionMetrics } from '../types/inspection';

export const metricsCache = new Map<string, InspectionMetrics>();

export function calculateMetrics(items: ChecklistItem[]): InspectionMetrics {
  const cacheKey = items.map((i) => `${i.id}:${i.status}:${i.defectDetails?.priority || ''}`).join('|');
  const cached = metricsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const total = items.length;
  let passed = 0;
  let failed = 0;
  let na = 0;
  let pending = 0;
  let criticalP1Count = 0;
  let shiftP2Count = 0;
  let scheduledP3Count = 0;

  items.forEach((item) => {
    switch (item.status) {
      case 'PASS':
        passed++;
        break;
      case 'FAIL':
        failed++;
        if (item.defectDetails?.priority === 'P1') criticalP1Count++;
        else if (item.defectDetails?.priority === 'P2') shiftP2Count++;
        else if (item.defectDetails?.priority === 'P3') scheduledP3Count++;
        else shiftP2Count++; // Default to P2 if priority not set
        break;
      case 'NA':
        na++;
        break;
      case 'PENDING':
      default:
        pending++;
        break;
    }
  });

  const completed = passed + failed + na;
  // Applicable items evaluated for compliance score are passed + failed (100% if no items evaluated yet)
  const scorableItems = passed + failed;
  const scorePercentage = scorableItems > 0 ? Math.round((passed / scorableItems) * 100) : 100;

  const result: InspectionMetrics = {
    total,
    completed,
    pending,
    passed,
    failed,
    na,
    scorePercentage,
    criticalP1Count,
    shiftP2Count,
    scheduledP3Count,
  };

  metricsCache.set(cacheKey, result);
  if (metricsCache.size > 100) {
    const oldestKey = metricsCache.keys().next().value;
    if (oldestKey !== undefined) {
      metricsCache.delete(oldestKey);
    }
  }

  return result;
}
