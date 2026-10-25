import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store, Toast } from '../core/store.service';
import { PAY_METHODS, Sale, UNITS } from '../core/models';
import { fmt, saleTotals } from '../core/calc';
import { clientErrors, focusFirstError, hasErrors, saleItemErrors, vRange } from '../core/validate';
import { Icon } from './icon';
import { Guide, Hint } from './guide';
import { NeedExcel } from './need-excel';
import { SheetService } from '../core/sheet.service';

@Component({
  selector: 'app-sale',
  imports: [FormsModule, RouterLink, Icon, Guide, Hint, NeedExcel],
  template: `
    @if (!sheet.loaded() && sheet.status() !== 'offline') {
      <app-need-excel />
    } @else {
    <div class="page">
      <div class="ph">
        <div>
          <span class="num money">{{ s.num }}</span>
          <h1>Nueva venta</h1>
          @if (s.quoteNum) {
            <p class="muted">Cobro de <b>{{ s.concept.toLowerCase() }}</b> de la cotización <a [routerLink]="['/cotizar', s.quoteNum]">{{ s.quoteNum }}</a>.</p>
          } @else {
            <p class="muted">Registra lo que cobras y entrega una nota de venta con tu logo.</p>
          }
        </div>
      </div>

      <app-guide id="venta" title="Cómo registrar una venta">
        <ol>
          <li><b>Cliente</b>: escribe su nombre (si ya existe, se completa solo) o elige <b>Clientes varios</b>.</li>
          <li><b>Qué se cobra</b>: agrégalo de tu lista de precios o con <b>Línea libre</b>.</li>
          <li><b>Cobro</b>: elige cómo te pagan. En efectivo, pon con cuánto paga y te calcula el vuelto.</li>
          <li>Toca <b>Emitir nota de venta</b> y sale el ticket para imprimir o mandar por WhatsApp.</li>
        </ol>
      </app-guide>

      @if (err()) { <div class="err" role="alert">{{ err() }}</div> }

      <div class="two">
        <div class="col">
          <section class="card">
            <h2>Cliente</h2>
            <div class="chips">
              <button type="button" class="chip" [class.on]="!anon()" (click)="anon.set(false)">Con nombre</button>
              <button type="button" class="chip" [class.on]="anon()" (click)="setAnon()">Clientes varios</button>
            </div>
            @if (!anon()) {
              <div class="grid">
                <label class="f" [class.bad]="show(ce.name)"><span>Nombre <span class="req">*</span></span>
                  <input [(ngModel)]="s.client.name" (change)="fillClient()" list="clientes" autocomplete="off" placeholder="Escribe y elige si ya es cliente">
                  @if (show(ce.name); as m) { <span class="fe">{{ m }} O elige Clientes varios.</span> }</label>
                <label class="f" [class.bad]="show(ce.doc, s.client.doc)"><span>DNI o RUC <span class="muted">(opcional)</span></span>
                  <input [(ngModel)]="s.client.doc" inputmode="numeric" maxlength="11" placeholder="8 o 11 números">
                  @if (show(ce.doc, s.client.doc); as m) { <span class="fe">{{ m }}</span> }</label>
                <label class="f" [class.bad]="show(ce.tel, s.client.tel)"><span>Celular <span class="muted">(opcional)</span></span>
                  <input [(ngModel)]="s.client.tel" inputmode="tel" placeholder="9XX XXX XXX">
                  @if (show(ce.tel, s.client.tel); as m) { <span class="fe">{{ m }}</span> }</label>
              </div>
              <datalist id="clientes">
                @for (c of store.clients(); track c.key) { <option [value]="c.client.name">{{ c.client.doc }}</option> }
              </datalist>
            }
          </section>

          <section class="card">
            <div class="row"><h2>Qué se cobra</h2></div>
            @if (!s.quoteNum) {
              <div class="add">
                <select [(ngModel)]="pick" aria-label="Agregar de la lista de precios">
                  <option value="">Agregar de tu lista de precios…</option>
                  @for (c of store.catalog(); track c.code) { <option [value]="c.code">{{ c.name }} · {{ fmt(c.material + c.labor) }}/{{ c.unit }}</option> }
                </select>
                <button type="button" class="btn" (click)="addFromCatalog()" [disabled]="!pick">Agregar</button>
                <button type="button" class="btn" (click)="addLine()"><app-icon name="plus" [size]="16" /> Línea libre</button>
              </div>
            }
            @for (it of s.items; track $index; let i = $index) {
              @let e = ie[i];
              <div class="line">
                <label class="f d" [class.bad]="show(e.desc)">Descripción *<input [(ngModel)]="it.desc" placeholder="Ej: Reja para ventana 1.2 × 1.5 m"></label>
                <label class="f">Unidad<select [(ngModel)]="it.unit">@for (u of units; track u) { <option [value]="u">{{ u }}</option> }</select></label>
                <label class="f" [class.bad]="show(e.qty, it.qty)">Cantidad *<input type="number" min="0" step="0.5" inputmode="decimal" [(ngModel)]="it.qty"></label>
                <label class="f" [class.bad]="show(e.price, it.price)">Precio S/ *<input type="number" min="0" step="0.5" inputmode="decimal" [(ngModel)]="it.price"></label>
                <div class="sub"><span class="muted small">Importe</span><b class="money">{{ fmt((+it.qty || 0) * (+it.price || 0)) }}</b></div>
                <button type="button" class="x" (click)="s.items.splice(i, 1)" aria-label="Quitar línea">Quitar</button>
                @if (show(e.desc) || show(e.qty, it.qty) || show(e.price, it.price); as m) { <span class="fe le">{{ m }}</span> }
              </div>
            } @empty {
              <div class="empty">Agrega lo que vas a cobrar.</div>
            }
          </section>
        </div>

        <section class="card pay">
          <h2>Cobro</h2>
          <label class="f" [class.bad]="show(discountErr, s.discount)">Descuento (S/)<input type="number" min="0" step="0.5" inputmode="decimal" [(ngModel)]="s.discount">
            @if (show(discountErr, s.discount); as m) { <span class="fe">{{ m }}</span> }</label>
          <div class="tot"><span>Total a cobrar</span><b class="money">{{ fmt(t().tot) }}</b></div>
          <div class="opt">
            <span class="f-l">Forma de pago</span>
            <div class="chips">
              @for (p of methods; track p) { <button type="button" class="chip" [class.on]="s.pay === p" (click)="s.pay = p">{{ p }}</button> }
            </div>
          </div>
          @if (s.pay === 'Efectivo') {
            <label class="f" [class.bad]="show(receivedErr, s.received)">El cliente paga con (S/)<input type="number" min="0" step="0.5" inputmode="decimal" [(ngModel)]="s.received">
              @if (show(receivedErr, s.received); as m) { <span class="fe">{{ m }}</span> }</label>
            <div class="chips">
              <button type="button" class="chip" (click)="s.received = t().tot">Exacto</button>
              @for (b of bills(); track b) { <button type="button" class="chip" (click)="s.received = b">S/ {{ b }}</button> }
            </div>
            <div class="change"><span>Vuelto <app-hint>Lo que le devuelves al cliente: lo que paga menos el total.</app-hint></span><b class="money">{{ fmt(t().change) }}</b></div>
          }
          <label class="f">Nota (opcional)<input [(ngModel)]="s.notes" placeholder="Ej: Operación Yape 123456"></label>
          <button type="button" class="btn primary big" (click)="emit()"><app-icon name="receipt" /> Emitir nota de venta</button>
        </section>
      </div>

      <div class="bar no-print">
        <div class="in">
          <a class="btn" routerLink="/ventas"><app-icon name="back" [size]="18" /> Ventas</a>
          <div class="bt"><span>Total</span><b class="money">{{ fmt(t().tot) }}</b></div>
          <button type="button" class="btn primary" (click)="emit()">Emitir</button>
        </div>
      </div>
    </div>
    }
  `,
  styles: `
    .num { font-size: 13px; color: var(--fire-dark); }
    .err { background: var(--warn-soft); color: var(--warn); border: 1px solid #f0c48a; border-radius: 10px; padding: 12px 14px; font-weight: 600; }
    .two { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px; align-items: start; }
    .col { display: grid; gap: 20px; min-width: 0; }
    @media (max-width: 900px) { .two { grid-template-columns: 1fr; } }
    .add { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; }
    @media (max-width: 560px) { .add { grid-template-columns: 1fr 1fr; } .add select { grid-column: 1 / -1; } }
    .line { display: grid; grid-template-columns: minmax(0, 2.4fr) 100px 90px 110px auto auto; gap: 8px; align-items: end; border-top: 1px solid var(--line); padding-top: 12px; }
    .line .sub { display: grid; justify-items: end; padding-bottom: 10px; min-width: 90px; }
    @media (max-width: 700px) { .line { grid-template-columns: 1fr 1fr; } .line .d { grid-column: 1 / -1; } .line .sub { justify-items: start; } }
    .line .le { grid-column: 1 / -1; }
    .x { border: none; background: none; color: var(--muted); font: 600 13px var(--f-body); cursor: pointer; text-decoration: underline; padding: 0 0 12px; }
    .pay { position: sticky; top: 80px; }
    @media (max-width: 900px) { .pay { position: static; } }
    .tot { display: flex; justify-content: space-between; align-items: baseline; border-top: 2px solid var(--ink); border-bottom: 1px solid var(--line); padding: 10px 0; }
    .tot b { font: 800 32px var(--f-display); }
    .opt { display: grid; gap: 8px; }
    .f-l { font-size: 13px; font-weight: 600; color: var(--muted); }
    .change { display: flex; justify-content: space-between; align-items: baseline; background: var(--ok-soft); color: var(--ok); border-radius: 10px; padding: 10px 14px; }
    .change b { font-size: 22px; }
    .bar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--steel); z-index: 20; padding-bottom: env(safe-area-inset-bottom, 0px); }
    .bar .in { max-width: 1180px; margin: 0 auto; padding: 10px 16px; display: flex; gap: 12px; align-items: center; }
    .bar .bt { flex: 1; display: grid; text-align: center; line-height: 1.15; }
    .bar .bt span { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #aab4bd; }
    .bar .bt b { font-size: 22px; color: #ffb070; }
    .bar .btn:not(.primary) { background: var(--steel-2); border-color: #4a555f; color: #fff; }
  `,
})
export class SalePage implements OnInit {
  /** ?cot=COT-2026-0001 para cobrar el adelanto o el saldo de esa cotización. */
  readonly cot = input<string>('');

  protected store = inject(Store);
  protected sheet = inject(SheetService);
  private toast = inject(Toast);
  private router = inject(Router);
  protected methods = PAY_METHODS;
  protected units = [...UNITS, 'servicio'];
  protected fmt = fmt;
  protected s: Sale = this.store.newSale();
  protected pick = '';
  protected anon = signal(false);
  protected err = signal('');
  // El total se recalcula en cada detección de cambios porque el formulario edita el objeto directamente.
  protected t = () => saleTotals(this.s, this.store.shop().igv);
  protected bills = computed(() => [20, 50, 100, 200, 500]);
  protected tried = signal(false);

  // ---- validación
  get ce() {
    return clientErrors(this.s.client, !this.anon());
  }
  get ie() {
    return this.s.items.map(saleItemErrors);
  }
  get discountErr() {
    const sub = this.s.items.reduce((a, i) => a + (+i.qty || 0) * (+i.price || 0), 0);
    return vRange(this.s.discount || 0, 0, Math.round(sub * 100) / 100, ' soles (el subtotal)');
  }
  get receivedErr() {
    if (this.s.pay !== 'Efectivo' || !this.s.received) return '';
    return +this.s.received < this.t().tot ? `Paga menos que el total (${fmt(this.t().tot)}).` : '';
  }
  /** Muestra el error si ya se tocó Emitir o si el campo tiene algo escrito mal. */
  show(msg: string, value?: unknown) {
    return msg && (this.tried() || (value !== undefined && value !== null && String(value).trim() !== '')) ? msg : '';
  }

  ngOnInit() {
    const c = this.cot();
    if (!c) return;
    const fromQuote = this.store.saleFromQuote(c);
    if (fromQuote) this.s = fromQuote;
    else this.toast.show('No encontré esa cotización.');
  }

  setAnon() {
    this.anon.set(true);
    this.s.client = { name: '', doc: '', tel: '', place: '' };
  }

  fillClient() {
    const name = this.s.client.name.trim().toLowerCase();
    const hit = this.store.clients().find((c) => c.client.name.trim().toLowerCase() === name);
    if (hit) this.s.client = { ...hit.client };
  }

  addFromCatalog() {
    const c = this.store.catalog().find((x) => x.code === this.pick);
    if (!c) return;
    this.s.items.push({ desc: c.name, unit: c.unit, qty: 1, price: c.material + c.labor });
    this.pick = '';
  }

  addLine() {
    this.s.items.push({ desc: '', unit: 'unidad', qty: 1, price: 0 });
  }

  emit() {
    this.tried.set(true);
    const fail = (m: string) => {
      this.err.set(m);
      focusFirstError();
      if (!document.querySelector('.bad')) window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    if (hasErrors(this.ce)) return fail('Revisa los datos del cliente marcados en rojo.');
    if (!this.s.items.length) return fail('Agrega al menos una línea con lo que cobras.');
    if (hasErrors(this.ie)) return fail('Cada línea necesita descripción, cantidad y precio. Están marcadas en rojo.');
    if (this.discountErr) return fail('El descuento no puede ser mayor que lo que cobras.');
    if (this.t().tot <= 0) return fail('El total debe ser mayor a S/ 0.00.');
    if (this.s.pay !== 'Efectivo' || !this.s.received) this.s.received = this.t().tot;
    if (this.receivedErr) return fail('El monto que paga el cliente es menor al total.');
    this.err.set('');
    this.store.saveSale(this.s);
    this.toast.show(`Nota de venta ${this.s.num} emitida.`);
    this.router.navigate(['/boleta', this.s.num]);
  }
}
