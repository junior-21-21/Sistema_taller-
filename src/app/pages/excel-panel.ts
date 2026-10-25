import { Component, inject } from '@angular/core';
import { ExcelService } from '../core/excel.service';
import { SheetService } from '../core/sheet.service';

/** Estado de la hoja de Google donde se guarda todo, y descarga en Excel. */
@Component({
  selector: 'app-excel-panel',
  template: `
    <div class="xp">
      <h3>Tus datos</h3>
      @switch (sheet.status()) {
        @case ('none') {
          <p class="warn-line">Todavía no está puesta la dirección de la hoja de Google del taller.</p>
        }
        @case ('loading') { <p class="muted">Leyendo la hoja de Google…</p> }
        @case ('offline') {
          <p class="warn-line">Sin conexión con la hoja de Google. Puedes seguir trabajando: lo nuevo se guarda solo cuando vuelva el internet.</p>
          <div class="row"><button class="btn" type="button" (click)="sheet.flush(); sheet.load(false)">Reintentar ahora</button></div>
        }
        @default {
          <p class="ok-line">✓ Todo se guarda solo en la hoja de Google del taller. Cualquiera que abra este enlace ve los mismos datos.</p>
        }
      }
      <div class="row">
        @if (sheet.sheetUrl()) {
          <a class="btn" [href]="sheet.sheetUrl()" target="_blank" rel="noopener">Abrir la hoja de Google</a>
        }
        <button class="btn ghost" type="button" (click)="excel.download()">Descargar copia en Excel</button>
      </div>
    </div>
  `,
  styles: `
    .xp { display: grid; gap: 10px; }
    .xp p { margin: 0; max-width: 70ch; }
    .ok-line { color: var(--ok); font-weight: 600; }
    .warn-line { color: var(--warn); font-weight: 600; }
  `,
})
export class ExcelPanel {
  protected excel = inject(ExcelService);
  protected sheet = inject(SheetService);
}
