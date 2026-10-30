import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DoorCatalog } from './door-catalog';
import { Modelo } from '../core/catalogo';

/** Modelo elegido en el catálogo que la cotización nueva agrega al abrirse. */
export const ADD_MODEL = 'rr.addModel';

@Component({
  selector: 'app-catalog',
  imports: [DoorCatalog],
  template: `
    <section class="card">
      <h2>Catálogo de puertas</h2>
      <p class="muted small">Puertas modernas de metal. Toca un modelo para verlo grande y cotizarlo.</p>
      <app-door-catalog (pick)="quote($event)" />
    </section>
  `,
  styles: `h2 { margin-bottom: 4px; } p { margin: 0 0 14px; }`,
})
export class CatalogPage {
  private router = inject(Router);

  quote(m: Modelo) {
    try {
      localStorage.setItem(ADD_MODEL, m.code);
    } catch {
      /* sin almacenamiento: se abre la cotización igual */
    }
    this.router.navigateByUrl('/cotizar');
  }
}
