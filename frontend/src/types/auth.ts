export type Targets = {
  bmr?: number;
  tdee?: number;
  kcal?: number;
  protein?: number;
  carb?: number;
  fat?: number;
};

export type BodyMetric = {
  heightCm?: number;
  weightKg?: number;
  recordedAt?: string;
};

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  hasProfile: boolean;
  gender?: 'male' | 'female';
  birthYear?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose' | 'maintain' | 'gain_muscle' | 'balanced';
  targets?: Targets;
  latestMetric?: BodyMetric;
};

export type ProfileInput = {
  fullName?: string;
  gender?: 'male' | 'female';
  birthYear?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: 'lose' | 'maintain' | 'gain_muscle' | 'balanced';
  heightCm?: number;
  weightKg?: number;
};

export type MealSummaryItem = {
  id: string;
  mealType: string;
  mealLabel: string;
  title: string;
  kcal: number;
  done: boolean;
  iconBg?: string;
};

export type TodaySummary = {
  targets: {
    bmr: number;
    tdee: number;
    kcal: number;
    protein: number;
    carb: number;
    fat: number;
  };
  consumed: {
    kcal: number;
    protein: number;
    carb: number;
    fat: number;
  };
  remainingKcal: number;
  meals: MealSummaryItem[];
  recommendation: string;
  selectedDate?: string;
  dateLabel?: string;
  daysWithMeals?: string[];
  isToday?: boolean;
};

export type AuthResponse = {
  token: string;
  user: User;
};