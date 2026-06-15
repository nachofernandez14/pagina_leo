const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

export function auditLog(
  userEmail: string,
  accion: string,
  detalle?: string,
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    usuario: userEmail,
    accion,
    detalle: detalle ?? null,
  };
  console.log(JSON.stringify(entry));
}
