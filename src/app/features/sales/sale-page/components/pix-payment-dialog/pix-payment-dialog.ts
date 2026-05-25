import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface PixPaymentDialogData {
  pixCopyPaste: string;
  amount: number;
  pixKey: string;
}

@Component({
  selector: 'app-pix-payment-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './pix-payment-dialog.html',
  styleUrl: './pix-payment-dialog.scss',
})
export class PixPaymentDialogComponent implements OnInit {
  protected readonly data = inject<PixPaymentDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject(MatDialogRef<PixPaymentDialogComponent, boolean>);

  protected readonly qrCodeDataUrl = signal<string>('');
  protected readonly copied = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const { default: QRCode } = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(this.data.pixCopyPaste, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
      this.qrCodeDataUrl.set(dataUrl);
    } catch {
      this.qrCodeDataUrl.set('');
    }
  }

  protected async copyPixCode(): Promise<void> {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.data.pixCopyPaste);
      } else {
        this.copyWithFallback(this.data.pixCopyPaste);
      }

      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }

  protected confirm(): void {
    this.dialogRef.close(true);
  }

  protected cancel(): void {
    this.dialogRef.close(false);
  }

  private copyWithFallback(content: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
