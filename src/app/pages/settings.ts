import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store, Toast } from '../core/store.service';
import { Shop } from '../core/models';
import { focusFirstError, hasErrors, shopErrors } from '../core/validate';
import { ExcelPanel } from './excel-panel';
import { Prices } from './prices';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, ExcelPanel, Prices],
  template: `
    <div class="page" (input)="changed.set(true)" (change)="changed.set(true)">
      <h1>Precios y taller</h1>

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
          <label class="f" [class.bad]="show(se.tel2, shop.tel2)"><span>Otro celular <span class="muted">(opcional)</span></span><input [(ngModel)]="shop.tel2" inputmode="tel" placeholder="9XX XXX XXX">
            @if (show(se.tel2, shop.tel2); as m) { <span class="fe">{{ m }}</span> }</label>
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

      <app-prices />

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
    .bar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--steel); color: #fff; z-index: 40; transform: translateY(110%); transition: transform .2s; padding-bottom: env(safe-area-inset-bottom, 0px); }
    .bar.show { transform: none; }
    .bar .in { max-width: 1080px; margin: 0 auto; padding: 10px 16px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .bar .btn:not(.primary) { background: var(--steel-2); border-color: #4a555f; color: #fff; }
  `,
})
export class SettingsPage {
  private store = inject(Store);
  private toast = inject(Toast);
  protected shop: Shop = structuredClone(this.store.shop());
  protected changed = signal(false);
  protected tried = signal(false);
  protected barMsg = signal('');

  get se() {
    return shopErrors(this.shop);
  }
  /** Muestra el error si ya se tocó Guardar o si el campo tiene algo escrito mal. */
  show(msg: string, value?: unknown) {
    return msg && (this.tried() || (value !== undefined && value !== null && String(value).trim() !== '')) ? msg : '';
  }

  discard() {
    this.shop = structuredClone(this.store.shop());
    this.tried.set(false);
    this.barMsg.set('');
    this.changed.set(false);
  }

  save() {
    this.tried.set(true);
    if (hasErrors(this.se)) {
      const m = 'Revisa los datos marcados en rojo.';
      this.barMsg.set(m);
      this.toast.show(m);
      focusFirstError();
      return;
    }
    this.barMsg.set('');
    this.store.setShop({ ...this.shop, advance: +this.shop.advance || 0, validity: +this.shop.validity || 15, warranty: +this.shop.warranty || 0, maxDiscount: +this.shop.maxDiscount || 0, serie: (this.shop.serie || 'NV01').trim().toUpperCase() });
    this.changed.set(false);
    this.toast.show('Cambios guardados');
  }
}
