import { Timestamp } from 'firebase/firestore';

export interface Product {
  id?: string;
  category: string;
  title: string;
  description?: string;
  unit: 'UN' | 'LT' | 'PC';
  price: number;
  stock?: number;
  imageUrl?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
