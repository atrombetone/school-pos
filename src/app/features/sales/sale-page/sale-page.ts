import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { CATEGORY_OPTIONS, CategoriesType } from '../../../shared/models/categories.type';
import { CashRegister, productItem } from '../../../shared/models/cash-register.model';
import { environment } from '../../../../environments/environment';

type PaymentMethod = 'cash' | 'pix';
type CategoryFilter = 'all' | CategoriesType;

interface SaleProduct {
  id: string;
  category: string;
  title: string;
  price: number;
  stock: number;
  imageUrl?: string;
  active: boolean;
}

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  subtotal: number;
  stock: number;
}

@Component({
  selector: 'app-sale-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatSnackBarModule,
  ],
  templateUrl: './sale-page.html',
  styleUrl: './sale-page.scss',
})
export class SalePage implements OnInit {

  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loadingProducts = signal(true);
  protected readonly savingSale = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly selectedCategory = signal<CategoryFilter>('all');
  protected readonly checkoutStep = signal<'cart' | 'payment'>('cart');
  protected readonly products = signal<SaleProduct[]>([]);
  protected readonly productQuantities = signal<Record<string, string>>({});
  protected readonly cartItems = signal<CartItem[]>([]);

  protected readonly categories = computed<readonly CategoryFilter[]>(() => ['all', ...CATEGORY_OPTIONS]);

  protected readonly filteredProducts = computed(() => {
    const category = this.selectedCategory();
    const list = this.products();

    if (category === 'all') {
      return list;
    }

    return list.filter(product => product.category === category);
  });

  protected readonly cartTotal = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.subtotal, 0)
  );

  protected readonly totalItems = computed(() =>
    this.cartItems().reduce((sum, item) => sum + item.quantity, 0)
  );

  protected readonly paymentForm = this.formBuilder.group({
    paymentMethod: ['cash' as PaymentMethod, Validators.required],
    cashReceived: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.loadProducts();
  }

  protected setCategory(category: CategoryFilter): void {
    this.selectedCategory.set(category);
  }

  protected trackByProduct(_: number, product: SaleProduct): string {
    return product.id;
  }

  protected trackByCartItem(_: number, item: CartItem): string {
    return item.id;
  }

  protected updateProductQuantity(productId: string, value: string): void {
    this.productQuantities.update(current => ({
      ...current,
      [productId]: value,
    }));
  }

  protected increaseProductQuantity(productId: string, maxStock: number): void {
    const currentQuantity = this.getProductQuantityValue(productId);

    if (currentQuantity >= maxStock) {
      return;
    }

    this.updateProductQuantity(productId, String(currentQuantity + 1));
  }

  protected decreaseProductQuantity(productId: string): void {
    const currentQuantity = this.getProductQuantityValue(productId);

    if (currentQuantity <= 1) {
      return;
    }

    this.updateProductQuantity(productId, String(currentQuantity - 1));
  }

  protected getProductQuantity(productId: string): string {
    return this.productQuantities()[productId] || '1';
  }

  protected getProductQuantityValue(productId: string): number {
    return this.parseQuantity(this.getProductQuantity(productId)) ?? 1;
  }

  protected addToCart(product: SaleProduct): void {
    if (!product.active) {
      this.errorMessage.set('Nao e possivel vender produto inativo.');
      return;
    }

    const rawQuantity = this.productQuantities()[product.id] ?? '1';
    const quantity = this.parseQuantity(rawQuantity);

    if (!quantity) {
      this.errorMessage.set('Informe uma quantidade valida para adicionar ao carrinho.');
      return;
    }

    this.errorMessage.set('');

    this.cartItems.update(items => {
      const index = items.findIndex(item => item.id === product.id);

      if (index < 0) {
        if (quantity > product.stock) {
          this.errorMessage.set('Quantidade solicitada maior que o stock disponivel.');
          return items;
        }

        return [
          ...items,
          {
            id: product.id,
            title: product.title,
            price: product.price,
            quantity,
            subtotal: quantity * product.price,
            stock: product.stock,
          },
        ];
      }

      const existing = items[index];
      const nextQuantity = existing.quantity + quantity;
      if (nextQuantity > product.stock) {
        this.errorMessage.set('Quantidade total no carrinho ultrapassa o stock disponivel.');
        return items;
      }

      const updated = [...items];
      updated[index] = {
        ...existing,
        quantity: nextQuantity,
        subtotal: nextQuantity * existing.price,
      };
      return updated;
    });

    this.productQuantities.update(current => ({
      ...current,
      [product.id]: '1',
    }));
  }

  protected updateCartItemQuantity(itemId: string, value: string): void {
    const quantity = this.parseQuantity(value);

    if (!quantity) {
      return;
    }

    this.cartItems.update(items =>
      items.map(item => {
        if (item.id !== itemId) {
          return item;
        }

        const nextQuantity = Math.min(quantity, item.stock);
        return {
          ...item,
          quantity: nextQuantity,
          subtotal: nextQuantity * item.price,
        };
      })
    );
  }

  protected removeFromCart(itemId: string): void {
    this.cartItems.update(items => items.filter(item => item.id !== itemId));
  }

  protected goToPayment(): void {
    if (this.cartItems().length === 0) {
      this.errorMessage.set('Adicione ao menos um produto antes de finalizar venda.');
      return;
    }

    this.errorMessage.set('');
    this.checkoutStep.set('payment');
  }

  protected goBackToCart(): void {
    this.checkoutStep.set('cart');
  }

  protected isCashPayment(): boolean {
    return this.paymentForm.controls.paymentMethod.value === 'cash';
  }

  protected getChangeAmount(): number {
    if (!this.isCashPayment()) {
      return 0;
    }

    const change = this.getCashReceivedAmount() - this.cartTotal();
    return change > 0 ? change : 0;
  }

  protected getRemainingAmount(): number {
    if (!this.isCashPayment()) {
      return 0;
    }

    const difference = this.cartTotal() - this.getCashReceivedAmount();
    return difference > 0 ? difference : 0;
  }

  protected async saveSale(): Promise<void> {
    if (this.savingSale()) {
      return;
    }

    if (this.cartItems().length === 0) {
      this.errorMessage.set('Carrinho vazio. Adicione produtos para registrar a venda.');
      this.checkoutStep.set('cart');
      return;
    }

    if (this.paymentForm.controls.paymentMethod.value === 'pix') {
      this.errorMessage.set('Pagamento via PIX ainda nao esta disponivel nesta versao.');
      return;
    }

    const cashReceived = this.getCashReceivedAmount();
    if (this.isCashPayment() && cashReceived < this.cartTotal()) {
      this.errorMessage.set('Valor pago em dinheiro menor que o total da venda.');
      return;
    }

    this.errorMessage.set('');
    this.savingSale.set(true);

    try {
      const sequenceNumber = await this.getNextSequenceNumber();
      const productCollectionRef = collection(this.firestore, 'products');
      const saleCollectionRef = collection(this.firestore, 'cashRegisters');
      const items: productItem[] = this.cartItems().map(item => ({
        idProduto: item.id,
        quantity: item.quantity,
        ammount: item.subtotal,
      }));

      const payload: Omit<CashRegister, 'createdAt'> & {
        createdAt: ReturnType<typeof serverTimestamp>;
        paymentMethod: PaymentMethod;
        cashReceived: number;
        changeAmount: number;
      } = {
        createdAt: serverTimestamp(),
        sequenceNumber,
        idUser: this.auth.currentUser?.uid ?? '',
        ammount: this.cartTotal(),
        itens: items,
        paymentMethod: 'cash',
        cashReceived,
        changeAmount: this.getChangeAmount(),
      };

      await runTransaction(this.firestore, async transaction => {
        const cartItems = this.cartItems();
        const stockUpdates: Array<{ productRef: ReturnType<typeof doc>; nextStock: number }> = [];

        for (const cartItem of cartItems) {
          const productRef = doc(productCollectionRef, cartItem.id);
          const productSnapshot = await transaction.get(productRef);

          if (!productSnapshot.exists()) {
            throw new Error('PRODUCT_NOT_FOUND');
          }

          const currentStock = Number(productSnapshot.data()['stock'] ?? 0);
          if (currentStock < cartItem.quantity) {
            throw new Error('INSUFFICIENT_STOCK');
          }

          stockUpdates.push({
            productRef,
            nextStock: currentStock - cartItem.quantity,
          });
        }

        for (const update of stockUpdates) {
          transaction.update(update.productRef, {
            stock: update.nextStock,
            updatedAt: serverTimestamp(),
          });
        }

        const saleRef = doc(saleCollectionRef);
        transaction.set(saleRef, payload);
      });

      await this.loadProducts();
      this.cartItems.set([]);
      this.checkoutStep.set('cart');
      this.paymentForm.reset({
        paymentMethod: 'cash',
        cashReceived: '',
      });

      this.snackBar.open('Venda registrada com sucesso.', 'Fechar', { duration: 3000 });
    } catch (error) {
      const code = error instanceof Error ? error.message : '';

      if (!environment.production) {
        console.error('[SalePage] Error while saving sale transaction', {
          code,
          error,
          cartItems: this.cartItems(),
          total: this.cartTotal(),
          paymentMethod: this.paymentForm.controls.paymentMethod.value,
          cashReceived: this.getCashReceivedAmount(),
        });
      }

      if (code === 'INSUFFICIENT_STOCK') {
        this.errorMessage.set('Stock insuficiente para concluir a venda. Atualize e tente novamente.');
      } else if (code === 'PRODUCT_NOT_FOUND') {
        this.errorMessage.set('Um produto do carrinho nao foi encontrado.');
      } else {
        this.errorMessage.set('Nao foi possivel registrar a venda. Tente novamente.');
      }
    } finally {
      this.savingSale.set(false);
    }
  }

  private async loadProducts(): Promise<void> {
    this.loadingProducts.set(true);
    this.errorMessage.set('');

    try {
      const productsQuery = query(collection(this.firestore, 'products'), orderBy('title', 'asc'));
      const snapshot = await getDocs(productsQuery);
      const list = snapshot.docs.map(item => {
        const data = item.data() as {
          category?: string;
          title?: string;
          price?: number;
          stock?: number;
          imageUrl?: string;
          active?: boolean;
        };

        return {
          id: item.id,
          category: data.category ?? 'Sem categoria',
          title: data.title ?? 'Produto sem titulo',
          price: Number(data.price ?? 0),
          stock: Number(data.stock ?? 0),
          imageUrl: data.imageUrl,
          active: data.active ?? true,
        } satisfies SaleProduct;
      });

      this.products.set(list.filter(product => product.price > 0));

      const quantities: Record<string, string> = {};
      for (const product of list) {
        quantities[product.id] = '1';
      }
      this.productQuantities.set(quantities);
    } catch {
      this.errorMessage.set('Erro ao carregar produtos para venda.');
    } finally {
      this.loadingProducts.set(false);
    }
  }

  private parseQuantity(value: string): number | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }

    return parsed;
  }

  private getCashReceivedAmount(): number {
    const value = this.paymentForm.controls.cashReceived.value;
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  private async getNextSequenceNumber(): Promise<number> {
    try {
      const lastCashRegisterQuery = query(
        collection(this.firestore, 'cashRegisters'),
        orderBy('sequenceNumber', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(lastCashRegisterQuery);
      const lastSequence = Number(snapshot.docs[0]?.data()['sequenceNumber'] ?? 0);
      return Number.isFinite(lastSequence) ? lastSequence + 1 : 1;
    } catch {
      return Date.now();
    }
  }

}
