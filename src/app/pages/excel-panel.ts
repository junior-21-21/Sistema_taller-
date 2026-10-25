import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExcelService } from '../core/excel.service';
import { Store } from '../core/store.service';
import { setClientId } from '../core/drive';
import { fmtDate } from '../core/calc';

/** Botones para conectar el Excel: en esta computadora o en Google Drive. */
@Component({
  selector: 'app-excel-panel',
  imports: [FormsModule],
  template: `
    <div class="xp" (input)="$event.stopPropagation()" (change)="$event.stopPropagation()">
      <div>
        <h3>Tu archivo Excel</h3>
        @if (excel.status() === 'linked') {
          <p class="ok-line">✓ Conectado a <b>{{ excel.fileName() }}</b>
            {{ excel.source() === 'drive' ? 'en Google Drive' : 'en esta computadora' }}. Cada cambio se guarda solo.</p>
        } @else if (excel.status() === 'needs-permission') {
          <p class="warn-line">Toca <b>Reconectar</b> para seguir guardando en <b>{{ excel.fileName() }}</b>
            {{ excel.source() === 'drive' ? '(Google Drive)' : '' }}.</p>
          <div class="row"><button class="btn primary" type="button" (click)="excel.reconnect()" [disabled]="excel.driveBusy()">
            {{ excel.driveBusy() ? 'Conectando…' : 'Reconectar ' + (excel.source() === 'drive' ? 'Drive' : excel.fileName()) }}</button></div>
        } @else {
          <p class="muted small">Elige dónde guardar tus cotizaciones, ventas y precios.</p>
        }
      </div>

      <div class="opts">
        <!-- Google Drive -->
        <section class="op" [class.on]="excel.source() === 'drive'">
          <h4><span class="gd" aria-hidden="true">▲</span> Google Drive <span class="tag">PC y celular</span></h4>
          <p class="muted small">Tu Excel queda en tu Drive y lo puedes usar desde cualquier computadora o celular.</p>
          @if (!excel.hasClientId()) {
            <label class="f">ID de cliente de Google
              <input [(ngModel)]="cid" placeholder="xxxxx.apps.googleusercontent.com" autocomplete="off"></label>
            <button class="btn" type="button" (click)="saveCid()" [disabled]="!cid.trim().endsWith('.apps.googleusercontent.com')">Guardar ID</button>
          } @else if (excel.source() === 'drive' && excel.status() !== 'none') {
            <div class="row">
              <button class="btn" type="button" (click)="excel.driveStart()" [disabled]="excel.driveBusy()">Cambiar archivo</button>
              <button class="btn ghost" type="button" (click)="excel.driveDisconnect()">Desconectar</button>
            </div>
          } @else {
            <button class="btn primary" type="button" (click)="excel.driveStart()" [disabled]="excel.driveBusy()">
              {{ excel.driveBusy() ? 'Conectando…' : 'Conectar con Google Drive' }}</button>
          }
          @if (excel.driveFiles(); as files) {
            <div class="pick">
              <b>Elige tu Excel de Drive</b>
              @for (f of files; track f.id) {
                <button type="button" class="fi" (click)="excel.driveOpen(f)" [disabled]="excel.driveBusy()">
                  <span class="xi" aria-hidden="true">X</span>
                  <span class="fn"><b>{{ f.name }}</b><span class="muted small">Modificado {{ fmtDate(f.modifiedTime.slice(0, 10)) }}</span></span>
                </button>
              } @empty {
                <p class="muted small">No encontré archivos Excel (.xlsx) en tu Drive.</p>
              }
              <div class="row">
                <button class="btn" type="button" (click)="excel.driveCreate()" [disabled]="excel.driveBusy()">+ Crear runrun-datos.xlsx nuevo en Drive</button>
                <button class="btn ghost" type="button" (click)="excel.driveFiles.set(null)">Cancelar</button>
              </div>
              <p class="muted small">Al elegir un archivo, sus datos reemplazan los de esta pantalla.</p>
            </div>
          }
        </section>

        <!-- Esta computadora -->
        <section class="op" [class.on]="excel.source() === 'file'">
          <h4>💻 En esta computadora</h4>
          @if (excel.canLink) {
            <p class="muted small">Un archivo en tu PC (Chrome o Edge). Si lo abres en Excel, ciérralo antes de guardar.</p>
            <div class="row">
              <button class="btn" type="button" (click)="excel.openFile()">Abrir mi Excel</button>
              <button class="btn" type="button" (click)="excel.createFile()">Crear Excel nuevo</button>
            </div>
          } @else {
            <p class="muted small">Este navegador no puede escribir directo en un archivo (celulares, Firefox o Brave). Usa Google Drive o carga y descarga una copia.</p>
            <label class="btn">Cargar Excel
              <input type="file" accept=".xlsx" hidden (change)="pick($event)">
            </label>
          }
        </section>
      </div>

      <div class="row">
        <button class="btn ghost" type="button" (click)="excel.download()">Descargar una copia del Excel</button>
      </div>
    </div>
  `,
  styles: `
    .xp { display: grid; gap: 14px; }
    .xp p { margin: 4px 0 0; max-width: 70ch; }
    .ok-line { color: var(--ok); font-weight: 600; }
    .warn-line { color: var(--warn); font-weight: 600; }
    .opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .op { border: 1.5px solid var(--line); border-radius: 12px; padding: 14px; display: grid; gap: 10px; align-content: start; }
    .op.on { border-color: var(--ok); box-shadow: 0 0 0 3px var(--ok-soft); }
    h4 { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 17px; }
    .gd { color: #1fa463; }
    .tag { margin-left: auto; font-size: 11px; font-weight: 700; background: var(--soft); color: var(--fire-dark); border-radius: 999px; padding: 2px 8px; }
    .pick { display: grid; gap: 8px; border-top: 1px solid var(--line); padding-top: 10px; }
    .fi { display: flex; gap: 10px; align-items: center; text-align: left; border: 1.5px solid var(--line); border-radius: 10px; padding: 10px; background: var(--panel); cursor: pointer; font: inherit; color: var(--ink); }
    .fi:hover { border-color: var(--fire); background: var(--soft); }
    .xi { width: 30px; height: 30px; border-radius: 6px; background: #1d6f42; color: #fff; display: grid; place-items: center; font-weight: 800; flex: none; }
    .fn { display: grid; min-width: 0; }
    .fn b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class ExcelPanel {
  protected excel = inject(ExcelService);
  protected store = inject(Store);
  protected fmtDate = fmtDate;
  protected cid = '';

  saveCid() {
    setClientId(this.cid);
    this.excel.hasClientId.set(true);
  }

  pick(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.excel.importFile(f);
    (e.target as HTMLInputElement).value = '';
  }
}
