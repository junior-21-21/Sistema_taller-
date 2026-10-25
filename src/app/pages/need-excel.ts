import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExcelService } from '../core/excel.service';
import { ExcelPanel } from './excel-panel';
import { Icon } from './icon';

/** Se muestra en vez de la pantalla cuando el Excel no está conectado: todo se guarda en el Excel. */
@Component({
  selector: 'app-need-excel',
  imports: [RouterLink, ExcelPanel, Icon],
  template: `
    <div class="page">
      <section class="card steel ne">
        <app-icon name="file" [size]="34" />
        <div>
          <h2>{{ excel.status() === 'needs-permission' ? 'Vuelve a conectar tu Excel' : 'Primero conecta tu Excel' }}</h2>
          <p>Todo lo que hagas se guarda en tu Excel. Conéctalo para seguir: es un solo toque.</p>
        </div>
      </section>
      <section class="card"><app-excel-panel /></section>
      <a class="btn ghost" routerLink="/">Volver al inicio</a>
    </div>
  `,
  styles: `
    .ne { display: flex; gap: 16px; align-items: center; color: #fff; }
    .ne h2 { color: #fff; margin: 0; }
    .ne p { margin: 4px 0 0; color: #cfd6dc; }
    .ne app-icon { color: var(--amber); flex: none; }
  `,
})
export class NeedExcel {
  protected excel = inject(ExcelService);
}
