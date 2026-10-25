import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from './icon';
import { GuideService } from './guide';
import { Toast } from '../core/store.service';

@Component({
  selector: 'app-help',
  imports: [RouterLink, Icon],
  template: `
    <div class="page">
      <div class="ph">
        <div>
          <h1>¿Cómo se usa?</h1>
          <p class="muted">El camino normal de un trabajo, de la primera consulta al cobro. Toca cada paso para ir a esa pantalla.</p>
        </div>
      </div>

      <div class="row">
        <button type="button" class="btn primary" (click)="guide.tourOpen.set(true)"><app-icon name="helmet" /> Ver la bienvenida otra vez</button>
        <button type="button" class="btn" (click)="restore()">Volver a mostrar las explicaciones</button>
      </div>

      <ol class="flow">
        <li>
          <a routerLink="/ajustes" fragment="excel">
            <span class="n">1</span><app-icon name="gear" [size]="26" />
            <b>Una sola vez: conecta tu Excel</b>
            <span>En <i>Precios y taller</i> toca <i>Abrir mi Excel</i> y elige <b>runrun-datos.xlsx</b> de la carpeta tallersistema. Llena tu RUC, tu celular y quién firma.</span>
          </a>
        </li>
        <li>
          <a routerLink="/cotizar">
            <span class="n">2</span><app-icon name="quote" [size]="26" />
            <b>El cliente pide precio: haz la cotización</b>
            <span>Toca el botón naranja <b>+</b>. Pega su mensaje de WhatsApp, elige los trabajos, pon las medidas y toca <i>Siguiente</i> hasta terminar.</span>
          </a>
        </li>
        <li>
          <a routerLink="/cotizaciones">
            <span class="n">3</span><app-icon name="wa" [size]="26" />
            <b>Envíala</b>
            <span>Con <i>WhatsApp</i> le llega el resumen. Con <i>Hoja / PDF</i> sacas la hoja con tu logo para imprimir o mandar.</span>
          </a>
        </li>
        <li>
          <a routerLink="/cotizaciones">
            <span class="n">4</span><app-icon name="cash" [size]="26" />
            <b>Acepta: cobra el adelanto</b>
            <span>En <i>Cotizaciones</i> toca <i>Cobrar</i>. Se arma la nota de venta del adelanto y la cotización pasa a <i>Aceptada</i>. Si hace falta, imprime el <i>Contrato</i>.</span>
          </a>
        </li>
        <li>
          <a routerLink="/cotizaciones" [queryParams]="{ estado: 'Aceptada' }">
            <span class="n">5</span><app-icon name="receipt" [size]="26" />
            <b>Entregas: cobra el saldo</b>
            <span>Toca <i>Cobrar</i> otra vez y sale el saldo que falta. En <i>Inicio</i> ves cuánto te deben todavía.</span>
          </a>
        </li>
      </ol>

      <section class="card">
        <h2>Preguntas frecuentes</h2>
        <details><summary>¿Dónde se guarda todo?</summary>
          <p>En el archivo <b>runrun-datos.xlsx</b>. Tiene hojas para Cotizaciones, Detalle, Ventas, Ventas detalle, Precios y Taller. La app también guarda una copia en el navegador por si cierras la pestaña.</p></details>
        <details><summary>¿Puedo abrir el Excel mientras uso la app?</summary>
          <p>Sí para mirar, pero <b>ciérralo antes de guardar</b> en la app. Si está abierto, Windows no deja escribir y la app te avisa.</p></details>
        <details><summary>¿Cómo cambio mis precios?</summary>
          <p>En <a routerLink="/ajustes">Precios y taller</a> cambia el material y la mano de obra, y toca <i>Guardar cambios</i>. También puedes cambiarlos en la hoja <i>Precios</i> del Excel y luego tocar <i>Abrir mi Excel</i>.</p></details>
        <details><summary>¿La nota de venta sirve como boleta para SUNAT?</summary>
          <p>No. Es un comprobante de control interno con tu logo, número, QR y monto en letras. Si el cliente pide boleta o factura electrónica, emítela en SUNAT (SOL) o en tu sistema de facturación y anota el número en la nota.</p></details>
        <details><summary>Me equivoqué en una venta</summary>
          <p>Abre la nota de venta y toca <i>Anular</i> (dos veces para confirmar). Queda marcada como anulada en el Excel y no suma en tus totales. Luego emite una nueva.</p></details>
        <details><summary>¿Funciona en el celular?</summary>
          <p>Sí. En el celular usa el menú de abajo. Ahí no se puede escribir directo en el Excel: usa <i>Descargar copia</i> y <i>Cargar Excel</i> en Precios y taller.</p></details>
        <details><summary>¿Cómo imprimo el ticket?</summary>
          <p>En la nota de venta elige <i>Ticket 80 mm</i> y toca <i>Imprimir o PDF</i>. Funciona con impresoras térmicas de 80 mm. Para impresora normal elige <i>Hoja A4</i>.</p></details>
      </section>
    </div>
  `,
  styles: `
    .flow { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; counter-reset: s; }
    .flow a { position: relative; display: grid; grid-template-columns: auto auto 1fr; grid-template-rows: auto auto; gap: 2px 14px; align-items: center;
      text-decoration: none; color: var(--ink); background: var(--panel); border: 1.5px solid var(--line); border-radius: var(--r); padding: 16px 18px; }
    .flow a:hover { border-color: var(--fire); }
    .flow .n { grid-row: 1 / 3; width: 36px; height: 36px; border-radius: 50%; background: var(--fire); color: #fff; display: grid; place-items: center; font: 800 18px var(--f-display); }
    .flow app-icon { grid-row: 1 / 3; color: var(--fire); }
    .flow b { font-size: 18px; }
    .flow span:last-child { grid-column: 3; color: var(--muted); }
    @media (max-width: 560px) { .flow app-icon { display: none; } .flow a { grid-template-columns: auto 1fr; } .flow span:last-child { grid-column: 2; } }
    details { border-top: 1px solid var(--line); padding: 12px 0; }
    summary { cursor: pointer; font-weight: 700; font-size: 17px; }
    details p { margin: 8px 0 0; color: var(--muted); max-width: 70ch; }
  `,
})
export class HelpPage {
  protected guide = inject(GuideService);
  private toast = inject(Toast);
  restore() {
    this.guide.showAll();
    this.toast.show('Listo: las explicaciones vuelven a aparecer en cada pantalla.');
  }
}
