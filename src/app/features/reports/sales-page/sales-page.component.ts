import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SaleCardComponent } from './components/sale-card/sale-card.component';
import { SalesFiltersComponent } from './components/sales-filters/sales-filters.component';
import { Sale, SalesCategoryFilter, SalesFilters } from './models/sales.model';
import { SalesService } from './services/sales.service';

@Component({
  selector: 'app-sales-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    SalesFiltersComponent,
    SaleCardComponent,
],
  templateUrl: './sales-page.component.html',
  styleUrl: './sales-page.component.scss',
})
export class SalesPageComponent implements OnInit {
  private readonly salesService = inject(SalesService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly users = signal<string[]>([]);
  protected readonly sales = signal<Sale[]>([]);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(6);

  protected readonly filtersForm = this.formBuilder.group({
    startDate: this.formBuilder.control<Date | null>(null),
    endDate: this.formBuilder.control<Date | null>(null),
    category: this.formBuilder.control<SalesCategoryFilter>('all'),
    userName: this.formBuilder.control(''),
  });

  protected readonly visibleSales = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.sales().slice(start, start + this.pageSize());
  });

  protected readonly totalSales = computed(() => this.sales().length);

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
    await this.loadSales();
  }

  protected async onApplyFilters(): Promise<void> {
    this.pageIndex.set(0);
    await this.loadSales();
  }

  protected async onClearFilters(): Promise<void> {
    this.filtersForm.reset({
      startDate: null,
      endDate: null,
      category: 'all',
      userName: '',
    });

    this.pageIndex.set(0);
    await this.loadSales();
  }

  protected onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected trackBySale(_: number, sale: Sale): string {
    return sale.id;
  }

  private async loadUsers(): Promise<void> {
    try {
      this.users.set(await firstValueFrom(this.salesService.listUserSuggestions()));
    } catch {
      this.users.set([]);
    }
  }

  private async loadSales(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const filters = this.buildFilters();
      const sales = await firstValueFrom(this.salesService.listSales(filters));
      this.sales.set(sales);
    } catch {
      this.errorMessage.set('Nao foi possivel carregar as vendas no momento.');
      this.sales.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private buildFilters(): SalesFilters {
    return {
      startDate: this.filtersForm.controls.startDate.value,
      endDate: this.filtersForm.controls.endDate.value,
      category: this.filtersForm.controls.category.value ?? 'all',
      userName: this.filtersForm.controls.userName.value?.trim() ?? '',
    };
  }
}
