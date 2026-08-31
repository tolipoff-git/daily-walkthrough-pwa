import { ChecklistItem, InspectionMetrics } from '../types/inspection';

export function calculateMetrics(items: ChecklistItem[]): InspectionMetrics {
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
  // Applicable items for scoring are total minus NA
  const scorableItems = total - na;
  const scorePercentage = scorableItems > 0 ? Math.round((passed / scorableItems) * 100) : 100;

  return {
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
}
