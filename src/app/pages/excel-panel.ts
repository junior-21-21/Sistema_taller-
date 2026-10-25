import { Component, inject } from '@angular/core';
import { ExcelService } from '../core/excel.service';
import { Store } from '../core/store.service';

/** Botones para conectar, abrir o descargar el Excel. */
@Component({
  selector: 'app-excel-panel',
  template: `
    <div class="xp">
      <div>
        <h3>Tu archivo Excel</h3>
        @if (excel.status() === 'linked') {
          <p class="muted small">Conectado a <b>{{ excel.fileName() }}</b>. Cada cambio se guarda solo en ese archivo.
            Si lo abres en Excel, ciérralo antes de guardar una cotización.</p>
        } @else if (excel.canLink) {
          <p class="muted small">Crea un Excel nuevo o abre el que ya tienes. Ahí se guardan tus cotizaciones, tus precios y los datos del taller.</p>
        } @else {
          <p class="muted small">Este navegador no puede escribir directo en un archivo (pasa en celulares y Firefox).
            Tus datos se guardan aquí y puedes descargar el Excel cuando quieras. Para guardado automático usa Chrome o Edge en la computadora.</p>
        }
      </div>
      <div class="row">
        @if (excel.canLink) {
          @if (excel.status() === 'needs-permission') {
            <button class="btn primary" type="button" (click)="excel.reconnect()">Reconectar {{ excel.fileName() }}</button>
          }
          <button class="btn" [class.primary]="excel.status() === 'none'" type="button" (click)="excel.createFile()">Crear Excel nuevo</button>
          <button class="btn" type="button" (click)="excel.openFile()">Abrir mi Excel</button>
        } @else {
          <label class="btn">Cargar Excel
            <input type="file" accept=".xlsx" hidden (change)="pick($event)">
          </label>
        }
        <button class="btn" [class.primary]="!excel.canLink && store.dirty()" type="button" (click)="excel.download()">Descargar copia</button>
      </div>
    </div>
  `,
  styles: `
    .xp { display: grid; gap: 12px; }
    .xp p { margin: 4px 0 0; max-width: 70ch; }
  `,
})
export class ExcelPanel {
  protected excel = inject(ExcelService);
  protected store = inject(Store);

  pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.excel.importFile(f);
    (e.target as HTMLInputElement).value = '';
  }
}
