export interface DailyChartMeal {
  id: string;
  mealType: string;
  mealTypeName: string;
  title: string;
  kcal: number;
  time: string;
}

export interface DailyChartItem {
  date: string;
  label: string;
  dateLabel: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  mealsCount: number;
  isExceeded: boolean;
  status: 'exceeded' | 'optimal' | 'under' | 'empty';
  meals: DailyChartMeal[];
}

export interface MacroDetail {
  percent: number;
  totalGrams: number;
  targetGrams: number;
  avgGrams: number;
}

export interface MealBreakdownItem {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  kcal: number;
  count: number;
  percent: number;
  color: string;
}

export interface TopFoodItem {
  name: string;
  count: number;
  totalKcal: number;
}

export interface WeightStats {
  currentKg: number;
  diffKg: number;
  periodDays: number;
  heightCm: number;
  bmi: number;
  bmiStatus: string;
  history: { date: string; weightKg: number }[];
}

export interface StatisticsData {
  days: number;
  periodLabel: string;
  targets: {
    kcal: number;
    protein?: number;
    carb?: number;
    fat?: number;
  };
  kpi: {
    avgKcal: number;
    totalKcal: number;
    totalMeals: number;
    daysWithMeals: number;
    daysOnTarget: number;
    daysExceeded: number;
  };
  dailyChart: DailyChartItem[];
  macros: {
    protein: MacroDetail;
    carb: MacroDetail;
    fat: MacroDetail;
  };
  mealBreakdown: MealBreakdownItem[];
  topFoods: TopFoodItem[];
  weight: WeightStats;
  insights: string[];
}
