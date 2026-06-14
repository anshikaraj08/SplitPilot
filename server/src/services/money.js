export function rupeesToPaise(value) {
  return Math.round(Number(value) * 100);
}

export function paiseToRupees(paise) {
  return Number((paise / 100).toFixed(2));
}

export function formatInr(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(paise / 100);
}

export function allocateRemainder(totalPaise, weights) {
  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return weights.map((item) => ({ ...item, sharePaise: 0 }));

  const raw = weights.map((item) => {
    const exact = (totalPaise * item.weight) / totalWeight;
    return { ...item, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  let remaining = totalPaise - raw.reduce((sum, item) => sum + item.floor, 0);
  raw.sort((a, b) => b.remainder - a.remainder);
  for (const item of raw) {
    if (remaining <= 0) break;
    item.floor += 1;
    remaining -= 1;
  }

  return raw.map(({ floor, remainder, ...item }) => ({ ...item, sharePaise: floor }));
}
