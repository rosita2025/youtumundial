// Data types matching Shopify Storefront API structure
// This allows easy migration when connecting to real Shopify

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  width: number;
  height: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  available: boolean;
  sku: string;
  options: {
    name: string;
    value: string;
  }[];
  image?: ProductImage;
}

/** Origen auditable de un producto importado. */
export interface ProductOrigin {
  /** Proveedor o canal de importación: 'shopify', 'sup', 'local'… */
  supplier: string;
  /** Tienda / shop ID desde donde se importó. */
  shopId: string;
  /** ID del producto en el origen. */
  sourceId: string;
  /** Fecha de importación / sincronización (ISO). */
  importedAt: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: ProductImage[];
  variants: ProductVariant[];
  collections: string[];
  /** Nombre legible de cada colección (handle → título de Shopify). */
  collectionTitles?: Record<string, string>;
  /** Tipo de producto de Shopify (ej. "Vestidos"). */
  productType?: string;
  /** Marca / proveedor de Shopify (Vendor). */
  vendor?: string;
  tags: string[];
  available: boolean;
  createdAt: string;
  origin?: ProductOrigin;
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: ProductImage;
  productCount: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  product: Product;
  variant: ProductVariant;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest';

export interface FilterOptions {
  collection?: string;
  vendor?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  search?: string;
}
