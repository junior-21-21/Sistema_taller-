import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store.service';
import { PAY_METHODS, Sale } from '../core/models';
import { fmt, fmtDate, norm, saleTotals } from '../core/calc';
import { Icon } from './icon';

@Component({
  selector: 'app-sales',
  imports: [FormsModule, RouterLink, Icon],
  template: `
    <div class="page">
      <div class="ph">
        <div>
          <h1>Ventas</h1>
          <p class="muted">Cada cobro con su nota de venta. Para cobrar el adelanto de un trabajo, entra a Cotizaciones y toca <b>Cobrar</b>.</p>
        </div>
        <a class="btn primary" routerLink="/venta"><app-icon name="plus" /> Nueva venta</a>
      </div>

      <section class="card">
        <div class="filters">
          <label class="searchbox q"><app-icon name="search" />
            <input type="search" placeholder="Buscar cliente, número o descripción" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Buscar">
          </label>
          <label class="f">Desde<input type="date" [ngModel]="from()" (ngModelChange)="from.set($event)"></label>
          <label class="f">Hasta<input type="date" [ngModel]="to()" (ngModelChange)="to.set($event)"></label>
          <label class="f">Forma de pago
            <select [ngModel]="pay()" (ngModelChange)="pay.set($event)">
              <option value="">Todas</option>
              @for (p of methods; track p) { <option [value]="p">{{ p }}</option> }
            </select>
          </label>
        </div>
        <div class="sums">
          <div><span>Ventas</span><b>{{ valid().length }}</b></div>
          <div><span>Total cobrado</span><b class="money money-in">{{ fmt(sum()) }}</b></div>
          @for (p of byMethod(); track p.method) {
            <div><span>{{ p.method }}</span><b class="money">{{ fmt(p.total) }}</b></div>
          }
        </div>
      </section>

      <section class="card tablecard">
        <div class="tbl">
          <table>
            <thead><tr><th>Número</th><th>Fecha</th><th>Cliente</th><th>Concepto</th><th>Pago</th><th class="n">Total</th><th></th></tr></thead>
            <tbody>
              @for (s of list(); track s.num) {
                <tr [class.void]="s.void">
                  <td class="money">{{ s.num }}</td>
                  <td>{{ fmtDate(s.date) }} <span class="muted small">{{ s.time }}</span></td>
                  <td><b>{{ s.client.name || 'Clientes varios' }}</b>@if (s.client.doc) {<br><span class="muted small">{{ s.client.doc }}</span>}</td>
                  <td>{{ s.concept }}@if (s.quoteNum) {<br><a class="small" [routerLink]="['/cotizar', s.quoteNum]">{{ s.quoteNum }}</a>}</td>
                  <td>{{ s.pay }}</td>
                  <td class="n money">{{ fmt(tot(s)) }}@if (s.void) {<br><span class="pill Rechazada">Anulada</span>}</td>
                  <td class="n"><a class="iconbtn" [routerLink]="['/boleta', s.num]"><app-icon name="receipt" [size]="16" /> Ver</a></td>
                </tr>
              } @empty {
                <tr><td colspan="7"><div class="empty">@if (store.sales().length) { No hay ventas con ese filtro. } @else { Todavía no hay ventas. <a routerLink="/venta">Registra la primera</a>. }</div></td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: `
    .sums { display: flex; gap: 10px; flex-wrap: wrap; }
    .sums div { border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; display: grid; min-width: 120px; }
    .sums span { font-size: 12px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    .sums b { font-size: 18px; }
    .tablecard { padding: 0; overflow: hidden; }
    .tbl { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; min-width: 760px; }
    th { text-align: left; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 12px 14px; background: var(--bg); }
    td { padding: 12px 14px; border-top: 1px solid var(--line); vertical-align: top; }
    .n { text-align: right; }
    tr.void td { color: var(--muted); }
    tr.void td.money { text-decoration: line-through; }
  `,
})
export class SalesPage {
  protected store = inject(Store);
  protected methods = PAY_METHODS;
  protected fmt = fmt;
  protected fmtDate = fmtDate;
  protected q = signal('');
  protected from = signal('');
  protected to = signal('');
  protected pay = signal('');

  tot = (s: Sale) => saleTotals(s, this.store.shop().igv).tot;

  protected list = computed(() => {
    const words = norm(this.q()).split(/\s+/).filter(Boolean);
    const [f, t, p] = [this.from(), this.to(), this.pay()];
    return this.store.sortedSales().filter((s) => {
      if (p && s.pay !== p) return false;
      if (f && s.date < f) return false;
      if (t && s.date > t) return false;
      if (!words.length) return true;
      const hay = norm([s.num, s.client.name, s.client.doc, s.quoteNum, s.concept, ...s.items.map((i) => i.desc)].join(' '));
      return words.every((w) => hay.includes(w));
    });
  });
  protected valid = computed(() => this.list().filter((s) => !s.void));
  protected sum = computed(() => this.valid().reduce((a, s) => a + this.tot(s), 0));
  protected byMethod = computed(() =>
    PAY_METHODS.map((m) => ({ method: m, total: this.valid().filter((s) => s.pay === m).reduce((a, s) => a + this.tot(s), 0) })).filter((x) => x.total > 0),
  );
}
