import { CatalogItem, Shop } from './models';

type Row = [string, string, string, string, string, number, number];

// Precios de referencia para Huamanga. Se reemplazan desde la hoja "Precios" del Excel.
const ROWS: Row[] = [
  ['PP-01', 'Puertas y portones', 'Puerta metálica de plancha', 'Marco de tubo, plancha LAF 1/32", chapa y bisagras', 'm²', 190, 110],
  ['PP-02', 'Puertas y portones', 'Puerta de seguridad con diseño', 'Tubo cuadrado, plancha y diseño decorativo, cerrojo', 'm²', 230, 130],
  ['PP-03', 'Puertas y portones', 'Portón de cochera batiente', 'Estructura de tubo 2"x2", forro de plancha, bisagras pesadas', 'm²', 240, 140],
  ['PP-04', 'Puertas y portones', 'Portón corredizo con riel', 'Estructura, forro, riel y garruchas', 'm²', 280, 160],
  ['PP-05', 'Puertas y portones', 'Portón levadizo', 'Estructura reforzada, contrapesos o resortes', 'm²', 330, 190],
  ['RV-01', 'Rejas y ventanas', 'Reja de ventana (fierro liso o cuadrado)', 'Barras de 1/2", marco de platina, anclajes', 'm²', 85, 55],
  ['RV-02', 'Rejas y ventanas', 'Reja decorativa con diseño', 'Volutas, puntas y diseño a pedido', 'm²', 120, 80],
  ['RV-03', 'Rejas y ventanas', 'Ventana de fierro con marco para vidrio', 'Perfiles T y L, sin vidrio', 'm²', 120, 80],
  ['RV-04', 'Rejas y ventanas', 'Cerco de malla con postes', 'Malla galvanizada, postes de tubo, alambre', 'ml', 75, 45],
  ['BA-01', 'Barandas', 'Baranda de fierro para escalera o balcón', 'Tubo redondo o cuadrado, pasamanos, anclajes', 'ml', 110, 70],
  ['BA-02', 'Barandas', 'Baranda de acero inoxidable', 'Tubo inox 2", parantes y anclajes', 'ml', 280, 120],
  ['BA-03', 'Barandas', 'Baranda de fierro con vidrio templado', 'Estructura de fierro (vidrio aparte)', 'ml', 160, 90],
  ['ES-01', 'Escaleras', 'Escalera metálica recta', 'Vigas de canal, peldaños de plancha estriada', 'peldaño', 120, 70],
  ['ES-02', 'Escaleras', 'Escalera caracol', 'Tubo central, peldaños y baranda', 'unidad', 2400, 1200],
  ['ES-03', 'Escaleras', 'Escalera de gato (marinera)', 'Tubo y peldaños de fierro liso, anclajes', 'ml', 90, 60],
  ['TC-01', 'Techos y coberturas', 'Techo con estructura metálica y calamina', 'Correas de tubo, calamina galvanizada, fijaciones', 'm²', 70, 40],
  ['TC-02', 'Techos y coberturas', 'Techo con policarbonato', 'Estructura de tubo y policarbonato alveolar 6 mm', 'm²', 110, 50],
  ['TC-03', 'Techos y coberturas', 'Techo con teja andina o termoacústica', 'Estructura de tubo y cobertura termoacústica', 'm²', 125, 55],
  ['TC-04', 'Techos y coberturas', 'Tijeral metálico', 'Tijeral de ángulo o tubo, según la luz', 'unidad', 520, 280],
  ['EM-01', 'Estructuras', 'Estructura para nave o galpón', 'Columnas, vigas y tijerales (sin cobertura)', 'm²', 150, 80],
  ['EM-02', 'Estructuras', 'Mezzanine o entrepiso metálico', 'Vigas, viguetas y plancha estriada', 'm²', 210, 110],
  ['EM-03', 'Estructuras', 'Tanque elevado o soporte de tanque', 'Estructura de ángulo y base', 'unidad', 900, 450],
  ['MO-01', 'Muebles y otros', 'Mesa o banco de trabajo metálico', 'Tubo y plancha o tablero', 'unidad', 350, 200],
  ['MO-02', 'Muebles y otros', 'Estante metálico', 'Ángulo ranurado o tubo, bandejas de plancha', 'unidad', 300, 150],
  ['MO-03', 'Muebles y otros', 'Toldo o carpa metálica para negocio', 'Estructura de tubo, sin lona', 'm²', 80, 50],
  ['SV-01', 'Servicios', 'Pintura anticorrosiva y esmalte', '2 manos de anticorrosivo y esmalte', 'm²', 12, 10],
  ['SV-02', 'Servicios', 'Soldadura o reparación por hora', 'Mano de obra y consumibles básicos', 'hora', 10, 45],
  ['SV-03', 'Servicios', 'Instalación en obra', 'Traslado del equipo y montaje', 'global', 0, 150],
  ['SV-04', 'Servicios', 'Transporte dentro de Huamanga', 'Flete del trabajo terminado', 'global', 0, 80],
  ['SV-05', 'Servicios', 'Visita técnica y toma de medidas', 'Se descuenta si el cliente contrata', 'global', 0, 40],
];

export const DEFAULT_CATALOG: CatalogItem[] = ROWS.map(([code, cat, name, inc, unit, material, labor]) => ({
  code, cat, name, inc, unit, material, labor,
}));

export const DEFAULT_SHOP: Shop = {
  name: 'Run Run – Estructuras Metálicas',
  ruc: '',
  tel: '994 988 519',
  tel2: '930 929 558',
  address: 'Huamanga, Ayacucho',
  rep: '',
  repDni: '',
  advance: 50,
  validity: 15,
  warranty: 6,
  maxDiscount: 15,
  igv: false,
  serie: 'NV01',
  footer: '¡Gracias por su preferencia! Garantía en soldadura según contrato.',
  payInfo: '',
};
