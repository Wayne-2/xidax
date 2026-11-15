export type Region = {
  country: string;
  code: string;
  currency: string;
  locale: string;
  timeZone: string;
  /** Units of the local currency per 1 USD. Indicative, maintained by hand. */
  rate: number;
  /** Working days for delivery inside the country. */
  deliveryDays: [number, number];
  /** Working days for delivery outside the country. */
  internationalDays: [number, number];
  /** The rail we recommend for this country. */
  payment: "crypto" | "wire";
  paymentNote: string;
};

export const regions: Region[] = [
  {
    country: "Nigeria",
    code: "NG",
    currency: "NGN",
    locale: "en-NG",
    timeZone: "Africa/Lagos",
    rate: 1650,
    deliveryDays: [1, 3],
    internationalDays: [5, 9],
    payment: "wire",
    paymentNote: "Pay into a Naira account, or settle in USDT.",
  },
  {
    country: "Ghana",
    code: "GH",
    currency: "GHS",
    locale: "en-GH",
    timeZone: "Africa/Accra",
    rate: 15.4,
    deliveryDays: [2, 4],
    internationalDays: [5, 9],
    payment: "crypto",
    paymentNote: "Settle in USDT on TRC20 — fastest for Ghana.",
  },
  {
    country: "Kenya",
    code: "KE",
    currency: "KES",
    locale: "en-KE",
    timeZone: "Africa/Nairobi",
    rate: 129,
    deliveryDays: [3, 5],
    internationalDays: [6, 10],
    payment: "crypto",
    paymentNote: "Settle in USDT on TRC20 — fastest for Kenya.",
  },
  {
    country: "South Africa",
    code: "ZA",
    currency: "ZAR",
    locale: "en-ZA",
    timeZone: "Africa/Johannesburg",
    rate: 18.4,
    deliveryDays: [4, 7],
    internationalDays: [7, 12],
    payment: "crypto",
    paymentNote: "Settle in USDT on TRC20 — fastest for South Africa.",
  },
  {
    country: "United Kingdom",
    code: "GB",
    currency: "GBP",
    locale: "en-GB",
    timeZone: "Europe/London",
    rate: 0.79,
    deliveryDays: [2, 5],
    internationalDays: [4, 8],
    payment: "crypto",
    paymentNote: "Pay in USDT, ETH or Solana on bachs.",
  },
  {
    country: "United States",
    code: "US",
    currency: "USD",
    locale: "en-US",
    timeZone: "America/New_York",
    rate: 1,
    deliveryDays: [2, 5],
    internationalDays: [4, 8],
    payment: "crypto",
    paymentNote: "Pay in USDT, ETH or Solana on bachs.",
  },
  {
    country: "Canada",
    code: "CA",
    currency: "CAD",
    locale: "en-CA",
    timeZone: "America/Toronto",
    rate: 1.36,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "crypto",
    paymentNote: "Pay in USDT, ETH or Solana on bachs.",
  },
  {
    country: "Germany",
    code: "DE",
    currency: "EUR",
    locale: "de-DE",
    timeZone: "Europe/Berlin",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "crypto",
    paymentNote: "Pay in USDT, ETH or Solana on bachs.",
  },
  {
    country: "France",
    code: "FR",
    currency: "EUR",
    locale: "fr-FR",
    timeZone: "Europe/Paris",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "crypto",
    paymentNote: "Pay in USDT, ETH or Solana on bachs.",
  },
  {
    country: "United Arab Emirates",
    code: "AE",
    currency: "AED",
    locale: "en-AE",
    timeZone: "Asia/Dubai",
    rate: 3.67,
    deliveryDays: [4, 8],
    internationalDays: [7, 12],
    payment: "crypto",
    paymentNote: "Settle in USDT on TRC20 — fastest for the UAE.",
  },
  {
    country: "Other",
    code: "XX",
    currency: "USD",
    locale: "en-US",
    timeZone: "UTC",
    rate: 1,
    deliveryDays: [4, 7],
    internationalDays: [6, 11],
    payment: "crypto",
    paymentNote: "Pay in USDT, ETH or Solana on bachs.",
  },
];

export const defaultRegion: Region = regions.find(
  (region) => region.country === "United States"
) as Region;

export const regionCountries = regions.map((region) => region.country);

const currencySymbols: Record<string, string> = {
  USD: "$",
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  ZAR: "R",
  GBP: "£",
  CAD: "CA$",
  EUR: "€",
  AED: "AED",
};

/** "NGN (₦)" — the label used by the account settings. */
export function currencyLabel(currency: string) {
  const symbol = currencySymbols[currency];

  return symbol ? `${currency} (${symbol})` : currency;
}

export function findRegion(country?: string | null): Region {
  if (!country) return defaultRegion;

  const match = regions.find(
    (region) => region.country.toLowerCase() === country.trim().toLowerCase()
  );

  return match ?? defaultRegion;
}

export function convertFromUsd(amount: number, region: Region) {
  return amount * region.rate;
}

export function formatMoney(
  amountUsd: number,
  region: Region,
  options: { exact?: boolean } = {}
) {
  const exact = options.exact ?? false;
  const converted = convertFromUsd(amountUsd, region);

  const formatter = new Intl.NumberFormat(region.locale, {
    style: "currency",
    currency: region.currency,
    minimumFractionDigits: exact ? 2 : 0,
    maximumFractionDigits: exact ? 2 : 0,
  });

  return formatter.format(converted);
}

/** The USD amount we actually settle, always shown next to an estimate. */
export function formatBase(amountUsd: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountUsd);
}

export function formatDateTime(iso: string, region: Region) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(region.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: region.timeZone,
  }).format(date);
}

export function formatDate(iso: string, region: Region) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(region.locale, {
    dateStyle: "medium",
    timeZone: region.timeZone,
  }).format(date);
}

export function formatTime(iso: string, region: Region) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(region.locale, {
    timeStyle: "short",
    timeZone: region.timeZone,
  }).format(date);
}

export function localClock(region: Region, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    weekday: "long",
    hour12: false,
    timeZone: region.timeZone,
  }).formatToParts(now);

  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const hour = Number(read("hour")) % 24;

  return {
    hour,
    minute: Number(read("minute")),
    weekday: read("weekday"),
    label: new Intl.DateTimeFormat(region.locale, {
      timeStyle: "short",
      timeZone: region.timeZone,
    }).format(now),
  };
}

export function isOpenNow(
  region: Region,
  schedule: { day: string; open: number | null; close: number | null }[],
  now = new Date()
) {
  const clock = localClock(region, now);
  const day = schedule.find((entry) => entry.day === clock.weekday);

  if (!day || day.open === null || day.close === null) return false;

  const minutes = clock.hour * 60 + clock.minute;

  return minutes >= day.open * 60 && minutes < day.close * 60;
}

/** Delivery window for the shopper, in their own country. */
export function deliveryWindow(region: Region, isDomestic = true) {
  const [from, to] = isDomestic
    ? region.deliveryDays
    : region.internationalDays;

  return `${from}–${to} business days`;
}
