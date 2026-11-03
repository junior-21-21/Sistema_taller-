import { Component, computed, effect, inject, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppUpdate } from './core/app-update.service';
import { SheetService } from './core/sheet.service';
import { Store, Toast } from './core/store.service';
import { Icon } from './pages/icon';

/** Pantallas con su propia barra de abajo: ahí se esconde el menú del celular. */
const OWN_BAR = /^\/(cotizar|venta|hoja|boleta)\b/;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected sheet = inject(SheetService);
  protected store = inject(Store);
  protected toast = inject(Toast);
  protected update = inject(AppUpdate);
  private router = inject(Router);
  // Al saltar a una sección (#taller, #precios) deja espacio para el encabezado fijo.
  private _scroll = inject(ViewportScroller).setOffset([0, 84]);

  protected url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: '/' },
  );
  protected ownBar = () => OWN_BAR.test(this.url());
  private _update = effect(() => this.update.navigated(this.url()));

  protected readonly nav = [
    { to: '/', label: 'Inicio', short: 'Inicio', icon: 'home', exact: true, hint: 'Resumen del mes' },
    { to: '/cotizaciones', label: 'Cotizaciones', short: 'Cotizaciones', icon: 'quote', exact: false, hint: 'Buscar, editar y enviar' },
    { to: '/ventas', label: 'Ventas', short: 'Ventas', icon: 'receipt', exact: false, hint: 'Notas de venta y cobros' },
    { to: '/catalogo', label: 'Catálogo de puertas', short: 'Catálogo', icon: 'door', exact: false, hint: 'Modelos con foto y precio' },
    { to: '/caja', label: 'Ingresos y gastos', short: 'Caja', icon: 'cash', exact: false, hint: 'Lo que entra y lo que sale' },
    { to: '/clientes', label: 'Clientes', short: 'Clientes', icon: 'users', exact: false, hint: 'Historial de cada uno' },
    { to: '/ajustes', label: 'Precios y taller', short: 'Precios', icon: 'gear', exact: false, hint: 'Tus precios y tus datos' },
  ];

  /** Menú completo del celular. */
  protected menu = signal(false);
  private _closeMenu = effect(() => { this.url(); this.menu.set(false); });
  private _focusMenu = effect(() => { if (this.menu()) setTimeout(() => document.querySelector<HTMLElement>('.mclose')?.focus()); });

  /** En iPhone no hay aviso del navegador: se explica cómo instalarla. */
  protected install() {
    if (this.update.canInstall()) this.update.install();
    else this.toast.show('En Safari toca Compartir y luego "Agregar a pantalla de inicio".', 7000);
    this.menu.set(false);
  }

  protected stateKind = computed(() => {
    const s = this.sheet.status();
    return s === 'ok' || s === 'saving' ? 'ok' : s === 'loading' ? 'wait' : 'warn';
  });
  protected stateText = computed(() => {
    switch (this.sheet.status()) {
      case 'ok': return 'Guardado';
      case 'saving': return 'Guardando…';
      case 'loading': return 'Conectando…';
      case 'offline': return 'Sin internet';
      default: return 'Falta la hoja';
    }
  });
}
