import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
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
  private router = inject(Router);

  protected url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: '/' },
  );
  protected ownBar = () => OWN_BAR.test(this.url());

  protected readonly nav = [
    { to: '/', label: 'Inicio', icon: 'home', exact: true },
    { to: '/cotizaciones', label: 'Cotizaciones', icon: 'quote', exact: false },
    { to: '/ventas', label: 'Ventas', icon: 'receipt', exact: false },
    { to: '/catalogo', label: 'Catálogo', icon: 'door', exact: false },
    { to: '/caja', label: 'Ingresos y gastos', icon: 'cash', exact: false },
    { to: '/clientes', label: 'Clientes', icon: 'users', exact: false },
    { to: '/ajustes', label: 'Precios y taller', icon: 'gear', exact: false },
  ];
}
