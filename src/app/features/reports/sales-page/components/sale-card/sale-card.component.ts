import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Sale, SaleItem } from '../../models/sales.model';

@Component({
  selector: 'app-sale-card',
  imports: [CommonModule, CurrencyPipe, DatePipe, DecimalPipe, MatChipsModule, MatExpansionModule, MatIconModule],
  templateUrl: './sale-card.component.html',
  styleUrl: './sale-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleCardComponent {
  @Input({ required: true }) sale!: Sale;

  protected trackByItem(_: number, item: SaleItem): string {
    return item.productId || item.productTitle;
  }

  protected itemTotal(item: SaleItem): number {
    return item.quantity * item.unitPrice;
  }

  protected totalItems(): number {
    return this.sale.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  protected paymentLabel(method: string): string {
    const normalized = method.trim().toLowerCase();

    if (normalized === 'cash') {
      return 'Dinheiro';
    }

    if (normalized === 'pix') {
      return 'PIX';
    }

    return method || 'Pagamento';
  }
}
