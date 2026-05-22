import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { SalesCategoryFilter } from '../../models/sales.model';

export const SALES_CATEGORY_OPTIONS: Array<{ value: SalesCategoryFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'material-escolar', label: 'Material Escolar' },
  { value: 'outros', label: 'Outros' },
];

@Component({
  selector: 'app-sales-filters',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './sales-filters.component.html',
  styleUrl: './sales-filters.component.scss',
})
export class SalesFiltersComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() users: string[] = [];

  @Output() apply = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  protected readonly categories = SALES_CATEGORY_OPTIONS;

  protected filteredUsers(): string[] {
    const term = String(this.form?.controls['userName']?.value ?? '').trim().toLowerCase();

    return this.users
      .filter(user => !term || user.toLowerCase().includes(term))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
}
