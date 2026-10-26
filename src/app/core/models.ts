export const AREA = 'm²';
export const UNITS = ['m²', 'ml', 'unidad', 'peldaño', 'hora', 'global', 'kg'];

/** Un material del trabajo, con su medida o espesor. */
export interface Mat {
  name: string;
  spec: string;
  qty: string;
}

/** Especificación técnica de un trabajo: materiales, chapa, pintura y lo que incluye. */
export interface Detail {
  mats: Mat[];
  /** '' = no incluye chapa. */
  chapa: string;
  accesorios: string[];
  pintura: string;
  color: string;
  instalacion: boolean;
  transporte: boolean;
  notas: string;
}

/** Un trabajo de la lista de precios. */
export interface CatalogItem {
  code: string;
  cat: string;
  name: string;
  inc: string;
  unit: string;
  material: number;
  labor: number;
  /** Materiales y accesorios que se usan normalmente (se copian al cotizar). */
  detail?: Detail;
}

/** Una línea de la cotización. Guarda una copia del nombre y precio para que
 *  cambiar la lista de precios no altere cotizaciones antiguas. */
export interface QuoteItem {
  code: string;
  name: string;
  inc: string;
  unit: string;
  price: number;
  w: number | null;
  h: number | null;
  q: number;
  detail?: Detail;
}

export type Estado = 'Pendiente' | 'Aceptada' | 'Rechazada';
export const ESTADOS: Estado[] = ['Pendiente', 'Aceptada', 'Rechazada'];

export interface Client {
  name: string;
  doc: string;
  tel: string;
  place: string;
}

export interface Quote {
  num: string;
  seq: number;
  date: string;
  client: Client;
  desc: string;
  items: QuoteItem[];
  discount: number;
  advance: number;
  days: number;
  validity: number;
  warranty: number;
  igv: boolean;
  penalty: number;
  notes: string;
  estado: Estado;
  updatedAt: string;
}

export interface Shop {
  name: string;
  ruc: string;
  tel: string;
  address: string;
  rep: string;
  repDni: string;
  advance: number;
  validity: number;
  warranty: number;
  maxDiscount: number;
  igv: boolean;
  /** Serie de las notas de venta, ej. NV01. */
  serie: string;
  /** Texto al pie de la boleta. */
  footer: string;
  /** Yape / Plin / cuenta para mostrar en la boleta. */
  payInfo: string;
}

export const PAY_METHODS = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta'] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
export type Concept = 'Venta' | 'Adelanto' | 'Saldo';

export interface SaleItem {
  desc: string;
  unit: string;
  qty: number;
  price: number;
}

/** Nota de venta (boleta interna del taller). */
export interface Sale {
  num: string;
  seq: number;
  date: string;
  time: string;
  client: Client;
  items: SaleItem[];
  discount: number;
  pay: PayMethod;
  received: number;
  concept: Concept;
  quoteNum: string;
  notes: string;
  void: boolean;
  updatedAt: string;
}
