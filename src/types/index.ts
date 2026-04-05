export type TransactionType = "INCOME" | "EXPENSE";

export interface User {
  id: string;
  email: string;
  name: string | null;
  currency: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  keywords: string[];
  isDefault: boolean;
  userId: string;
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  type: TransactionType;
  categoryId: string | null;
  category: Category | null;
  userId: string;
  date: string | Date;
  isRecurring: boolean;
  recurringInterval: string | null;
  notes: string | null;
  createdAt: string | Date;
}

export interface Budget {
  id: string;
  amount: number;
  categoryId: string;
  category: Category;
  userId: string;
  month: number;
  year: number;
  spent?: number; // computed field
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | Date | null;
  color: string;
  icon: string;
  userId: string;
}

export interface Insight {
  type: "warning" | "info" | "success" | "danger";
  title: string;
  description: string;
  icon: string;
}

export interface MonthlyStats {
  month: string;
  income: number;
  expenses: number;
}

export interface CategoryStats {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
}

export interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  categoryStats: CategoryStats[];
  monthlyStats: MonthlyStats[];
  recentTransactions: Transaction[];
  insights: Insight[];
  budgetAlerts: BudgetAlert[];
}

export interface BudgetAlert {
  categoryName: string;
  budgeted: number;
  spent: number;
  percentage: number;
  color: string;
}
