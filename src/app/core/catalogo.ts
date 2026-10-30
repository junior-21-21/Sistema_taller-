/** Catálogo de puertas modernas de metal de Run Run (fotos en public/catalogo).
 *  Precios sin IGV. Precio 0 = varía según modelo y medida. */
export interface Modelo {
  code: string;
  title: string;
  price: number;
  notes: string;
  size: string;
  img: string;
}

type Row = [code: string, title: string, price: number, notes: string, size: string];
const ROWS: Row[] = [
  ['PM 01', "Puerta machihembrado liso", 2585, "Imitación madera brillante", '2.40 x 1 m'],
  ['PM 02', "Puerta machihembrado liso", 2585, "Imitación madera mate", '2.40 x 1 m'],
  ['PM 03', "Puerta machihembrado liso gloss", 2585, "Negro mate gloss", '2.40 x 1 m'],
  ['PM 04', "Puerta machihembrado liso gloss", 2585, "Gris automotriz brillante", '2.40 x 1 m'],
  ['PM 05', "Puerta con diseño moderno", 2640, "", '2.40 x 1 m'],
  ['PM 06', "Puerta con diseño moderno", 2640, "", '2.40 x 1 m'],
  ['PM 07', "Puerta vidrio lateral", 2695, "Vidrio reflejante 6 mm crudo · Imitación madera brillante", '2.40 x 1 m'],
  ['PM 08', "Puerta vidrio lateral", 2695, "Vidrio reflejante 6 mm crudo · Imitación madera mate", '2.40 x 1 m'],
  ['PM 09', "Puerta de estilo repujado", 2695, "Lámina importada metálica a prensa caliente", '2.40 x 1 m'],
  ['PM 10', "Puerta de estilo repujado", 2695, "Lámina importada metálica a prensa caliente", '2.40 x 1 m'],
  ['PM 11', "Puerta de estilo repujado", 2695, "Lámina importada metálica a prensa caliente", '2.40 x 1 m'],
  ['PM 12', "Puerta de platinas de acero", 2805, "Platinas empotradas", '2.40 x 1 m'],
  ['PM 13', "Puerta de platinas de acero", 2805, "Platinas sobrepuestas", '2.40 x 1 m'],
  ['PM 14', "Puerta con detalles de vidrios", 2805, "Imitación madera brillante", '2.40 x 1 m'],
  ['PM 15', "Puerta con detalles de vidrios", 2805, "Acabado negro gloss", '2.40 x 1 m'],
  ['PM 16', "Puerta con vidrio o acero", 2805, "7 vidrios reflejantes 6 mm", '2.40 x 1 m'],
  ['PM 17', "Puerta con vidrio o acero", 2915, "7 bandejas de acero 5 cm", '2.40 x 1 m'],
  ['PM 18', "Puerta con acabado gloss", 2805, "Platinas sobrepuestas · Acabado color aluminio", '2.40 x 1 m'],
  ['PM 19', "Puerta con material importado", 2915, "Plancha de acero galvanizado 0.45 mm · Panel de 40 mm · Aislamiento con espuma de poliuretano · Diseño acanalado · Paneles tipo sándwich", '2.40 x 1 m'],
  ['PM 20', "Puerta moderna", 2915, "Estructura con tubo de 6x2", '2.40 x 1 m'],
  ['PM 21', "Puerta moderna", 3025, "Detalle central de acero con vidrio", '2.40 x 1 m'],
  ['PM 22', "Puerta moderna", 2915, "4 detalles de vidrio reflejante 6 mm · Diseño a gusto del cliente", '2.40 x 1 m'],
  ['PM 23', "Puerta moderna", 2915, "", '2.40 x 1 m'],
  ['PM 24', "Puerta con diseño moderno", 2915, "", '2.40 x 1 m'],
  ['PM 25', "Puerta con vidrios y estructura", 2915, "Vidrio reflejante 6 mm", '2.40 x 1 m'],
  ['PM 26', "Puerta con vidrios y estructura", 2915, "Vidrio pavonado 6 mm", '2.40 x 1 m'],
  ['PM 27', "Puerta de vidrio y acero", 2915, "", '2.40 x 1 m'],
  ['PM 28', "Puerta moderna", 3025, "", '2.40 x 1 m'],
  ['PM 29', "Puerta de vidrio y acero", 3135, "Cuadros y platinas de acero con vidrio pavonado", '2.40 x 1 m'],
  ['PM 30', "Puerta de vidrio y acero", 3135, "Triangulares de acero con vidrio reflejante", '2.40 x 1 m'],
  ['PM 31', "Puerta estilo en negro", 2915, "5 platinas de acero de 5 mm sin marco de hoja", '2.40 x 1 m'],
  ['PM 32', "Puerta estilo en negro", 2915, "Platinas y bandeja lateral de acero", '2.40 x 1 m'],
  ['PM 33', "Puerta con estilo en negro", 3025, "Vidrio lateral y 3 platinas de acero", '2.40 x 1 m'],
  ['PM 34', "Puerta con estilo en negro", 3025, "Todos los detalles de cuadro en acero inoxidable", '2.40 x 1 m'],
  ['PM 35', "Puerta estilo en blanco", 2805, "", '2.40 x 1 m'],
  ['PM 36', "Puerta estilo en blanco", 2805, "", '2.40 x 1 m'],
  ['PM 37', "Puerta con estilo en blanco", 2650, "Con 1 vidrio lateral", '2.40 x 1 m'],
  ['PM 38', "Puerta con estilo en blanco", 2805, "Con 6 vidrios pavonados", '2.40 x 1 m'],
  ['PM 39', "Puerta con estilo en blanco", 2915, "Con 1 vidrio lateral y 4 platinas de acero inox", '2.40 x 1 m'],
  ['PM 40', "Puerta 2 colores modernos", 2915, "Combina los colores a tu preferencia", '2.40 x 1 m'],
  ['PM 41', "Puerta 2 colores modernos", 3025, "Combina los colores a tu preferencia", '2.40 x 1 m'],
  ['PM 42', "Puerta 2 colores modernos", 2915, "Combina los colores a tu preferencia", '2.40 x 1 m'],
  ['PM 43', "Puerta 2 colores modernos", 2915, "Combina los colores a tu preferencia", '2.40 x 1 m'],
  ['PM 44', "Puerta entrecruzado moderno", 2915, "", '2.40 x 1 m'],
  ['PM 45', "Puerta con diseño con acero inox y vidrio", 3025, "Detalle diagonal de acero inoxidable calidad 304 y vidrios", '2.40 x 1 m'],
  ['PM 46', "Puerta con diseño con acero inox", 3135, "Detalle central de acero inoxidable calidad 304", '2.40 x 1 m'],
  ['PM 47', "Puerta con diseño con acero inox", 3135, "Detalle lateral de acero inoxidable calidad 304", '2.40 x 1 m'],
  ['PM 48', "Puerta con diseño 16 bandejas", 3135, "", '2.40 x 1 m'],
  ['PM 49', "Puerta con diseño media luna", 3190, "", '2.40 x 1 m'],
  ['PM 50', "Puerta con diseño con acero inox", 3190, "Detalle 3 líneas de acero inoxidable y bandeja en parte baja, calidad 304", '2.40 x 1 m'],
  ['PM 51', "Puerta con diseño moderno", 3190, "", '2.40 x 1 m'],
  ['PM 52', "Puerta con diseño en relieve", 3190, "", '2.40 x 1 m'],
  ['PM 53', "Puerta con diseño moderno", 3190, "No incluye chapa digital", '2.40 x 1 m'],
  ['PM 54', "Puerta con diseño con luz LED", 3300, "", '2.40 x 1 m'],
  ['PM 55', "Puerta con diseño moderno", 3300, "", '2.40 x 1 m'],
  ['PM 56', "Puerta con diseño en relieve", 3410, "", '2.40 x 1 m'],
  ['PM 57', "Puerta medio punto", 3025, "", '2.40 x 1 m'],
  ['PM 58', "Puerta medio punto", 3135, "", '2.40 x 1 m'],
  ['PM 59', "Puerta con medio punto", 3245, "", '2.40 x 1 m'],
  ['PM 60', "Puerta con medio punto", 3465, "", '2.40 x 1 m'],
  ['PM 61', "Puerta sin contraplacar", 2475, "Vista interior · No refleja el diseño en la vista interna, 1 sola cara", '2.40 x 1 m'],
  ['PM 62', "Puerta sin contraplacar", 2475, "Vista posterior · No refleja el diseño en la vista interna, 1 sola cara", '2.40 x 1 m'],
  ['PM 63', "Puerta sin contraplacar", 2090, "Vista interior en base · No refleja el diseño en la vista interna, 1 sola cara", '2.40 x 1 m'],
  ['PM 64', "Puerta sin contraplacar", 2090, "Terminada · No refleja el diseño en la vista interna, 1 sola cara", '2.40 x 1 m'],
  ['PM 65', "Puerta pivotante", 3685, "", '2.60 x 1.20 m'],
  ['PM 66', "Puerta pivotante", 3685, "", '2.60 x 1.20 m'],
  ['PM 67', "Puerta con fijas", 0, "El precio varía según modelo y medida", '1.20 a 1.50 m o más'],
  ['PM 68', "Puerta con fijas", 0, "El precio varía según modelo y medida", '1.20 a 1.50 m o más'],
  ['PM 69', "Puerta con reja con vidrios", 2805, "Vidrio pavonado templado 8 mm · Cuadros de acero inoxidable", '2.40 x 1 m'],
  ['PM 70', "Puerta con reja y vidrios", 2585, "Vidrio pavonado templado 8 mm · Tubos redondos de acero inoxidable", '2.40 x 1 m'],
  ['PM 71', "Puerta con diseño de 2 piezas", 3245, "Estructura 2 piezas · Acabado gloss · Cuadros con vidrio · Doble seguridad", '2.40 x 1 m'],
  ['PM 72', "Puerta con diseño de 2 piezas", 3245, "Estructura 2 piezas · Acabado gloss · Cuadros con vidrio · Doble seguridad", '2.40 x 1 m'],
  ['PM 73', "Puerta con reja estructural", 3850, "Tubos cruzados de acero inoxidable", '2.40 x 1 m'],
];

export const MODELOS: Modelo[] = ROWS.map(([code, title, price, notes, size]) => ({
  code, title, price, notes, size, img: `catalogo/${code.replace(' ', '').toLowerCase()}.webp`,
}));

/** Grupos para filtrar el catálogo. */
export const GRUPOS: { name: string; test: (m: Modelo) => boolean }[] = [
  { name: 'Imitación madera', test: (m) => /madera|machihembrado/i.test(m.title + m.notes) },
  { name: 'Con vidrio', test: (m) => /vidrio/i.test(m.title + m.notes) },
  { name: 'Acero inox', test: (m) => /acero|platina|bandeja|inox/i.test(m.title + m.notes) },
  { name: 'Negro', test: (m) => /negro/i.test(m.title + m.notes) },
  { name: 'Blanco', test: (m) => /blanco/i.test(m.title) },
  { name: '2 colores', test: (m) => /2 colores/i.test(m.title) },
  { name: 'Medio punto', test: (m) => /medio punto/i.test(m.title) },
  { name: 'Con reja', test: (m) => /reja/i.test(m.title) },
  { name: 'Grandes', test: (m) => /pivotante|fijas/i.test(m.title) },
  { name: 'Económicas', test: (m) => m.price > 0 && m.price < 2600 },
];

/** Línea de cotización para un modelo del catálogo. */
export function modeloItem(m: Modelo) {
  const inc = [m.notes, `Medida aprox. ${m.size}`, /sin contraplacar/i.test(m.title) ? '' : 'Contraplacado'].filter(Boolean).join(' · ');
  return { code: m.code, name: `${m.title} (${m.code})`, inc, unit: 'unidad', price: m.price, w: null, h: null, q: 1, img: m.img };
}
