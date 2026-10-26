import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store, Toast } from '../core/store.service';
import { fmt, round2, totals } from '../core/calc';
import { Icon } from './icon';

/** Ventana para aceptar el trabajo dando un descuento especial sobre el precio cotizado. */
@Component({
  selector: 'app-close-deal',
  imports: [FormsModule, Icon],
  template: `
    @if (q(); as q) {
      <div class="back" (click)="closed.emit()"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Aceptar con descuento">
        <div class="mh">
          <span class="mi"><app-icon name="cash" [size]="22" /></span>
          <div class="tt"><h2>Aceptar con descuento</h2><span>{{ q.num }} · {{ q.client.name }}</span></div>
          <button type="button" class="xbtn" (click)="closed.emit()" aria-label="Cerrar"><app-icon name="close" /></button>
        </div>
        <div class="mb">
          <p class="muted">Si el cliente acepta el trabajo con un precio menor, pon aquí el descuento. La cotización pasa a <b>Aceptada</b> y el adelanto, el contrato y los cobros usan el precio nuevo.</p>
          <div class="was"><span>Precio cotizado</span><b class="money">{{ fmt(base().quoted) }}</b></div>

          <div class="chips">
            <button type="button" class="chip" [class.on]="mode() === 'soles'" (click)="mode.set('soles')">En soles (S/)</button>
            <button type="button" class="chip" [class.on]="mode() === 'pct'" (click)="mode.set('pct')">En porcentaje (%)</button>
          </div>
          <label class="f" [class.bad]="!!err()">
            <span>Descuento especial {{ mode() === 'pct' ? '(%)' : '(S/)' }}</span>
            <input id="cd-val" type="number" min="0" step="any" inputmode="decimal" [ngModel]="value()" (ngModelChange)="value.set($event)">
            @if (err()) { <span class="fe">{{ err() }}</span> }
          </label>
          <div class="quick">
            @if (mode() === 'pct') {
              @for (p of [3, 5, 8, 10]; track p) { <button type="button" class="chip" (click)="value.set(p)">{{ p }}%</button> }
            } @else {
              @for (p of [20, 50, 100, 200]; track p) { <button type="button" class="chip" (click)="value.set(p)">S/ {{ p }}</button> }
              <button type="button" class="chip" (click)="roundDown()">Redondear precio</button>
            }
          </div>

          <div class="now">
            <div><span>Nuevo precio</span><b class="money">{{ fmt(preview().tot) }}</b></div>
            <div><span>Ahorro del cliente</span><b class="money ok">−{{ fmt(round2(base().quoted - preview().tot)) }}</b></div>
            <div><span>{{ q.advanceAmt ? 'Adelanto' : 'Adelanto ' + q.advance + '%' }}</span><b class="money">{{ fmt(preview().advM) }}</b></div>
          </div>
        </div>
        <div class="mf">
          @if (q.special) { <button type="button" class="btn ghost" (click)="remove()">Quitar descuento</button> }
          <span class="spacer"></span>
          <button type="button" class="btn ghost" (click)="closed.emit()">Cancelar</button>
          <button type="button" class="btn primary" (click)="save()">{{ q.estado === 'Aceptada' ? 'Guardar descuento' : 'Aceptar trabajo' }}</button>
        </div>
      </div>
    }
  `,
  styles: `
    .back { position: fixed; inset: 0; background: rgba(15, 18, 22, .55); z-index: 70; backdrop-filter: blur(2px); }
    .modal { position: fixed; z-index: 71; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(500px, calc(100% - 24px));
      max-height: calc(100dvh - 24px); display: grid; grid-template-rows: auto 1fr auto; background: var(--panel); border-radius: 16px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.4); }
    .mh { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--steel); background-image: var(--plate); color: #fff; border-bottom: 4px solid transparent; border-image: var(--hazard) 1; }
    .tt { flex: 1; display: grid; }
    .tt h2 { margin: 0; color: #fff; }
    .tt h2::after { display: none; }
    .tt span { font-size: 13px; color: #cfd6dc; }
    .mi { width: 38px; height: 38px; border-radius: 9px; background: var(--molten); display: grid; place-items: center; }
    .xbtn { background: none; border: none; color: #fff; cursor: pointer; padding: 6px; border-radius: 8px; }
    .mb { overflow: auto; padding: 16px; display: grid; gap: 12px; }
    .mb > p { margin: 0; }
    .was { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px dashed var(--line); padding-bottom: 8px; }
    .was b { font-size: 20px; text-decoration: line-through; color: var(--muted); }
    .f { display: grid; gap: 6px; }
    .quick { display: flex; gap: 6px; flex-wrap: wrap; }
    .quick .chip { padding: 6px 11px; font-size: 13px; }
    .now { display: grid; gap: 6px; background: var(--soft); border: 1.5px solid #f6c59a; border-radius: 12px; padding: 12px 14px; }
    .now div { display: flex; justify-content: space-between; align-items: baseline; }
    .now div:first-child b { font: 800 30px var(--f-display); color: var(--fire-dark); }
    .now .ok { color: var(--ok); }
    .mf { display: flex; gap: 10px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); background: var(--bg); flex-wrap: wrap; }
    @media (max-width: 560px) { .modal { top: auto; bottom: 0; transform: translateX(-50%); border-radius: 16px 16px 0 0; width: 100%; } }
  `,
})
export class CloseDeal implements OnInit {
  readonly num = input.required<string>();
  readonly closed = output<void>();

  private store = inject(Store);
  private toast = inject(Toast);
  protected fmt = fmt;
  protected round2 = round2;

  protected q = computed(() => this.store.get(this.num()));
  protected mode = signal<'soles' | 'pct'>('soles');
  protected value = signal<number | null>(null);

  ngOnInit() {
    const q = this.q();
    if (q?.special) this.value.set(round2(q.special * (q.igv ? 1.18 : 1)));
    setTimeout(() => document.getElementById('cd-val')?.focus());
  }

  /** Totales sin descuento especial. */
  protected base = computed(() => totals({ ...this.q()!, special: 0 }));

  /** Descuento en soles, antes del IGV. */
  protected soles = computed(() => {
    const v = +(this.value() ?? 0) || 0;
    const q = this.q()!;
    const b = this.base();
    const pre = b.sub - b.dsc;
    // Lo que se escribe es sobre el precio final; si lleva IGV se pasa a la base.
    const raw = this.mode() === 'pct' ? (pre * v) / 100 : q.igv ? v / 1.18 : v;
    return round2(raw);
  });

  protected preview = computed(() => totals({ ...this.q()!, special: this.soles() }));

  protected err = computed(() => {
    const v = this.value();
    if (v === null || (v as unknown) === '') return '';
    if (+v < 0) return 'No puede ser negativo.';
    const b = this.base();
    if (this.soles() >= b.sub - b.dsc) return 'El descuento no puede ser igual o mayor al precio.';
    if (this.mode() === 'pct' && +v > 50) return 'Es más de la mitad del precio. Revisa el número.';
    return '';
  });

  /** Deja el precio final en un número redondo (baja a la decena). */
  roundDown() {
    const t = this.base().quoted;
    const target = Math.floor(t / 10) * 10;
    this.mode.set('soles');
    this.value.set(round2(t - (target === t ? t - 10 : target)));
  }

  save() {
    if (this.err()) return;
    const q = this.q()!;
    const special = this.soles();
    this.store.saveQuote({ ...q, special: special || undefined, estado: 'Aceptada' });
    this.toast.show(special ? `Trabajo aceptado con ${fmt(this.base().quoted - this.preview().tot)} de descuento. Nuevo precio: ${fmt(this.preview().tot)}.` : 'Trabajo aceptado.', 5000);
    this.closed.emit();
  }

  remove() {
    this.store.saveQuote({ ...this.q()!, special: undefined });
    this.toast.show('Se quitó el descuento especial.');
    this.closed.emit();
  }
}
