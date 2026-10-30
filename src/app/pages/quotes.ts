import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store, Toast } from '../core/store.service';
import { ESTADOS, Estado, Quote } from '../core/models';
import { fmt, fmtDate, norm, totals, waLink } from '../core/calc';
import { Icon } from './icon';
import { CloseDeal } from './close-deal';

type Sort = 'recientes' | 'antiguas' | 'mayor' | 'menor';

@Component({
  selector: 'app-quotes',
  imports: [FormsModule, RouterLink, Icon, CloseDeal],
  template: `
    <div class="page">
      <div class="ph">
        <div>
          <h1>Cotizaciones</h1>
          <p class="muted">Todas las cotizaciones guardadas en la hoja del taller. Busca por nombre, DNI, celular, número o trabajo.</p>
        </div>
        <a class="btn primary" routerLink="/cotizar"><app-icon name="plus" /> Nueva cotización</a>
      </div>

      <section class="card">
        <div class="filters">
          <label class="searchbox q"><app-icon name="search" />
            <input type="search" placeholder="Ej: Rosa, 45892104, portón, COT-2026-0003" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Buscar">
          </label>
          <label class="f">Desde<input type="date" [ngModel]="from()" (ngModelChange)="from.set($event)"></label>
          <label class="f">Hasta<input type="date" [ngModel]="to()" (ngModelChange)="to.set($event)"></label>
          <label class="f">Ordenar
            <select [ngModel]="sort()" (ngModelChange)="sort.set($event)">
              <option value="recientes">Más recientes</option><option value="antiguas">Más antiguas</option>
              <option value="mayor">Mayor monto</option><option value="menor">Menor monto</option>
            </select>
          </label>
        </div>
        <div class="row">
          <div class="chips">
            <button type="button" class="chip" [class.on]="estado() === ''" (click)="estado.set('')">Todas</button>
            @for (e of estados; track e) {
              <button type="button" class="chip" [class.on]="estado() === e" (click)="estado.set(e)">{{ e }}s</button>
            }
          </div>
          <span class="spacer"></span>
          <span class="count">{{ list().length }} resultado{{ list().length === 1 ? '' : 's' }} · <b class="money">{{ fmt(sum()) }}</b></span>
          @if (q() || from() || to() || estado()) { <button type="button" class="btn ghost" (click)="clear()">Limpiar</button> }
        </div>
      </section>

      <div class="list">
        @for (item of list(); track item.num) {
          <article class="qc">
            <div class="top">
              <div class="who">
                <span class="num money">{{ item.num }} · {{ fmtDate(item.date) }}</span>
                <b>{{ item.client.name || 'Sin nombre' }}</b>
                <span class="muted small">{{ item.client.doc ? 'DNI/RUC ' + item.client.doc + ' · ' : '' }}{{ item.client.tel }}{{ item.client.place ? ' · ' + item.client.place : '' }}</span>
                <span class="small works">{{ works(item) }}</span>
              </div>
              <div class="amt">
                @if (item.special) { <s class="small money muted">{{ fmt(quoted(item)) }}</s> }
                <b class="money">{{ fmt(tot(item)) }}</b>
                @if (item.special) { <span class="small esp">Con descuento especial</span> }
                @if (item.estado === 'Aceptada') {
                  <span class="small money" [class.money-in]="due(item) <= 0" [class.money-due]="due(item) > 0">
                    {{ due(item) <= 0 ? 'Pagado completo' : 'Falta cobrar ' + fmt(due(item)) }}
                  </span>
                }
                <select [ngModel]="item.estado" (ngModelChange)="store.setEstado(item.num, $event)" [class]="'st ' + item.estado" aria-label="Estado">
                  @for (e of estados; track e) { <option [value]="e">{{ e }}</option> }
                </select>
              </div>
            </div>
            <div class="acts">
              <a class="iconbtn" [routerLink]="['/cotizar', item.num]"><app-icon name="edit" [size]="16" /> Editar</a>
              <a class="iconbtn" [routerLink]="['/hoja', item.num, 'cotizacion']"><app-icon name="print" [size]="16" /> Hoja / PDF</a>
              <a class="iconbtn" [routerLink]="['/hoja', item.num, 'contrato']"><app-icon name="contract" [size]="16" /> Contrato</a>
              @if (item.estado !== 'Rechazada' && due(item) > 0) {
                <a class="iconbtn" routerLink="/venta" [queryParams]="{ cot: item.num }"><app-icon name="cash" [size]="16" /> Cobrar</a>
              }
              @if (item.estado !== 'Rechazada') {
                <a class="iconbtn" routerLink="/caja" [queryParams]="{ cot: item.num }"><app-icon name="cash" [size]="16" /> Gastos</a>
                <button type="button" class="iconbtn deal" (click)="deal.set(item.num)"><app-icon name="cash" [size]="16" />
                  {{ item.special ? 'Cambiar descuento' : item.estado === 'Pendiente' ? 'Aceptar con descuento' : 'Dar descuento' }}</button>
              }
              <a class="iconbtn wa" [href]="wa(item)" target="_blank" rel="noopener"><app-icon name="wa" [size]="16" /> WhatsApp</a>
              <button type="button" class="iconbtn" (click)="dup(item.num)"><app-icon name="copy" [size]="16" /> Duplicar</button>
              <button type="button" class="iconbtn danger" (click)="del(item.num)"><app-icon name="trash" [size]="16" /> {{ armed() === item.num ? '¿Seguro? Toca otra vez' : 'Borrar' }}</button>
            </div>
          </article>
        } @empty {
          <div class="empty">
            @if (store.quotes().length) { No encontré cotizaciones con esa búsqueda. }
            @else { Todavía no hay cotizaciones. <a routerLink="/cotizar">Haz la primera</a>. }
          </div>
        }
      </div>
      @if (deal()) { <app-close-deal [num]="deal()" (closed)="deal.set('')" /> }
    </div>
  `,
  styles: `
    .list { display: grid; gap: 12px; }
    .esp { color: var(--ok); font-weight: 700; }
    .iconbtn.deal { border-color: #f6c59a; background: var(--soft); color: var(--fire-dark); }
    .qc { background: var(--panel); border: 1px solid var(--line); border-radius: var(--r); padding: 14px 16px; display: grid; gap: 12px; }
    .top { display: flex; justify-content: space-between; gap: 16px; }
    .who { display: grid; gap: 1px; min-width: 0; }
    .who b { font-size: 18px; }
    .num { font-size: 12px; color: var(--fire-dark); }
    .works { color: var(--ink); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    .amt { display: grid; justify-items: end; gap: 4px; align-content: start; }
    .amt > b { font-size: 20px; }
    .st { width: auto; padding: 6px 10px; font-weight: 700; font-size: 14px; }
    .st.Aceptada { color: var(--ok); border-color: var(--ok); }
    .st.Pendiente { color: var(--warn); border-color: #f0c48a; }
    .st.Rechazada { color: var(--muted); }
    .acts { display: flex; gap: 8px; flex-wrap: wrap; border-top: 1px solid var(--line); padding-top: 12px; }
    @media (max-width: 560px) { .top { flex-direction: column; } .amt { justify-items: start; } }
  `,
})
export class QuotesPage implements OnInit {
  /** Filtro de estado desde el enlace (?estado=Aceptada). */
  readonly estadoParam = input<string>('', { alias: 'estado' });

  protected store = inject(Store);
  private toast = inject(Toast);
  private router = inject(Router);
  protected estados = ESTADOS;
  protected fmt = fmt;
  protected fmtDate = fmtDate;

  protected q = signal('');
  protected from = signal('');
  protected to = signal('');
  protected estado = signal<Estado | ''>('');
  protected sort = signal<Sort>('recientes');
  protected armed = signal('');
  /** Cotización con la ventana de descuento abierta. */
  protected deal = signal('');
  quoted = (q: Quote) => totals(q).quoted;

  ngOnInit() {
    const e = this.estadoParam() as Estado;
    if (ESTADOS.includes(e)) this.estado.set(e);
  }

  protected list = computed(() => {
    const words = norm(this.q()).split(/\s+/).filter(Boolean);
    const [f, t, e] = [this.from(), this.to(), this.estado()];
    const out = this.store.quotes().filter((x) => {
      if (e && x.estado !== e) return false;
      if (f && x.date < f) return false;
      if (t && x.date > t) return false;
      if (!words.length) return true;
      const hay = norm([x.num, x.client.name, x.client.doc, x.client.tel, x.client.place, x.desc, ...x.items.map((i) => i.name)].join(' '));
      return words.every((w) => hay.includes(w));
    });
    const s = this.sort();
    return out.sort((a, b) =>
      s === 'mayor' ? this.tot(b) - this.tot(a)
      : s === 'menor' ? this.tot(a) - this.tot(b)
      : s === 'antiguas' ? (a.date + a.num).localeCompare(b.date + b.num)
      : (b.date + b.num).localeCompare(a.date + a.num),
    );
  });
  protected sum = computed(() => this.list().reduce((a, q) => a + this.tot(q), 0));

  tot = (q: Quote) => totals(q).tot;
  due = (q: Quote) => Math.round((this.tot(q) - (this.store.paidByQuote()[q.num] || 0)) * 100) / 100;
  works = (q: Quote) => q.items.map((i) => i.name).join(' · ');
  wa = (q: Quote) => waLink(q, this.store.shop());

  clear() {
    this.q.set('');
    this.from.set('');
    this.to.set('');
    this.estado.set('');
  }

  dup(num: string) {
    const c = this.store.duplicate(num);
    if (c) {
      this.toast.show(`Copia creada: ${c.num}. Cambia lo que necesites.`);
      this.router.navigate(['/cotizar', c.num]);
    }
  }

  del(num: string) {
    if (this.armed() !== num) {
      this.armed.set(num);
      setTimeout(() => this.armed() === num && this.armed.set(''), 3500);
      return;
    }
    this.armed.set('');
    if (!this.store.deleteQuote(num)) {
      this.toast.show(`No se puede borrar ${num}: tiene cobros. Anula primero sus notas de venta en Ventas.`, 6000);
      return;
    }
    this.toast.show(`Cotización ${num} borrada de la hoja.`);
  }
}
