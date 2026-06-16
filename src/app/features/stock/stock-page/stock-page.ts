import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

interface StockProduct {
  id: string;
  category: string;
  title: string;
  imageUrl?: string;
  active: boolean;
  currentStock: number;
  newStockInput: string;
}

@Component({
  selector: 'app-stock-page',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './stock-page.html',
  styleUrl: './stock-page.scss',
})
export class StockPage implements OnInit {

  private readonly firestore = inject(Firestore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly products = signal<StockProduct[]>([]);
  protected readonly loadingProducts = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly selectedCategory = signal('all');
  protected readonly searchTerm = signal('');
  protected readonly categories = computed(() => {
    const uniqueCategories = new Set(
      this.products()
        .map(product => String(product.category ?? '').trim())
        .filter(category => category.length > 0)
    );

    return ['all', ...Array.from(uniqueCategories).sort((a, b) => a.localeCompare(b, 'pt-BR'))];
  });
  protected readonly filteredProducts = computed(() => {
    const selectedCategory = this.selectedCategory();
    const normalizedSearch = this.searchTerm().trim().toLocaleLowerCase('pt-BR');

    return this.products().filter(product => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesTitle = normalizedSearch.length === 0
        || product.title.toLocaleLowerCase('pt-BR').includes(normalizedSearch);

      return matchesCategory && matchesTitle;
    });
  });

  async ngOnInit(): Promise<void> {
    await this.loadProducts();
  }

  protected updateNewStock(productId: string, value: string): void {
    this.products.update(list =>
      list.map(product =>
        product.id === productId
          ? { ...product, newStockInput: value }
          : product
      )
    );
  }

  protected async goBack(): Promise<void> {
    await this.router.navigateByUrl('/home/products');
  }

  protected setCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  protected setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected async save(): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.errorMessage.set('');
    const filledItems = this.products().filter(product => product.newStockInput.trim() !== '');

    if (filledItems.length === 0) {
      this.snackBar.open('Informe ao menos um novo stock para salvar.', 'Fechar', { duration: 3000 });
      return;
    }

    const parsedAdjustments = filledItems.map(product => ({
      product,
      newStock: Number(product.newStockInput.trim()),
    }));

    const invalidAdjustment = parsedAdjustments.find(
      item => !Number.isFinite(item.newStock) || item.newStock < 0 || !Number.isInteger(item.newStock)
    );

    if (invalidAdjustment) {
      this.errorMessage.set('Use apenas numeros inteiros maiores ou iguais a zero no novo stock.');
      return;
    }

    const changedAdjustments = parsedAdjustments.filter(
      item => item.newStock !== item.product.currentStock
    );

    if (changedAdjustments.length === 0) {
      this.snackBar.open('Nenhuma alteracao de stock para salvar.', 'Fechar', { duration: 3000 });
      return;
    }

    this.saving.set(true);

    try {
      const batch = writeBatch(this.firestore);
      const productsCollection = collection(this.firestore, 'products');
      const movementsCollection = collection(this.firestore, 'stock_movements');

      for (const item of changedAdjustments) {
        const movementType = item.newStock > item.product.currentStock ? 'in' : 'out';
        const movementRef = doc(movementsCollection);
        const productRef = doc(productsCollection, item.product.id);

        batch.set(movementRef, {
          productId: item.product.id,
          movementType,
          previousQuantity: item.product.currentStock,
          newQuantity: item.newStock,
          movedAt: serverTimestamp(),
        });

        batch.update(productRef, {
          stock: item.newStock,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      this.products.update(list =>
        list.map(product => {
          const adjustment = changedAdjustments.find(item => item.product.id === product.id);
          if (!adjustment) {
            return { ...product, newStockInput: '' };
          }

          return {
            ...product,
            currentStock: adjustment.newStock,
            newStockInput: '',
          };
        })
      );

      this.snackBar.open('Ajustes de stock salvos com sucesso.', 'Fechar', { duration: 3000 });
    } catch {
      this.errorMessage.set('Nao foi possivel salvar os ajustes de stock.');
    } finally {
      this.saving.set(false);
    }
  }

  protected trackByProduct(_: number, product: StockProduct): string {
    return product.id;
  }

  private async loadProducts(): Promise<void> {
    try {
      const productsQuery = query(collection(this.firestore, 'products'), orderBy('title', 'asc'));
      const snapshot = await getDocs(productsQuery);

      const list = snapshot.docs.map(item => {
        const data = item.data() as {
          category?: string;
          title?: string;
          imageUrl?: string;
          active?: boolean;
          stock?: number;
        };

        return {
          id: item.id,
          category: data.category ?? '',
          title: data.title ?? 'Produto sem titulo',
          imageUrl: data.imageUrl,
          active: data.active ?? true,
          currentStock: data.stock ?? 0,
          newStockInput: '',
        } satisfies StockProduct;
      });

      this.products.set(list);
    } catch {
      this.errorMessage.set('Erro ao carregar produtos para ajuste de stock.');
    } finally {
      this.loadingProducts.set(false);
    }
  }

}
