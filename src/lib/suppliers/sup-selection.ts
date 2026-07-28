/**
 * Selección de productos de SUP Dropshipping publicados en la tienda.
 *
 * Estos son los IDs (SPU) de SUP que se muestran en youtumundial.com.
 * La tienda consulta la Open API de SUP en vivo para cada uno, así que las
 * fotos, talles, precios y stock siempre están sincronizados con SUP.
 *
 * Para publicar productos nuevos: entrá a /admin/sup, buscá e importá los
 * productos y usá el botón "Copiar IDs para publicar"; ese listado se pega
 * acá abajo.
 */
export const SUP_PUBLISHED_IDS: string[] = [
  // Cross-border Shockproof Seamless U-neck Aerial Jumpsuit (el único importado a Shopify)
  "1132534",
];


/** Margen de venta sobre el costo de SUP (0.6 = 60%). */
export const SUP_MARGIN = 0.6;
