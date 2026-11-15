const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

// 950 -> "950", 12400 -> "12.4K", 2100000 -> "2.1M"
export const formatCount = (n: number) => (n < 1000 ? String(n) : compact.format(n));
