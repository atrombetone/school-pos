import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { User } from 'firebase/auth';
import { Timestamp, collection, getDocs, query, where } from 'firebase/firestore';

type ProductView = {
  id: string;
  name: string;
  stock: number;
  price: number;
  status: 'ok' | 'low' | 'empty';
};

@Component({
  selector: 'app-dashboard-page',
  imports: [CurrencyPipe, DatePipe, DecimalPipe],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {

  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly userEmail = signal('');
  protected readonly todayLabel = signal(new Date());

  protected readonly totalRaisedToday = signal(0);
  protected readonly totalSalesToday = signal(0);
  protected readonly mySalesToday = signal(0);
  protected readonly averageTicketToday = signal(0);
  protected readonly lowStockCount = signal(0);
  protected readonly products = signal<ProductView[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  protected async refresh(): Promise<void> {
    await this.loadDashboard();
  }

  protected trackByProduct(_: number, product: ProductView): string {
    return product.id;
  }

  private async loadDashboard(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const currentUser = await this.getCurrentUser();
      const currentUserId = currentUser?.uid ?? '';
      this.userEmail.set(currentUser?.email ?? 'Operador');

      const sales = await this.loadSalesFromToday();
      const products = await this.loadProducts();

      const salesCount = sales.length;
      const totalRaised = sales.reduce((sum, sale) => sum + this.extractSaleTotal(sale), 0);
      const mySales = sales.filter(sale => this.isSaleFromUser(sale, currentUserId)).length;

      this.totalSalesToday.set(salesCount);
      this.totalRaisedToday.set(totalRaised);
      this.mySalesToday.set(mySales);
      this.averageTicketToday.set(salesCount > 0 ? totalRaised / salesCount : 0);
      this.products.set(products);
      this.lowStockCount.set(products.filter(product => product.status !== 'ok').length);
      this.todayLabel.set(new Date());
    } catch {
      this.errorMessage.set('Nao foi possivel carregar o dashboard agora. Tente atualizar.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async getCurrentUser(): Promise<User | null> {
    if (this.auth.currentUser) {
      return this.auth.currentUser;
    }

    return await new Promise<User | null>(resolve => {
      const unsubscribe = onAuthStateChanged(this.auth, user => {
        unsubscribe();
        resolve(user);
      });
    });
  }

  private async loadSalesFromToday(): Promise<Array<Record<string, unknown>>> {
    const startOfDay = this.startOfToday();
    const startOfTomorrow = new Date(startOfDay);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    return this.loadSalesFromCollectionToday(startOfDay, startOfTomorrow);
  }

  private async loadSalesFromCollectionToday(
    startOfDay: Date,
    startOfTomorrow: Date,
  ): Promise<Array<Record<string, unknown>>> {
    const salesRef = collection(this.firestore, 'cashRegisters');

    try {
      const dailyQuery = query(
        salesRef,
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('createdAt', '<', Timestamp.fromDate(startOfTomorrow))
      );
      const snapshot = await getDocs(dailyQuery);

      return snapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }));
    } catch {
      const snapshot = await getDocs(salesRef);

      return snapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }) as Record<string, unknown>)
        .filter(sale => {
          const createdAt = this.extractSaleDate(sale);

          return createdAt >= startOfDay && createdAt < startOfTomorrow;
        });
    }
  }

  private extractSaleDate(sale: Record<string, unknown>): Date {
    return this.extractDate(sale['createdAt'] ?? sale['date'] ?? sale['timestamp']);
  }

  private async loadProducts(): Promise<ProductView[]> {
    const productsRef = collection(this.firestore, 'products');
    const snapshot = await getDocs(productsRef);

    return snapshot.docs
      .map(docSnapshot => {
        const data = docSnapshot.data() as Record<string, unknown>;
        const stock = this.toNumber(data['stock'] ?? data['quantity'] ?? data['qty']);
        const price = this.toNumber(data['price'] ?? data['unitPrice'] ?? data['value']);
        const name = String(data['name'] ?? data['title'] ?? `Produto ${docSnapshot.id}`);

        return {
          id: docSnapshot.id,
          name,
          stock,
          price,
          status: this.getStockStatus(stock)
        } satisfies ProductView;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  private getStockStatus(stock: number): 'ok' | 'low' | 'empty' {
    if (stock <= 0) {
      return 'empty';
    }

    if (stock <= 5) {
      return 'low';
    }

    return 'ok';
  }

  private isSaleFromUser(sale: Record<string, unknown>, userId: string): boolean {
    if (!userId) {
      return false;
    }

    const possibleOwnerFields = [
      sale['idUser'],
      sale['sellerId'],
      sale['userId'],
      sale['createdBy'],
      sale['operatorId'],
      sale['userUid']
    ];

    return possibleOwnerFields.some(value => String(value ?? '') === userId);
  }

  private extractSaleTotal(sale: Record<string, unknown>): number {
    return this.toNumber(
      sale['ammount'] ?? sale['total'] ?? sale['totalAmount'] ?? sale['finalAmount'] ?? sale['amount'] ?? sale['value']
    );
  }

  private extractDate(value: unknown): Date {
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }

    return new Date(0);
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

}
