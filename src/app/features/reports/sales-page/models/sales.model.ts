import { Timestamp } from 'firebase/firestore';

export type SalesCategoryFilter = 'all' | 'alimentacao' | 'bebidas' | 'material-escolar' | 'outros';

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
  category?: SalesCategoryFilter | string;
}

export interface SalesFilters {
  startDate: Date | null;
  endDate: Date | null;
  category: SalesCategoryFilter;
  userName: string;
}
