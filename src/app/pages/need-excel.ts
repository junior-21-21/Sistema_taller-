import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SheetService } from '../core/sheet.service';
import { Icon } from './icon';

/** Se muestra en vez de la pantalla mientras no se leyó la hoja de Google. */
@Component({
  selector: 'app-need-excel',
  imports: [RouterLink, Icon],
  template: `
    <div class="page">
      <section class="card steel ne">
        <app-icon name="file" [size]="34" />
        <div>
          @if (sheet.status() === 'loading') {
            <h2>Conectando con la hoja del taller…</h2>
            <p>Un momento.</p>
          } @else if (sheet.status() === 'none') {
            <h2>Falta conectar la hoja del taller</h2>
            <p>El sistema todavía no tiene la dirección de la hoja de Google.</p>
          } @else {
            <h2>Sin conexión con la hoja del taller</h2>
            <p>Revisa tu internet y vuelve a intentar.</p>
          }
        </div>
      </section>
      <div class="row">
        @if (sheet.status() === 'offline') {
          <button class="btn primary" type="button" (click)="sheet.load(false)">Reintentar</button>
        }
        <a class="btn ghost" routerLink="/">Volver al inicio</a>
      </div>
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
  protected sheet = inject(SheetService);
}
