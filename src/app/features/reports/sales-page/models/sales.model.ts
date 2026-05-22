import { Timestamp } from 'firebase/firestore';
import { CategoriesType } from '../../../../shared/models/categories.type';

export type SalesCategoryFilter = 'all' | CategoriesType;

export interface SaleItem {
  productId: string;
  productTitle: string;
  quantity: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  createdAt: Timestamp;
  paymentMethod: string;
  totalPaid: number;
  userName: string;
  items: SaleItem[];
  category?: CategoriesType | string;
}

export interface SalesFilters {
  startDate: Date | null;
  endDate: Date | null;
  category: SalesCategoryFilter;
  userName: string;
}
