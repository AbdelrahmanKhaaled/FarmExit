/**
 * Verifies the configured URL is the FarmExit API (not another app on the same port).
 * FarmExit: GET /api/v1/marketplace/farms returns a JSON body with an `items` array.
 * A generic /health 200 alone is not sufficient.
 */
const base = (process.env.FARMEXIT_API_URL ?? 'http://127.0.0.1:4001/api/v1').replace(/\/$/, '');

async function main() {
  const health = await fetch(`${base}/health`).catch(() => null);
  const healthOk = health?.ok ?? false;
  const healthBody = healthOk ? await health.json().catch(() => null) : null;

  const market = await fetch(`${base}/marketplace/farms?page=1&pageSize=1`).catch(() => null);
  const marketOk = market?.ok ?? false;
  let items = null;
  if (marketOk) {
    const data = await market.json().catch(() => null);
    items = data?.items ?? data?.data?.items;
  }

  const isFarmExit = marketOk && Array.isArray(items);
  console.log(
    JSON.stringify({
      base,
      healthOk,
      healthShape: healthBody && typeof healthBody === 'object' ? Object.keys(healthBody) : null,
      marketplaceOk: marketOk,
      isFarmExit,
      listingCount: isFarmExit ? items.length : null,
    }),
  );
  process.exit(isFarmExit ? 0 : 1);
}

main();
