import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Detail } from '../core/models';
import {
  ACCESORIOS, BASES, CHAPAS, COLORES, DISENOS, MATERIALES, MEDIDAS, PINTURAS, PLANTILLAS, SOLDADURAS, applyTemplate, detailLines, fixDetail,
} from '../core/detail';
import { Icon } from './icon';

/** Formulario de especificación técnica: materiales con espesores, chapa, accesorios y acabado. */
@Component({
  selector: 'app-detail-editor',
  imports: [FormsModule, Icon],
  template: `
    @let d = detail();
    <div class="de">
      <section class="tpl">
        <h4><app-icon name="spark" [size]="16" /> Llenar rápido</h4>
        <div class="quick">
          @for (t of plantillas; track t.name) {
            <button type="button" class="chip" (click)="useTemplate(t.name)">{{ t.name }}</button>
          }
        </div>
        @if (copyFrom().length) {
          <div class="quick">
            <span class="muted small">Copiar de:</span>
            @for (o of copyFrom(); track $index) {
              <button type="button" class="chip" (click)="copy(o.detail)">⧉ {{ o.name }}</button>
            }
          </div>
        }
        <p class="muted small">Pone materiales y medidas comunes. Revisa y corrige los espesores y cantidades.</p>
      </section>

      <section>
        <h4><app-icon name="bars" [size]="16" /> Materiales y espesores</h4>
        @for (m of d.mats; track $index; let i = $index) {
          <div class="mat">
            <label class="f"><span>Material</span>
              <input [(ngModel)]="m.name" [attr.list]="uid + '-mat'" placeholder="Ej: Tubo cuadrado" (ngModelChange)="changed.emit()"></label>
            <label class="f"><span>Medida / espesor</span>
              <input [(ngModel)]="m.spec" [attr.list]="uid + '-med'" placeholder='Ej: 2"x2" · 1.5 mm' (ngModelChange)="changed.emit()"></label>
            <label class="f"><span>Cantidad</span>
              <input [(ngModel)]="m.qty" placeholder="Ej: 4 tubos" (ngModelChange)="changed.emit()"></label>
            <button type="button" class="rm" (click)="d.mats.splice(i, 1); changed.emit()" aria-label="Quitar material"><app-icon name="close" [size]="16" /></button>
          </div>
        } @empty {
          <p class="muted small">Agrega los tubos, planchas, fierros, etc. con su medida y espesor.</p>
        }
        <div class="quick">
          @for (n of quick; track n) {
            <button type="button" class="chip" (click)="addMat(n)">+ {{ n }}</button>
          }
          <button type="button" class="chip" (click)="addMat('')">+ Otro material</button>
        </div>
        <datalist [id]="uid + '-mat'">@for (n of materiales; track n) { <option [value]="n"></option> }</datalist>
        <datalist [id]="uid + '-med'">@for (n of medidas; track n) { <option [value]="n"></option> }</datalist>
      </section>

      <section>
        <h4><app-icon name="door" [size]="16" /> Pliegues u hojas</h4>
        <div class="chips">
          <button type="button" class="chip" [class.on]="!d.pliegues" (click)="d.pliegues = 0; changed.emit()">No aplica</button>
          @for (n of pliegues; track n) {
            <button type="button" class="chip" [class.on]="+d.pliegues === n" (click)="d.pliegues = n; changed.emit()">{{ n }}</button>
          }
          <input class="mini" type="number" min="0" max="40" step="1" inputmode="numeric" [(ngModel)]="d.pliegues" (ngModelChange)="changed.emit()" aria-label="Otro número de pliegues">
        </div>
        <p class="muted small">Ej: puerta plegable de 4 pliegues, portón de 2 hojas.</p>
      </section>

      <section>
        <h4><app-icon name="spark" [size]="16" /> Diseño</h4>
        <div class="chips">
          <button type="button" class="chip" [class.on]="!d.diseno" (click)="d.diseno = ''; changed.emit()">No indicar</button>
          @for (x of disenos; track x) {
            <button type="button" class="chip" [class.on]="d.diseno === x" (click)="d.diseno = x; changed.emit()">{{ x }}</button>
          }
        </div>
        <input [(ngModel)]="d.diseno" placeholder="U otro: Ej: barrotes con puntas de lanza" (ngModelChange)="changed.emit()" aria-label="Diseño">
      </section>

      <section>
        <h4><app-icon name="door" [size]="16" /> ¿Incluye chapa?</h4>
        <div class="chips">
          <button type="button" class="chip" [class.on]="!d.chapa" (click)="d.chapa = ''; changed.emit()">No incluye</button>
          @for (c of chapas; track c) {
            <button type="button" class="chip" [class.on]="d.chapa === c" (click)="d.chapa = c; changed.emit()">{{ c }}</button>
          }
        </div>
        @if (d.chapa) {
          <label class="f"><span>Marca o detalle de la chapa <span class="muted">(opcional)</span></span>
            <input [ngModel]="d.chapa" (ngModelChange)="d.chapa = $event || d.chapa; changed.emit()" placeholder="Ej: Chapa Forte de 2 golpes"></label>
        }
      </section>

      <section>
        <h4><app-icon name="torch" [size]="16" /> Accesorios incluidos</h4>
        <div class="chips">
          @for (a of accesorios; track a) {
            <button type="button" class="chip" [class.on]="d.accesorios.includes(a)" (click)="toggle(a)">{{ d.accesorios.includes(a) ? '✓ ' : '' }}{{ a }}</button>
          }
        </div>
      </section>

      <section>
        <h4><app-icon name="spark" [size]="16" /> Acabado y pintura</h4>
        <span class="lbl">Base anticorrosiva</span>
        <div class="chips">
          @for (b of bases; track b) {
            <button type="button" class="chip" [class.on]="d.base === b" (click)="d.base = b; changed.emit()">{{ b || 'Sin base' }}</button>
          }
        </div>
        <span class="lbl">Acabado final</span>
        <div class="chips">
          @for (p of pinturas; track p) {
            <button type="button" class="chip" [class.on]="d.pintura === p" (click)="d.pintura = p; changed.emit()">{{ p }}</button>
          }
        </div>
        <input [(ngModel)]="d.pintura" placeholder="U otro acabado" (ngModelChange)="changed.emit()" aria-label="Acabado final">
        @if (d.pintura !== 'Sin pintura') {
          <span class="lbl">Manos de pintura</span>
          <div class="chips">
            <button type="button" class="chip" [class.on]="!+d.manos" (click)="d.manos = 0; changed.emit()">No indicar</button>
            @for (n of [1, 2, 3]; track n) {
              <button type="button" class="chip" [class.on]="+d.manos === n" (click)="d.manos = n; changed.emit()">{{ n }} {{ n === 1 ? 'mano' : 'manos' }}</button>
            }
          </div>
          <span class="lbl">Color</span>
          <div class="chips">
            @for (c of colores; track c) {
              <button type="button" class="chip" [class.on]="d.color === c" (click)="d.color = d.color === c ? '' : c; changed.emit()">{{ c }}</button>
            }
          </div>
          <input [(ngModel)]="d.color" placeholder="U otro color: Ej: verde botella" (ngModelChange)="changed.emit()" aria-label="Color">
        }
      </section>

      <section>
        <h4><app-icon name="torch" [size]="16" /> Soldadura</h4>
        <div class="chips">
          <button type="button" class="chip" [class.on]="!d.soldadura" (click)="d.soldadura = ''; changed.emit()">No indicar</button>
          @for (x of soldaduras; track x) {
            <button type="button" class="chip" [class.on]="d.soldadura === x" (click)="d.soldadura = x; changed.emit()">{{ x }}</button>
          }
        </div>
      </section>

      <section class="tg">
        <label class="check"><input type="checkbox" [(ngModel)]="d.instalacion" (ngModelChange)="changed.emit()"> Incluye instalación</label>
        <label class="check"><input type="checkbox" [(ngModel)]="d.transporte" (ngModelChange)="changed.emit()"> Incluye transporte</label>
      </section>

      <label class="f"><span>Otros detalles <span class="muted">(opcional)</span></span>
        <textarea rows="2" [(ngModel)]="d.notas" placeholder="Ej: refuerzo en las esquinas, cerco eléctrico encima" (ngModelChange)="changed.emit()"></textarea></label>

      <section class="pv">
        <h4><app-icon name="bars" [size]="16" /> Así lo verá el cliente</h4>
        <ul>@for (l of lines(); track $index) { <li>{{ l }}</li> }</ul>
      </section>
    </div>
  `,
  styles: `
    .de { display: grid; gap: 16px; }
    section { display: grid; gap: 8px; }
    h4 { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 14px; text-transform: uppercase; letter-spacing: .05em; color: var(--steel-3); }
    h4 app-icon { color: var(--fire); }
    .f { display: grid; gap: 4px; font-size: 12.5px; font-weight: 600; color: var(--muted); min-width: 0; }
    .mat { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, .8fr) auto; gap: 8px; align-items: end;
      background: var(--bg); border-radius: 10px; padding: 8px; }
    .mat input { padding: 8px 10px; font-size: 15px; }
    @media (max-width: 560px) { .mat { grid-template-columns: 1fr 1fr; } .mat .f:first-child { grid-column: 1 / -1; } .rm { grid-column: 2; justify-self: end; } }
    .rm { border: none; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; width: 38px; height: 38px; display: grid; place-items: center; cursor: pointer; color: var(--muted); }
    .rm:hover { color: var(--bad); border-color: var(--bad); }
    .quick { display: flex; gap: 6px; flex-wrap: wrap; }
    .quick .chip, .chips .chip { padding: 6px 11px; font-size: 13px; }
    .mini { width: 80px; padding: 6px 10px; font-size: 14px; }
    section > p { margin: 0; }
    .lbl { font-size: 12.5px; font-weight: 600; color: var(--muted); margin-top: 2px; }
    section > input { padding: 8px 10px; font-size: 15px; }
    .tpl { background: var(--soft); border: 1.5px dashed #f6c59a; border-radius: 12px; padding: 10px 12px; }
    .pv { background: var(--bg); border-radius: 12px; padding: 10px 12px; }
    .pv ul { margin: 0; padding-left: 18px; display: grid; gap: 2px; font-size: 14px; }
    .tg { display: flex; gap: 18px; flex-wrap: wrap; }
    .check { display: flex; gap: 8px; align-items: center; font-weight: 600; }
    .check input { width: 20px; height: 20px; accent-color: var(--fire); }
  `,
})
export class DetailEditor {
  readonly detail = input.required<Detail>();
  readonly changed = output<void>();
  /** Otros trabajos de la misma cotización, para copiar su detalle. */
  readonly copyFrom = input<{ name: string; detail: Detail }[]>([]);

  private static n = 0;
  protected uid = `de${++DetailEditor.n}`;
  protected chapas = CHAPAS;
  protected accesorios = ACCESORIOS;
  protected pinturas = PINTURAS;
  protected materiales = MATERIALES;
  protected medidas = MEDIDAS;
  protected pliegues = [1, 2, 3, 4, 5, 6, 8];
  protected bases = BASES;
  protected colores = COLORES;
  protected soldaduras = SOLDADURAS;
  protected disenos = DISENOS;
  protected plantillas = PLANTILLAS;
  /** Se recalcula en cada cambio (el detalle se edita en el mismo objeto). */
  protected lines = () => detailLines(this.detail());

  useTemplate(name: string) {
    applyTemplate(this.detail(), name);
    this.changed.emit();
  }

  copy(src: Detail) {
    Object.assign(this.detail(), structuredClone(fixDetail(src)));
    this.changed.emit();
  }
  protected quick = ['Tubo cuadrado', 'Tubo rectangular', 'Plancha LAF', 'Ángulo', 'Fierro liso'];

  addMat(name: string) {
    this.detail().mats.push({ name, spec: '', qty: '' });
    this.changed.emit();
    setTimeout(() => {
      const rows = document.querySelectorAll<HTMLInputElement>(`.mat input[list="${this.uid}-med"]`);
      (name ? rows[rows.length - 1] : document.querySelectorAll<HTMLInputElement>(`.mat input[list="${this.uid}-mat"]`)[rows.length - 1])?.focus();
    });
  }

  toggle(a: string) {
    const d = this.detail();
    d.accesorios = d.accesorios.includes(a) ? d.accesorios.filter((x) => x !== a) : [...d.accesorios, a];
    this.changed.emit();
  }
}
