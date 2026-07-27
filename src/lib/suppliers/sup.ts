/**
 * Adaptador SUP Dropshipping.
 *
 * Convierte un producto crudo de SUP (export CSV/JSON o, a futuro, su API)
 * al modelo `Product` de la tienda. Cuando SUP habilite la API, solo hay que
 * llamar a su endpoint y pasar cada item por `mapSupProduct`.
 */

import { Product, ProductVariant } from '../data/types';

/** Margen por defecto aplicado sobre el costo de SUP (60%). */
export const DEFAULT_MARGIN = 0.6;

/** Forma cruda de un producto tal como llega de SUP (export o API). */
export interface SupRawProduct {
  /** ID de SUP (SPU / product id) */
  id: string | number;
  name: string;
  description?: string;
  /** Precio de costo en USD */
  cost_price: number | string;
  /** Precio final ya definido en SUP/Member Center, si existe. */
  retail_price?: number | string;
  images?: string[];
  /** Tallas disponibles */
  sizes?: string[];
  /** Colores disponibles */
  colors?: string[];
  /** Variantes reales de SUP/listing (SKU, product_id, stock, precio). */
  variants?: SupRawVariant[];
  /** Colecciones/categorías destino en la tienda */
  categories?: string[];
  tags?: string[];
  stock?: number;
  source?: 'open-api' | 'member-listed' | 'member-queue' | 'local';
  storeProductId?: string | number;
  storeName?: string;
  sourceUrl?: string;
}

export interface SupRawVariant {
  id?: string | number;
  product_id?: string | number;
  sku?: string;
  title?: string;
  size?: string;
  color?: string;
  price?: number | string;
  retail_price?: number | string;
  image?: string;
  stock?: number;
  shipment_id?: string | number;
  shipping_method?: string;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Precio de venta = costo + margen, redondeado a entero. */
export function retailPrice(cost: number, margin: number = DEFAULT_MARGIN): number {
  return Math.round(cost * (1 + margin));
}

function parseMoney(value: unknown): number {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildVariants(raw: SupRawProduct, price: number): ProductVariant[] {
  if (raw.variants?.length) {
    return raw.variants.map((variant, index) => {
      const variantPrice = parseMoney(variant.retail_price ?? variant.price) || price;
      const title = variant.title || [variant.color, variant.size].filter(Boolean).join(' / ') || `Variante ${index + 1}`;
      const sku = variant.sku || `SUP-${raw.id}-${variant.product_id ?? variant.id ?? index + 1}`;
      return {
        id: `sup-${raw.id}-${variant.product_id ?? variant.id ?? index}`,
        title,
        price: variantPrice,
        available: variant.stock === undefined ? true : variant.stock > 0,
        sku,
        options: title.split('/').map((value, optionIndex) => ({
          name: optionIndex === 0 ? 'Color' : optionIndex === 1 ? 'Size' : `Opción ${optionIndex + 1}`,
          value: value.trim(),
        })),
      };
    });
  }

  const sizes = raw.sizes?.length ? raw.sizes : ['Única'];
  const colors = raw.colors?.length ? raw.colors : ['Estándar'];
  const inStock = raw.stock === undefined ? true : raw.stock > 0;

  return sizes.flatMap((size, sIndex) =>
    colors.map((color, cIndex) => ({
      id: `sup-${raw.id}-${sIndex}-${cIndex}`,
      title: `${size} / ${color}`,
      price,
      available: inStock,
      sku: `SUP-${raw.id}-${slugify(size)}-${slugify(color)}`.toUpperCase(),
      options: [
        { name: 'Size', value: size },
        { name: 'Color', value: color },
      ],
    }))
  );
}

/** Mapea un producto de SUP al catálogo de la tienda. */
export function mapSupProduct(raw: SupRawProduct, margin: number = DEFAULT_MARGIN): Product {
  const cost = parseMoney(raw.cost_price);
  const fixedRetail = parseMoney(raw.retail_price);
  const price = fixedRetail || retailPrice(cost, margin);
  const images = (raw.images ?? []).map((url, i) => ({
    id: `sup-img-${raw.id}-${i}`,
    url,
    altText: `${raw.name} - Imagen ${i + 1}`,
    width: 800,
    height: 1000,
  }));

  return {
    id: `sup-${raw.id}`,
    slug: slugify(raw.name),
    title: raw.name,
    description: raw.description ?? '',
    price,
    images,
    variants: buildVariants(raw, price),
    collections: raw.categories ?? [],
    tags: raw.tags ?? [],
    available: raw.stock === undefined ? true : raw.stock > 0,
    createdAt: new Date().toISOString(),
  };
}

/** Mapea un lote completo (export CSV convertido a JSON o respuesta de API). */
export function mapSupCatalog(raws: SupRawProduct[], margin: number = DEFAULT_MARGIN): Product[] {
  return raws.map(raw => mapSupProduct(raw, margin));
}
