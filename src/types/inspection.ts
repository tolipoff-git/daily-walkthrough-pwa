export type InspectionStatus = 'PASS' | 'FAIL' | 'NA' | 'PENDING';

export type Priority = 'P1' | 'P2' | 'P3';

export type Assignee =
  | 'Maintenance'
  | 'Logistics'
  | 'Facilities'
  | 'Safety & EHS'
  | 'Production'
  | 'Warehouse'
  | 'Quality'
  | 'Cleaning';

export type TargetDatePreset = 'Today' | 'Tomorrow AM' | 'Next Shift' | 'End of Week' | 'Custom';

export interface DefectPhoto {
  id: string;
  url: string; // Data URL or Blob URL
  caption?: string;
  timestamp: string;
}

export interface DefectDetails {
  location: string;
  zonePreset?: string;
  description: string;
  priority: Priority;
  assignedTo: Assignee;
  targetDate: string;
  customTargetDate?: string;
  photos: DefectPhoto[];
  notes?: string;
  isRepeatIssue?: boolean;
  resolutionStatus: 'Open' | 'In Progress' | 'Resolved';
}

export interface ChecklistItem {
  id: string; // e.g. "1.1", "2.3"
  categoryId: string;
  categoryTitleRu: string;
  categoryTitleEn: string;
  titleRu: string;
  titleEn: string;
  standardRu: string;
  standardEn: string;
  guidelines?: string[];
  status: InspectionStatus;
  defectDetails?: DefectDetails;
  itemNotes?: string; // Quick note even when PASS / NA
}

export interface CategoryGroup {
  id: string;
  number: number;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  iconName: string;
  items: ChecklistItem[];
}

export interface InspectionSession {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  facilityName: string;
  facilityArea: string;
  shift: string;
  inspectorName: string;
  inspectorRole: string;
  items: ChecklistItem[];
  generalNotes: string;
  weatherOrConditions?: string;
  status: 'In Progress' | 'Completed' | 'Signed Off';
  signatures: {
    inspector: string;
    inspectorTitle?: string;
    timestamp: string;
    reviewedBy?: string;
    reviewTimestamp?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InspectionMetrics {
  total: number;
  completed: number;
  pending: number;
  passed: number;
  failed: number;
  na: number;
  scorePercentage: number;
  criticalP1Count: number;
  shiftP2Count: number;
  scheduledP3Count: number;
}
