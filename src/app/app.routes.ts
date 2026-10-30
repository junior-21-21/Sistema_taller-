import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home').then((m) => m.HomePage), title: 'Cotizador Run Run' },
  { path: 'cotizaciones', loadComponent: () => import('./pages/quotes').then((m) => m.QuotesPage), title: 'Cotizaciones · Run Run' },
  { path: 'cotizar', loadComponent: () => import('./pages/quote').then((m) => m.QuotePage), title: 'Nueva cotización · Run Run' },
  { path: 'cotizar/:num', loadComponent: () => import('./pages/quote').then((m) => m.QuotePage), title: 'Editar cotización · Run Run' },
  { path: 'hoja/:num/:tipo', loadComponent: () => import('./pages/doc').then((m) => m.DocPage), title: 'Hoja A4 · Run Run' },
  { path: 'ventas', loadComponent: () => import('./pages/sales').then((m) => m.SalesPage), title: 'Ventas · Run Run' },
  { path: 'venta', loadComponent: () => import('./pages/sale').then((m) => m.SalePage), title: 'Nueva venta · Run Run' },
  { path: 'boleta/:num', loadComponent: () => import('./pages/receipt').then((m) => m.ReceiptPage), title: 'Nota de venta · Run Run' },
  { path: 'caja', loadComponent: () => import('./pages/cash').then((m) => m.CashPage), title: 'Ingresos y gastos · Run Run' },
  { path: 'catalogo', loadComponent: () => import('./pages/catalog').then((m) => m.CatalogPage), title: 'Catálogo de puertas · Run Run' },
  { path: 'clientes', loadComponent: () => import('./pages/clients').then((m) => m.ClientsPage), title: 'Clientes · Run Run' },
  { path: 'ajustes', loadComponent: () => import('./pages/settings').then((m) => m.SettingsPage), title: 'Precios y taller · Run Run' },
  { path: 'ayuda', loadComponent: () => import('./pages/help').then((m) => m.HelpPage), title: 'Ayuda · Run Run' },
  { path: '**', redirectTo: '' },
];
