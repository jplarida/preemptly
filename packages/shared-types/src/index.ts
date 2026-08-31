// ========== Enums ==========

export enum LocationType {
  HOME = 'HOME',
  BUSINESS = 'BUSINESS',
}

export enum TankModel {
  EXCHANGE = 'EXCHANGE',
  REFILL = 'REFILL',
}

export enum UsageLevel {
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  HEAVY = 'HEAVY',
}

export enum Confidence {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum AdjustmentType {
  COOKED_MORE = 'COOKED_MORE',
  COOKED_LESS = 'COOKED_LESS',
  NORMAL = 'NORMAL',
}

export enum LinkMethod {
  INVITE_LINK = 'INVITE_LINK',
  QR_CODE = 'QR_CODE',
  MANUAL_CODE = 'MANUAL_CODE',
}

export enum LinkStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

// ========== API Request/Response Types ==========

// Auth
export interface SendOtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
}

export interface AuthResponse {
  accessToken: string;
  isNewUser: boolean;
  user: UserResponse;
}

// User
export interface UserResponse {
  id: string;
  name: string | null;
  phone: string;
  region: string;
  createdAt: string;
}

export interface UpdateUserRequest {
  name?: string;
  region?: string;
}

// Location
export interface CreateLocationRequest {
  address: string;
  type: LocationType;
  timezone?: string;
}

export interface LocationResponse {
  id: string;
  userId: string;
  address: string;
  type: LocationType;
  timezone: string;
  createdAt: string;
}

// Tank
export interface CreateTankRequest {
  locationId: string;
  capacityKg: number;
  unit?: string;
  model: TankModel;
  usageLevel: UsageLevel;
}

export interface TankResponse {
  id: string;
  locationId: string;
  capacityKg: number;
  unit: string;
  model: TankModel;
  usageLevel: UsageLevel;
  lastRefillDate: string;
  isActive: boolean;
  createdAt: string;
}

// Prediction
export interface PredictionResponse {
  tankId: string;
  daysElapsed: number;
  estimatedTotalDays: number;
  estimatedRemainingDays: number;
  displayRange: {
    low: number;
    high: number;
  };
  confidence: Confidence;
  refillCount: number;
  currentAdjustment: AdjustmentType | null;
}

// Refill
export interface LogRefillRequest {
  refillDate?: string; // ISO date string, defaults to today
}

export interface RefillLogResponse {
  id: string;
  tankId: string;
  refillDate: string;
  actualCycleDays: number | null;
  isOutlier: boolean;
  confirmedByUser: boolean;
  createdAt: string;
}

// Adjustment
export interface AdjustRequest {
  adjustment: AdjustmentType;
}

// Order
export interface CreateOrderRequest {
  tankId: string;
  retailerId: string;
  note?: string;
}

export interface OrderResponse {
  id: string;
  tankId: string;
  customerId: string;
  retailerId: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  tank?: TankResponse;
  customer?: UserResponse;
  retailer?: RetailerResponse;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

// Retailer
export interface RegisterRetailerRequest {
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
}

export interface RetailerResponse {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  inviteCode: string;
  inviteLink: string;
  isActive: boolean;
  createdAt: string;
}

export interface RetailerDashboardResponse {
  customerCount: number;
  pendingOrders: number;
  runningLowCount: number;
  newThisMonth: number;
}

export interface CustomerWithStatus {
  id: string;
  name: string | null;
  phone: string;
  tankCapacityKg: number | null;
  status: 'running_low' | 'okay' | 'new';
  daysRemaining: number | null;
  displayRange: { low: number; high: number } | null;
  lastRefillDate: string | null;
  linkedDate: string;
}

// Linking
export interface RetailerPreviewResponse {
  id: string;
  businessName: string;
  city: string;
}

export interface LinkRetailerRequest {
  code: string;
  method: LinkMethod;
}

// Device Token
export interface RegisterDeviceTokenRequest {
  token: string;
  platform: Platform;
}

// Invite Stats
export interface InviteStatsResponse {
  totalClicks: number;
  totalJoins: number;
  dailyStats: Array<{
    date: string;
    clicks: number;
    joins: number;
  }>;
}
