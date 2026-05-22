import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Product } from './product.model';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp
} from 'firebase/firestore';

@Component({
  selector: 'app-products-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './products-page.html',
  styleUrl: './products-page.scss',
})
export class ProductsPage implements OnInit, OnDestroy {

  private readonly firestore = inject(Firestore);

  private unsubscribeProducts?: () => void;

  protected readonly products = signal<Product[]>([]);
  protected readonly loadingProducts = signal(true);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.watchProducts();
  }

  ngOnDestroy(): void {
    this.unsubscribeProducts?.();
  }

  protected trackByProduct(_: number, product: Product): string {
    return product.id ?? product.title;
  }

  private watchProducts(): void {
    const productsQuery = query(collection(this.firestore, 'products'), orderBy('updatedAt', 'desc'));

    this.unsubscribeProducts = onSnapshot(
      productsQuery,
      snapshot => {
        const list = snapshot.docs.map(item => {
          const data = item.data() as Omit<Product, 'id'>;
          return {
            ...data,
            id: item.id,
            createdAt: this.toTimestamp(data.createdAt),
            updatedAt: this.toTimestamp(data.updatedAt)
          } satisfies Product;
        });

        this.products.set(list);
        this.loadingProducts.set(false);
      },
      () => {
        this.errorMessage.set('Erro ao carregar produtos. Verifique permissao no Firestore.');
        this.loadingProducts.set(false);
      }
    );
  }

  private toTimestamp(value: unknown): Timestamp {
    if (value instanceof Timestamp) {
      return value;
    }

    if (value instanceof Date) {
      return Timestamp.fromDate(value);
    }

    return Timestamp.now();
  }

}
