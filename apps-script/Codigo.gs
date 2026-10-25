/**
 * Run Run – conexión entre el sistema (GitHub Pages) y esta hoja de Google.
 * Pégalo en Extensiones > Apps Script, guarda y publícalo como
 * Implementar > Nueva implementación > Aplicación web
 *   Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier usuario
 * Copia la URL que termina en /exec y pásala para ponerla en el sistema.
 */

var HEADERS = {
  'Cotizaciones': ['Número', 'Fecha', 'Cliente', 'DNI / RUC', 'Teléfono', 'Lugar de la obra', 'Trabajo', 'Subtotal', 'Descuento %', 'IGV', 'Total', 'Adelanto %', 'Plazo (días)', 'Estado', 'Notas', 'Datos (no editar)'],
  'Detalle': ['Número', 'Cliente', 'Código', 'Trabajo', 'Unidad', 'Ancho (m)', 'Alto (m)', 'Piezas / cantidad', 'Cantidad total', 'Precio unitario', 'Importe', 'Estado'],
  'Ventas': ['Número', 'Fecha', 'Hora', 'Cliente', 'DNI / RUC', 'Concepto', 'Cotización', 'Forma de pago', 'Descuento', 'Total', 'Anulada', 'Datos (no editar)'],
  'Ventas detalle': ['Número', 'Fecha', 'Descripción', 'Unidad', 'Cantidad', 'Precio unitario', 'Importe'],
  'Precios': ['Código', 'Categoría', 'Trabajo', 'Qué incluye', 'Unidad', 'Material', 'Mano de obra', 'Precio total'],
  'Taller': ['Dato', 'Valor']
};

function doGet() {
  return json(load());
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var body = JSON.parse(e.postData.contents);
    (body.ops || []).forEach(apply);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/** Crea la hoja con sus títulos si no existe. */
function sheet(name) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#e8650f');
    sh.setFrozenRows(1);
  }
  return sh;
}

function load() {
  var out = {};
  Object.keys(HEADERS).forEach(function (name) {
    var values = sheet(name).getDataRange().getValues();
    out[name] = values.map(function (row) {
      return row.map(function (v) {
        return v instanceof Date ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v;
      });
    });
  });
  return { ok: true, sheets: out, url: SpreadsheetApp.getActive().getUrl() };
}

/** Fila cuyo número (columna A) es key, o -1. */
function findRow(sh, key) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var keys = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (var i = 0; i < keys.length; i++) if (String(keys[i][0]) === String(key)) return i + 2;
  return -1;
}

function removeRows(sh, key) {
  for (var r = sh.getLastRow(); r >= 2; r--) {
    if (String(sh.getRange(r, 1).getDisplayValue()) === String(key)) sh.deleteRow(r);
  }
}

function apply(op) {
  if (op.type === 'upsert') {
    var sh = sheet(op.sheet);
    var r = findRow(sh, op.key);
    var row = [op.row];
    if (r > 0) sh.getRange(r, 1, 1, op.row.length).setValues(row);
    else sh.getRange(sh.getLastRow() + 1, 1, 1, op.row.length).setValues(row);
    if (op.detailSheet) {
      var d = sheet(op.detailSheet);
      removeRows(d, op.key);
      if (op.detail && op.detail.length) d.getRange(d.getLastRow() + 1, 1, op.detail.length, op.detail[0].length).setValues(op.detail);
    }
  } else if (op.type === 'remove') {
    removeRows(sheet(op.sheet), op.key);
    if (op.detailSheet) removeRows(sheet(op.detailSheet), op.key);
  } else if (op.type === 'replace') {
    var s = sheet(op.sheet);
    if (s.getLastRow() > 1) s.getRange(2, 1, s.getLastRow() - 1, s.getLastColumn()).clearContent();
    if (op.rows.length) {
      var range = s.getRange(2, 1, op.rows.length, op.rows[0].length);
      if (op.asText) range.setNumberFormat('@');
      range.setValues(op.rows);
    }
  }
}
