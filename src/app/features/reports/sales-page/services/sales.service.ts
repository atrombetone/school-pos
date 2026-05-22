import { Injectable, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import {
  Timestamp,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type QueryConstraint,
} from 'firebase/firestore';
import { Observable, catchError, from, map, of } from 'rxjs';
import { Sale, SaleItem, SalesCategoryFilter, SalesFilters } from '../models/sales.model';
import { CategoriesType, CATEGORY_OPTIONS } from '../../../../shared/models/categories.type';

const MAX_RESULTS = 250;

const MOCK_SALES: Sale[] = [
  {
    id: 'mock-sale-001',
    createdAt: Timestamp.fromDate(new Date('2026-05-22T08:10:00-03:00')),
    paymentMethod: 'cash',
    totalPaid: 24,
    userName: 'Ana Costa',
    category: 'Salgados',
    items: [
      { productId: 'p-1', productTitle: 'Coca-Cola 2L', quantity: 2, unitPrice: 8 },
      { productId: 'p-2', productTitle: 'Salgado assado', quantity: 1, unitPrice: 8 },
    ],
  },
  {
    id: 'mock-sale-002',
    createdAt: Timestamp.fromDate(new Date('2026-05-22T09:35:00-03:00')),
    paymentMethod: 'pix',
    totalPaid: 35,
    userName: 'Bruno Lima',
    category: 'Outros',
    items: [
      { productId: 'p-3', productTitle: 'Camiseta da turma', quantity: 1, unitPrice: 35 },
    ],
  },
  {
    id: 'mock-sale-003',
    createdAt: Timestamp.fromDate(new Date('2026-05-22T10:20:00-03:00')),
    paymentMethod: 'cash',
    totalPaid: 18,
    userName: 'Carla Souza',
    category: 'Bebidas geladas',
    items: [
      { productId: 'p-4', productTitle: 'Suco natural', quantity: 3, unitPrice: 6 },
    ],
  },
  {
    id: 'mock-sale-004',
    createdAt: Timestamp.fromDate(new Date('2026-05-22T11:05:00-03:00')),
    paymentMethod: 'cash',
    totalPaid: 12,
    userName: 'Diego Martins',
    category: 'Outros',
    items: [
      { productId: 'p-5', productTitle: 'Cartela de rifas', quantity: 3, unitPrice: 4 },
    ],
  },
];

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private readonly firestore = inject(Firestore);

  listSales(filters: Partial<SalesFilters> = {}, maxResults = MAX_RESULTS): Observable<Sale[]> {
    const salesRef = collection(this.firestore, 'cashRegisters');
    const constraints: QueryConstraint[] = [];

    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(maxResults));

    return from(Promise.all([
      getDocs(query(salesRef, ...constraints)),
      getDocs(query(collection(this.firestore, 'users'), limit(500))),
      getDocs(query(collection(this.firestore, 'products'), limit(1000))),
    ])).pipe(
      map(([salesSnapshot, usersSnapshot, productsSnapshot]) => {
        const usersByUid = new Map<string, string>();
        const productsById = new Map<string, string>();

        for (const userDoc of usersSnapshot.docs) {
          const data = userDoc.data() as Record<string, unknown>;
          const uid = String(data['uid'] ?? userDoc.id);
          const displayName = String(data['name'] ?? data['email'] ?? uid);
          usersByUid.set(uid, displayName);
        }

        for (const productDoc of productsSnapshot.docs) {
          const data = productDoc.data() as Record<string, unknown>;
          const title = String(data['title'] ?? data['name'] ?? productDoc.id);
          productsById.set(productDoc.id, title);
        }

        return salesSnapshot.docs.map(docSnapshot => {
          const sale = this.mapSale(docSnapshot.id, docSnapshot.data() as Record<string, unknown>, productsById);
          const userName = usersByUid.get(sale.userName);

          if (userName) {
            return { ...sale, userName };
          }

          return sale;
        });
      }),
      map(sales => this.applyFilters(sales, filters)),
      catchError(() => of(this.applyFilters(MOCK_SALES, filters)))
    );
  }

  listUserSuggestions(term = ''): Observable<string[]> {
    const usersRef = collection(this.firestore, 'users');

    return from(getDocs(query(usersRef, orderBy('name', 'asc'), limit(100)))).pipe(
      map(snapshot =>
        snapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data() as Record<string, unknown>;
          return String(data['name'] ?? data['email'] ?? 'Operador');
        })
      ),
      map(users => Array.from(new Set(users.filter(Boolean)))),
      map(users => this.filterByTerm(users, term)),
      catchError(() =>
        this.listSales({}, MAX_RESULTS).pipe(
          map(sales => Array.from(new Set(sales.map(sale => sale.userName).filter(Boolean)))),
          map(users => this.filterByTerm(users, term))
        )
      )
    );
  }

  private mapSale(id: string, data: Record<string, unknown>, productsById: Map<string, string>): Sale {
    return {
      id,
      createdAt: this.toTimestamp(data['createdAt']) ?? Timestamp.fromDate(new Date()),
      paymentMethod: String(data['paymentMethod'] ?? 'cash'),
      totalPaid: this.toNumber(data['totalPaid'] ?? data['ammount'] ?? data['amount'] ?? data['value']),
      userName: String(data['userName'] ?? data['idUser'] ?? 'Operador'),
      category: this.normalizeCategory(data['category']),
      items: this.mapItems(data['items'] ?? data['itens'], productsById),
    };
  }

  private mapItems(value: unknown, productsById: Map<string, string>): SaleItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map(item => {
      const data = item as Record<string, unknown>;

      const productId = String(data['productId'] ?? data['idProduto'] ?? '');
      const persistedTitle = String(data['productTitle'] ?? data['title'] ?? '').trim();
      const resolvedTitle = productsById.get(productId) ?? '';

      return {
        productId,
        productTitle: persistedTitle || resolvedTitle || productId || 'Produto',
        quantity: this.toNumber(data['quantity'] ?? 0),
        unitPrice: this.toNumber(
          data['unitPrice'] ?? data['price'] ?? (this.toNumber(data['ammount']) / Math.max(this.toNumber(data['quantity']), 1))
        ),
      };
    });
  }

  private applyFilters(sales: Sale[], filters: Partial<SalesFilters>): Sale[] {
    const normalizedUserName = filters.userName?.trim().toLowerCase() ?? '';

    return sales.filter(sale => {
      if (filters.category && filters.category !== 'all') {
        if ((sale.category ?? 'Outros') !== filters.category) {
          return false;
        }
      }

      if (filters.startDate) {
        const startDate = this.startOfDay(filters.startDate).getTime();
        if (sale.createdAt.toDate().getTime() < startDate) {
          return false;
        }
      }

      if (filters.endDate) {
        const endDate = this.endOfDay(filters.endDate).getTime();
        if (sale.createdAt.toDate().getTime() > endDate) {
          return false;
        }
      }

      if (normalizedUserName && !sale.userName.toLowerCase().includes(normalizedUserName)) {
        return false;
      }

      return true;
    });
  }

  private normalizeCategory(value: unknown): CategoriesType | string | undefined {
    const raw = String(value ?? '').trim();

    if (!raw) {
      return undefined;
    }

    const knownCategory = CATEGORY_OPTIONS.find(option => option.localeCompare(raw, 'pt-BR', { sensitivity: 'base' }) === 0);

    if (knownCategory) {
      return knownCategory;
    }

    const normalized = raw.toLowerCase();

    if (['alimentacao', 'alimentaçao', 'alimentação'].includes(normalized)) {
      return 'Salgados';
    }

    if (['bebidas', 'bebida'].includes(normalized)) {
      return 'Bebidas geladas';
    }

    if (['material-escolar', 'material escolar', 'material_escolar'].includes(normalized)) {
      return 'Outros';
    }

    if (['outros', 'outro'].includes(normalized)) {
      return 'Outros';
    }

    return raw;
  }

  private filterByTerm(items: string[], term: string): string[] {
    const normalized = term.trim().toLowerCase();

    return items
      .filter(item => !normalized || item.toLowerCase().includes(normalized))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  private toTimestamp(value: unknown): Timestamp | null {
    if (value instanceof Timestamp) {
      return value;
    }

    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        return Timestamp.fromDate(date);
      }
    }

    return null;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private startOfDay(date: Date): Date {
    const clone = new Date(date);
    clone.setHours(0, 0, 0, 0);
    return clone;
  }

  private endOfDay(date: Date): Date {
    const clone = new Date(date);
    clone.setHours(23, 59, 59, 999);
    return clone;
  }
}
