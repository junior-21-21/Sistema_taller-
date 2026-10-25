# Cotizador Run Run – Estructuras Metálicas

App web para hacer **cotizaciones** y **contratos** del taller Run Run (Huamanga, Ayacucho).
Todo se guarda en un archivo **Excel** en tu computadora.

## Qué hace

1. **Cliente:** pegas el mensaje de WhatsApp y saca el nombre, el DNI o RUC, el celular y el lugar.
2. **Trabajos:** tocas los trabajos de la lista (portones, rejas, techos…), pones ancho × alto × piezas y calcula solo.
3. **Pago:** eliges el descuento, el adelanto, el plazo, la garantía y el IGV.
4. **Enviar:** WhatsApp con el resumen, hoja A4 con tu logo (imprimir o guardar en PDF) y contrato listo para firmar.

Además tiene estas secciones:

- **Inicio:** lo cotizado, lo aceptado, lo cobrado y lo que falta cobrar en el mes, con botones grandes para lo más usado.
- **Cotizaciones:** el buscador por nombre, DNI, celular, número o trabajo, con filtro por fechas y estado. Desde ahí editas, duplicas, cobras, mandas por WhatsApp o sacas el contrato.
- **Ventas:** notas de venta con número correlativo (NV01-00000001), en ticket de 80 mm o en hoja A4, con QR, el monto en letras y el vuelto. Puedes cobrar el adelanto y el saldo de una cotización o hacer una venta directa. Si te equivocas, la anulas.
- **Clientes:** se arman solos y muestran lo que cotizaste y vendiste a cada uno.
- **Ayuda:** el paso a paso dentro de la app.
- **En el celular:** tiene un menú abajo con un botón **+** para cotizar rápido.

> La nota de venta es un comprobante interno del taller. Si el cliente pide boleta o factura electrónica, emítela en SUNAT.

## El archivo Excel

En **Precios y taller → Abrir mi Excel** eliges `runrun-datos.xlsx` (o *Crear Excel nuevo*). Desde ahí cada cambio se guarda solo. Tiene estas hojas:

| Hoja | Qué tiene |
|---|---|
| Cotizaciones | Una fila por cotización. Puedes cambiar el **Estado** desde Excel. |
| Detalle | Una fila por trabajo cotizado, para filtrar y sumar. |
| Ventas | Una fila por nota de venta: número, cliente, concepto, forma de pago, total y si está anulada. |
| Ventas detalle | Cada línea cobrada. |
| Precios | Tu lista de precios. Cambia Material y Mano de obra, y luego usa **Abrir mi Excel** en la app. |
| Taller | Nombre, RUC, celular, quién firma y los valores por defecto. |

- El guardado directo en el archivo funciona en **Chrome o Edge en computadora**. En el celular o en Firefox usa **Descargar copia** y **Cargar Excel**.
- **Cierra el archivo en Excel** antes de guardar desde la app; si está abierto, Windows no deja escribirlo.
- La app también guarda una copia en el navegador, así que no pierdes nada si cierras la pestaña.
- No cambies la columna oculta "Datos (no editar)" de las hojas Cotizaciones y Ventas.

## Usarlo en tu computadora

Necesitas [Node.js 22](https://nodejs.org) instalado.

```bash
npm install
npm start
```

Abre http://localhost:4200 en Chrome o Edge.

## Publicarlo en GitHub Pages

1. Mueve el archivo `deploy-github-pages.yml` a la carpeta `.github/workflows/` (créala si no existe). Si descargaste el .zip, ya viene en su lugar.
1. Crea un repositorio en GitHub (por ejemplo `runrun-cotizador`) y sube esta carpeta a la rama `main`.
1. En el repositorio entra a **Settings → Pages** y en **Source** elige **GitHub Actions**.
1. Cada vez que subas cambios se publica solo en `https://TU-USUARIO.github.io/runrun-cotizador/`.

Los datos **no** se suben a GitHub: cada persona guarda su propio Excel en su computadora.

## Dónde está cada cosa

- `src/app/core/default-data.ts`: precios de ejemplo y datos iniciales del taller.
- `src/app/core/excel.service.ts`: lee y escribe el Excel.
- `src/app/core/calc.ts`: cálculos, montos en letras, lectura del mensaje y el texto de WhatsApp.
- `src/app/pages/`: las pantallas (inicio, cotizaciones, cotizar, hoja y contrato, ventas, boleta, clientes, ayuda, precios y taller).
