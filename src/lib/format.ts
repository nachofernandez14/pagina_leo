/** Formato moneda ARS para la UI. */
export function formatArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Total venta: cantidad × precio con 2 decimales (coherente con Postgres `numeric`). */
export function calcularTotalVenta(
  cantidadCajas: number,
  precioUnitario: number,
): number {
  return parseFloat((cantidadCajas * precioUnitario).toFixed(2));
}
