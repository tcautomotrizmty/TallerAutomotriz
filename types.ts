
export enum RepairStatus {
  PENDING = 'PENDING',
  OPERATIONS = 'OPERATIONS',
  REASSEMBLY = 'REASSEMBLY',
  TESTING = 'TESTING',
  TESTING_OK = 'TESTING_OK',
  CLEANING = 'CLEANING',
  READY = 'READY',
  CANCELLED = 'CANCELLED'
}

export enum ItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum UserRole {
  CLIENT = 'CLIENT',
  STAFF = 'STAFF', 
  ADMIN = 'ADMIN'
}

export interface WorkshopSettings {
  name: string;
  slogan: string;
  primaryColor: string;
  accentColor: string;
  invoiceTitle?: string;
  invoiceSubtitle?: string;
  invoiceFooter?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: number;
}

export type ItemType = 'SERVICE' | 'PART';

export interface JobItem {
  id: string;
  name: string;
  price: number;
  type: ItemType;
  status: ItemStatus;
  firstStartTime?: number;
  startTime?: number;
  endTime?: number;
  beforePhoto?: string;
  afterPhoto?: string;
  isCustom?: boolean;
}

export interface ServiceType {
  id: string;
  name: string;
  price: number;
  type: ItemType;
}

export interface WorkflowStep {
  id: string;
  label: string;
  order: number;
}

export interface ChatMessage {
  id: string;
  sender: 'STAFF' | 'CLIENT';
  senderName?: string;
  senderEmail?: string;
  text: string;
  timestamp: number;
  isApprovalRequest?: boolean;
  isApproved?: boolean;
}

export interface VehicleJob {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  carModel: string;
  plate: string;
  intakeDate: number;
  intakePhotos: string[];
  items: JobItem[];
  currentStepId: string;
  overallStatus: RepairStatus;
  messages: ChatMessage[];
  createdAt: number;
  totalBudget: number;
  assignedTechnician?: string;
}

export type ViewMode = 
  | 'CLIENT_TRACK' 
  | 'STAFF_DASHBOARD' 
  | 'RECEPTION' 
  | 'STATION_SCAN' 
  | 'ADMIN_SERVICES' 
  | 'ADMIN_PANEL' 
  | 'USER_PROFILE' 
  | 'ADMIN_WORKFLOW' 
  | 'INVOICE_PRINT'
  | 'ADMIN_HISTORY'
  | 'ADMIN_SETTINGS';
