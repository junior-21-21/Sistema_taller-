import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store, Toast } from '../core/store.service';
import { CatalogItem, Shop, UNITS } from '../core/models';
import { DEFAULT_CATALOG } from '../core/default-data';
import { fmt } from '../core/calc';
import { focusFirstError, hasErrors, shopErrors } from '../core/validate';
import { ExcelPanel } from './excel-panel';
import { Guide } from './guide';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, ExcelPanel, Guide],
  template: `
    <div class="page" (input)="changed.set(true)" (change)="changed.set(true)">
      <h1>Precios y taller</h1>

      <app-guide id="ajustes" title="Aquí configuras tu taller">
        <ol>
          <li><b>Tu archivo Excel</b>: conéctalo una vez y todo se guarda ahí solo.</li>
          <li><b>Datos del taller</b>: salen en tus hojas, contratos y notas de venta.</li>
          <li><b>Lista de precios</b>: cambia el material y la mano de obra; el precio se suma solo. Al terminar toca <b>Guardar cambios</b> (abajo).</li>
        </ol>
      </app-guide>

      <section class="card" id="excel"><app-excel-panel /></section>

      <section class="card">
        <h2>Datos del taller</h2>
        <p class="muted small">Salen en la hoja de cotización, en el contrato y en las notas de venta.</p>
        <div class="grid">
          <label class="f" [class.bad]="show(se.name, shop.name)"><span>Nombre del taller <span class="req">*</span></span><input [(ngModel)]="shop.name">
            @if (show(se.name, shop.name); as m) { <span class="fe">{{ m }}</span> }</label>
          <label class="f" [class.bad]="show(se.ruc, shop.ruc)"><span>RUC <span class="muted">(opcional)</span></span><input [(ngModel)]="shop.ruc" inputmode="numeric" maxlength="11" placeholder="11 números">
            @if (show(se.ruc, shop.ruc); as m) { <span class="fe">{{ m }}</span> }</label>
          <label class="f" [class.bad]="show(se.tel, shop.tel)"><span>Celular <span class="muted">(opcional)</span></span><input [(ngModel)]="shop.tel" inputmode="tel" placeholder="9XX XXX XXX">
            @if (show(se.tel, shop.tel); as m) { <span class="fe">{{ m }}</span> }</label>
          <label class="f">Dirección<input [(ngModel)]="shop.address"></label>
          <label class="f">Quién firma los contratos<input [(ngModel)]="shop.rep" placeholder="Nombre del dueño"></label>
          <label class="f" [class.bad]="show(se.repDni, shop.repDni)"><span>DNI de quien firma <span class="muted">(opcional)</span></span><input [(ngModel)]="shop.repDni" inputmode="numeric" maxlength="8" placeholder="8 números">
            @if (show(se.repDni, shop.repDni); as m) { <span class="fe">{{ m }}</span> }</label>
        </div>
        <h3>Notas de venta</h3>
        <div class="grid">
          <label class="f" [class.bad]="show(se.serie, shop.serie)"><span>Serie <span class="req">*</span></span><input [(ngModel)]="shop.serie" maxlength="6" placeholder="NV01">
            @if (show(se.serie, shop.serie); as m) { <span class="fe">{{ m }}</span> }</label>
          <label class="f">Yape / Plin / cuenta (sale en la boleta)<input [(ngModel)]="shop.payInfo" placeholder="Yape 966 123 456"></label>
        </div>
        <label class="f">Mensaje al pie de la boleta<input [(ngModel)]="shop.footer"></label>
        <h3>Valores por defecto de cada cotización nueva</h3>
        <div class="grid">
          <label class="f" [class.bad]="show(se.advance, shop.advance)"><span>Adelanto (%)</span><input [(ngModel)]="shop.advance" type="number" min="0" max="100">
            @if (show(se.advance, shop.advance); as m) { <span class="fe">{{ m }}</span> }</label>
          <label class="f" [class.bad]="show(se.validity, shop.validity)"><span>Validez (días)</span><input [(ngModel)]="shop.validity" type="number" min="1">
            @if (show(se.validity, shop.validity); as m) { <span class="fe">{{ m }}</span> }</label>
          <label class="f" [class.bad]="show(se.warranty, shop.warranty)"><span>Garantía (meses)</span><input [(ngModel)]="shop.warranty" type="number" min="0">
            @if (show(se.warranty, shop.warranty); as m) { <span class="fe">{{ m }}</span> }</label>
          <label class="f" [class.bad]="show(se.maxDiscount, shop.maxDiscount)"><span>Descuento máximo (%)</span><input [(ngModel)]="shop.maxDiscount" type="number" min="0" max="100">
            @if (show(se.maxDiscount, shop.maxDiscount); as m) { <span class="fe">{{ m }}</span> }</label>
        </div>
        <label class="check"><input type="checkbox" [(ngModel)]="shop.igv"> Sumar IGV 18% por defecto</label>
      </section>

      <section class="card">
        <div class="row">
          <h2>Lista de precios</h2>
          <span class="spacer"></span>
          <button type="button" class="btn" (click)="addRow()">+ Agregar trabajo</button>
        </div>
        <p class="muted small">Precio = material + mano de obra. También puedes cambiarlos en la hoja "Precios" del Excel y volver a abrirlo.</p>
        @if (samples()) {
          <div class="sample">⚠ Tu lista tiene <b>{{ samples() }} precios de ejemplo</b> (sin cambiar). Pon tus precios reales o quítalos con el botón de abajo.</div>
        }
        @if (!catalog.length) {
          <div class="empty">Todavía no tienes trabajos. Toca <b>+ Agregar trabajo</b> y pon tus precios reales.</div>
        }
        <div class="tbl">
          <table>
            <thead><tr><th>Categoría</th><th>Trabajo</th><th>Qué incluye</th><th>Unidad</th><th class="n">Material</th><th class="n">Mano de obra</th><th class="n">Precio</th><th></th></tr></thead>
            <tbody>
              @for (c of catalog; track $index; let i = $index) {
                <tr>
                  <td><input [(ngModel)]="c.cat" aria-label="Categoría"></td>
                  <td><input [(ngModel)]="c.name" aria-label="Trabajo" placeholder="Nombre del trabajo *" [class.bad]="tried() && !c.name.trim() && (+c.material || +c.labor || c.inc)"></td>
                  <td><input [(ngModel)]="c.inc" aria-label="Qué incluye"></td>
                  <td><select [(ngModel)]="c.unit" aria-label="Unidad">@for (u of units; track u) { <option [value]="u">{{ u }}</option> }</select></td>
                  <td><input class="num" type="number" min="0" step="0.5" [(ngModel)]="c.material" aria-label="Material" [class.bad]="+c.material < 0"></td>
                  <td><input class="num" type="number" min="0" step="0.5" [(ngModel)]="c.labor" aria-label="Mano de obra" [class.bad]="+c.labor < 0"></td>
                  <td class="n money">{{ fmt((+c.material || 0) + (+c.labor || 0)) }}</td>
                  <td><button type="button" class="x" (click)="removeRow(i)" aria-label="Quitar">Quitar</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="row">
          @if (samples() ) {
            <button type="button" class="btn danger" (click)="removeSamples()">{{ confirmReset() ? '¿Seguro? Toca otra vez' : 'Quitar los ' + samples() + ' precios de ejemplo' }}</button>
          }
        </div>
      </section>

      <div class="bar no-print" [class.show]="changed()">
        <div class="in">
          <span>{{ barMsg() || 'Tienes cambios sin guardar' }}</span>
          <span class="spacer"></span>
          <button type="button" class="btn" (click)="discard()">Descartar</button>
          <button type="button" class="btn primary" (click)="save()">Guardar cambios</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    h3 { margin-top: 6px; }
    .check { display: flex; gap: 10px; align-items: center; font-weight: 600; }
    .check input { width: 22px; height: 22px; accent-color: var(--fire); }
    .tbl { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; }
    table { border-collapse: collapse; width: 100%; min-width: 980px; }
    th { text-align: left; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 10px 8px; background: var(--bg); position: sticky; top: 0; }
    td { padding: 4px; border-top: 1px solid var(--line); }
    td input, td select { padding: 7px 8px; font-size: 14px; border-color: transparent; background: transparent; }
    td input:hover, td select:hover { border-color: var(--line); }
    td input.num { width: 100px; text-align: right; }
    .sample { background: var(--warn-soft); color: var(--warn); border: 1px solid #f0c48a; border-radius: 10px; padding: 10px 14px; font-weight: 600; }
    td input.bad { border-color: var(--bad); background: var(--bad-soft); }
    .n { text-align: right; padding-right: 10px; }
    .x { border: none; background: none; color: var(--muted); font: 600 13px var(--f-body); cursor: pointer; text-decoration: underline; }
    .bar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--steel); color: #fff; z-index: 40; transform: translateY(110%); transition: transform .2s; padding-bottom: env(safe-area-inset-bottom, 0px); }
    .bar.show { transform: none; }
    .bar .in { max-width: 1080px; margin: 0 auto; padding: 10px 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .bar .btn:not(.primary) { background: var(--steel-2); border-color: #4a555f; color: #fff; }
  `,
})
export class SettingsPage {
  private store = inject(Store);
  private toast = inject(Toast);
  protected units = UNITS;
  protected fmt = fmt;
  protected shop: Shop = structuredClone(this.store.shop());
  protected catalog: CatalogItem[] = structuredClone(this.store.catalog());
  protected changed = signal(false);
  protected confirmReset = signal(false);
  protected tried = signal(false);
  protected barMsg = signal('');

  get se() {
    return shopErrors(this.shop);
  }
  /** Muestra el error si ya se tocó Guardar o si el campo tiene algo escrito mal. */
  show(msg: string, value?: unknown) {
    return msg && (this.tried() || (value !== undefined && value !== null && String(value).trim() !== '')) ? msg : '';
  }

  addRow() {
    const n = this.catalog.filter((c) => c.code.startsWith('X-')).length + 1;
    this.catalog.push({ code: `X-${String(n).padStart(2, '0')}`, cat: 'Otros', name: '', inc: '', unit: 'unidad', material: 0, labor: 0 });
    this.changed.set(true);
  }

  removeRow(i: number) {
    this.catalog.splice(i, 1);
    this.changed.set(true);
  }

  /** Un precio es de ejemplo si sigue igual al que traía la plantilla. */
  private isSample = (c: CatalogItem) =>
    DEFAULT_CATALOG.some((d) => d.code === c.code && d.name === c.name && d.material === +c.material && d.labor === +c.labor);
  samples() {
    return this.catalog.filter(this.isSample).length;
  }

  removeSamples() {
    if (!this.confirmReset()) {
      this.confirmReset.set(true);
      setTimeout(() => this.confirmReset.set(false), 4000);
      return;
    }
    this.catalog = this.catalog.filter((c) => !this.isSample(c));
    this.confirmReset.set(false);
    this.save();
  }

  discard() {
    this.shop = structuredClone(this.store.shop());
    this.catalog = structuredClone(this.store.catalog());
    this.tried.set(false);
    this.barMsg.set('');
    this.changed.set(false);
  }

  save() {
    this.tried.set(true);
    const badRows = this.catalog.filter((c) => (!c.name.trim() && (+c.material || +c.labor || c.inc)) || +c.material < 0 || +c.labor < 0);
    if (hasErrors(this.se) || badRows.length) {
      const m = hasErrors(this.se) ? 'Revisa los datos marcados en rojo.' : 'Hay trabajos sin nombre o con precio negativo.';
      this.barMsg.set(m);
      this.toast.show(m);
      focusFirstError();
      return;
    }
    this.barMsg.set('');
    const clean = this.catalog
      .filter((c) => c.name.trim())
      .map((c) => ({ ...c, material: +c.material || 0, labor: +c.labor || 0, cat: c.cat.trim() || 'Otros' }));
    this.store.setCatalog(clean);
    this.store.setShop({ ...this.shop, advance: +this.shop.advance || 0, validity: +this.shop.validity || 15, warranty: +this.shop.warranty || 0, maxDiscount: +this.shop.maxDiscount || 0, serie: (this.shop.serie || 'NV01').trim().toUpperCase() });
    this.catalog = structuredClone(clean);
    this.changed.set(false);
    this.toast.show('Cambios guardados');
  }
}
