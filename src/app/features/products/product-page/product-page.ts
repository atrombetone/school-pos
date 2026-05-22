import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Product } from '../products-page/product.model';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-product-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './product-page.html',
  styleUrl: './product-page.scss',
})
export class ProductPage implements OnInit, OnDestroy {

  private readonly firestore = inject(Firestore);
  private readonly storage = inject(Storage);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly imagePreviewUrl = signal<string | null>(null);
  protected readonly productId = signal<string | null>(null);
  protected readonly units: Product['unit'][] = ['UN', 'LT', 'PC'];

  private selectedFile: File | null = null;
  private currentImageUrl: string | null = null;

  protected readonly form = this.formBuilder.group({
    category: ['', [Validators.required, Validators.maxLength(60)]],
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(400)]],
    unit: ['UN' as Product['unit'], [Validators.required]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stock: [{ value: 0, disabled: true }],
    active: [true]
  });

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    this.productId.set(id);

    if (id) {
      await this.loadProduct(id);
    } else {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    if (this.imagePreviewUrl()) {
      URL.revokeObjectURL(this.imagePreviewUrl()!);
    }
  }

  protected isEditing(): boolean {
    return !!this.productId();
  }

  protected fieldInvalid(fieldName: 'category' | 'title' | 'description' | 'unit' | 'price'): boolean {
    const field = this.form.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  protected async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;

    if (!file) {
      this.imagePreviewUrl.set(this.currentImageUrl);
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Selecione uma imagem valida.');
      this.selectedFile = null;
      input.value = '';
      return;
    }

    this.errorMessage.set('');
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  protected async submit(): Promise<void> {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);

    try {
      const value = this.form.getRawValue();
      const imageUrl = await this.uploadImageIfNeeded(this.currentImageUrl);
      const payload = {
        category: value.category.trim(),
        title: value.title.trim(),
        description: value.description?.trim() || '',
        unit: value.unit,
        price: Number(value.price),
        imageUrl: imageUrl ?? '',
        active: value.active,
        updatedAt: serverTimestamp()
      };

      if (this.isEditing() && this.productId()) {
        await updateDoc(doc(this.firestore, 'products', this.productId()!), payload);
        this.snackBar.open('Produto atualizado com sucesso.', 'Fechar', { duration: 3000 });
      } else {
        await addDoc(collection(this.firestore, 'products'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        this.snackBar.open('Produto cadastrado com sucesso.', 'Fechar', { duration: 3000 });
      }

      await this.router.navigateByUrl('/home/products');
    } catch {
      this.errorMessage.set('Nao foi possivel salvar o produto.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async deleteCurrentProduct(): Promise<void> {
    const id = this.productId();
    if (!id) {
      return;
    }

    const confirmed = window.confirm('Deseja excluir este produto?');
    if (!confirmed) {
      return;
    }

    this.saving.set(true);

    try {
      const productSnapshot = await getDoc(doc(this.firestore, 'products', id));
      const product = productSnapshot.data() as Product | undefined;

      if (product?.imageUrl) {
        await deleteObject(ref(this.storage, product.imageUrl));
      }

      await updateDoc(doc(this.firestore, 'products', id), { active: false, updatedAt: serverTimestamp() });
      this.snackBar.open('Produto removido com sucesso.', 'Fechar', { duration: 3000 });
      await this.router.navigateByUrl('/home/products');
    } catch {
      this.errorMessage.set('Nao foi possivel excluir o produto.');
    } finally {
      this.saving.set(false);
    }
  }

  protected cancel(): void {
    this.router.navigateByUrl('/home/products');
  }

  private async loadProduct(id: string): Promise<void> {
    try {
      const snapshot = await getDoc(doc(this.firestore, 'products', id));

      if (!snapshot.exists()) {
        this.errorMessage.set('Produto nao encontrado.');
        return;
      }

      const data = snapshot.data() as Product;
      this.currentImageUrl = data.imageUrl ?? null;
      this.imagePreviewUrl.set(data.imageUrl ?? null);

      this.form.reset({
        category: data.category ?? '',
        title: data.title ?? '',
        description: data.description ?? '',
        unit: data.unit ?? 'UN',
        price: data.price ?? 0,
        stock: data.stock ?? 0,
        active: data.active ?? true
      });
    } catch {
      this.errorMessage.set('Nao foi possivel carregar o produto.');
    } finally {
      this.loading.set(false);
    }
  }

  private async uploadImageIfNeeded(existingImageUrl: string | null): Promise<string | null> {
    if (!this.selectedFile) {
      return existingImageUrl;
    }

    this.uploading.set(true);
    try {
      if (existingImageUrl) {
        try {
          await deleteObject(ref(this.storage, existingImageUrl));
        } catch {
          // ignore stale url
        }
      }

      const safeName = this.selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const storageRef = ref(this.storage, `products/${Date.now()}-${safeName}`);
      await uploadBytes(storageRef, this.selectedFile, { contentType: this.selectedFile.type });
      return await getDownloadURL(storageRef);
    } finally {
      this.uploading.set(false);
    }
  }

}
