import { Component, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store, Toast } from '../core/store.service';
import { Sale } from '../core/models';
import { fmt, fmtDate, inWords, saleTotals, waPhone } from '../core/calc';
import { Icon } from './icon';

type Format = 'ticket' | 'a4';

@Component({
  selector: 'app-receipt',
  imports: [RouterLink, Icon],
  templateUrl: './receipt.html',
  styleUrl: './receipt.css',
})
export class ReceiptPage implements OnDestroy {
  readonly num = input.required<string>();

  protected store = inject(Store);
  private toast = inject(Toast);
  protected shop = this.store.shop;
  protected s = computed(() => this.store.getSale(this.num()));
  protected t = computed(() => (this.s() ? saleTotals(this.s()!, this.shop().igv) : null));
  protected format = signal<Format>(this.savedFormat());
  protected qr = signal('');
  protected armed = signal(false);
  protected fmt = fmt;
  protected fmtDate = fmtDate;
  protected inWords = inWords;
  private pageStyle = document.createElement('style');

  constructor() {
    document.head.appendChild(this.pageStyle);
    // Tamaño de papel según el formato elegido.
    effect(() => {
      this.pageStyle.textContent =
        this.format() === 'ticket' ? '@page { size: 80mm auto; margin: 0; }' : '@page { size: A4; margin: 0; }';
      try { localStorage.setItem('rr.receiptFormat', this.format()); } catch { /* nada */ }
    });
    effect(() => {
      const s = this.s();
      if (s) this.makeQr(s);
    });
  }

  ngOnDestroy() {
    this.pageStyle.remove();
  }

  private savedFormat(): Format {
    try {
      return localStorage.getItem('rr.receiptFormat') === 'a4' ? 'a4' : 'ticket';
    } catch {
      return 'ticket';
    }
  }

  private async makeQr(s: Sale) {
    const shop = this.shop();
    // Datos de control: RUC | número | fecha | total | cliente
    const text = [shop.ruc || shop.name, s.num, s.date, saleTotals(s, shop.igv).tot.toFixed(2), s.client.doc || '-'].join('|');
    try {
      const QR = await import('qrcode');
      this.qr.set(await (QR.default ?? QR).toDataURL(text, { margin: 0, width: 220, errorCorrectionLevel: 'M' }));
    } catch {
      this.qr.set('');
    }
  }

  print() {
    const prev = document.title;
    document.title = `${this.num()} ${this.s()?.client.name ?? ''}`.trim();
    window.print();
    document.title = prev;
  }

  wa(): string {
    const s = this.s()!;
    const t = this.t()!;
    const lines = s.items.map((i) => `• ${i.qty} ${i.unit} ${i.desc}: ${fmt((+i.qty || 0) * (+i.price || 0))}`).join('\n');
    const msg = [
      `*${this.shop().name}*`,
      `Nota de venta ${s.num}`,
      `${fmtDate(s.date)} ${s.time}`,
      '',
      lines,
      ...(+s.discount ? [`Descuento: −${fmt(+s.discount)}`] : []),
      `*TOTAL: ${fmt(t.tot)}*`,
      `Pagado con ${s.pay}`,
      ...(s.quoteNum ? [`${s.concept} de la cotización ${s.quoteNum}`] : []),
      '',
      this.shop().footer,
    ].join('\n');
    return `https://wa.me/${waPhone(s.client.tel)}?text=${encodeURIComponent(msg)}`;
  }

  toggleVoid() {
    const s = this.s();
    if (!s) return;
    if (!s.void && !this.armed()) {
      this.armed.set(true);
      setTimeout(() => this.armed.set(false), 3500);
      return;
    }
    this.store.voidSale(s.num, !s.void);
    this.armed.set(false);
    this.toast.show(s.void ? 'Nota de venta restaurada.' : 'Nota de venta anulada. Sigue en el Excel marcada como anulada.');
  }
}
