/**
 * Obtiene el precio a mostrar según la moneda seleccionada, con fallback.
 * 
 * Lógica:
 * - Si currencyMode === "GTQ": intenta con price (GTQ), si es 0/null/undefined
 *   fallback a priceUSD. Si ambos son 0, retorna null.
 * - Si currencyMode === "USD": intenta con priceUSD, si es 0/null/undefined
 *   fallback a price (GTQ). Si ambos son 0, retorna null.
 * 
 * @param {Object} market - Objeto market de la propiedad (market?.price, market?.priceUSD)
 * @param {string} currencyMode - "GTQ" | "USD"
 * @param {string} [field] - Campo opcional para precio por M² ("pricePerM2")
 * @returns {{ value: number, currency: string } | null}
 */
export const getDisplayPrice = (market, currencyMode, field) => {
  if (!market) return null;

  // Si se especifica un campo (ej: pricePerM2), usar ese campo y su versión USD
  if (field === 'pricePerM2') {
    if (currencyMode === "GTQ") {
      const priceGTQ = market?.pricePerM2;
      if (priceGTQ && parseFloat(priceGTQ) > 0) {
        return { value: priceGTQ, currency: "GTQ" };
      }
      const priceUSDFallback = market?.priceM2USD;
      if (priceUSDFallback && parseFloat(priceUSDFallback) > 0) {
        return { value: priceUSDFallback, currency: "USD" };
      }
      return null;
    }
    // USD
    const priceUSD = market?.priceM2USD;
    if (priceUSD && parseFloat(priceUSD) > 0) {
      return { value: priceUSD, currency: "USD" };
    }
    const priceGTQFallback = market?.pricePerM2;
    if (priceGTQFallback && parseFloat(priceGTQFallback) > 0) {
      return { value: priceGTQFallback, currency: "GTQ" };
    }
    return null;
  }

  if (currencyMode === "GTQ") {
    const priceGTQ = market?.price;
    if (priceGTQ && parseFloat(priceGTQ) > 0) {
      return { value: priceGTQ, currency: "GTQ" };
    }
    const priceUSDFallback = market?.priceUSD;
    if (priceUSDFallback && parseFloat(priceUSDFallback) > 0) {
      return { value: priceUSDFallback, currency: "USD" };
    }
    return null;
  }

  // USD (default)
  const priceUSD = market?.priceUSD;
  if (priceUSD && parseFloat(priceUSD) > 0) {
    return { value: priceUSD, currency: "USD" };
  }
  const priceGTQFallback = market?.price;
  if (priceGTQFallback && parseFloat(priceGTQFallback) > 0) {
    return { value: priceGTQFallback, currency: "GTQ" };
  }
  return null;
};
