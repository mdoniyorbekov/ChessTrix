export function publicAsset(path: string) {
  const base = import.meta.env.BASE_URL || "./";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path.replace(/^\/+/, "")}`;
}

export function publicAssetUrl(path: string) {
  return new URL(publicAsset(path), window.location.href).href;
}
