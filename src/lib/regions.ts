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
  payment: "card" | "crypto" | "wire";
  paymentNote: string;
};

const DIGITAL = "Pay by card, or send USDT, BTC, ETH or Solana — admin approves.";

export const regions: Region[] = [
  {
    country: "United States",
    code: "US",
    currency: "USD",
    locale: "en-US",
    timeZone: "America/New_York",
    rate: 1,
    deliveryDays: [2, 5],
    internationalDays: [4, 8],
    payment: "card",
    paymentNote: DIGITAL,
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
    payment: "card",
    paymentNote: DIGITAL,
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
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Australia",
    code: "AU",
    currency: "AUD",
    locale: "en-AU",
    timeZone: "Australia/Sydney",
    rate: 1.52,
    deliveryDays: [4, 7],
    internationalDays: [6, 11],
    payment: "card",
    paymentNote: DIGITAL,
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
    payment: "card",
    paymentNote: DIGITAL,
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
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Spain",
    code: "ES",
    currency: "EUR",
    locale: "es-ES",
    timeZone: "Europe/Madrid",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Italy",
    code: "IT",
    currency: "EUR",
    locale: "it-IT",
    timeZone: "Europe/Rome",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Netherlands",
    code: "NL",
    currency: "EUR",
    locale: "nl-NL",
    timeZone: "Europe/Amsterdam",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Switzerland",
    code: "CH",
    currency: "CHF",
    locale: "de-CH",
    timeZone: "Europe/Zurich",
    rate: 0.88,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Sweden",
    code: "SE",
    currency: "SEK",
    locale: "sv-SE",
    timeZone: "Europe/Stockholm",
    rate: 10.5,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Norway",
    code: "NO",
    currency: "NOK",
    locale: "nb-NO",
    timeZone: "Europe/Oslo",
    rate: 10.8,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
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
    payment: "card",
    paymentNote: DIGITAL,
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
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Saudi Arabia",
    code: "SA",
    currency: "SAR",
    locale: "ar-SA",
    timeZone: "Asia/Riyadh",
    rate: 3.75,
    deliveryDays: [4, 8],
    internationalDays: [7, 12],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Singapore",
    code: "SG",
    currency: "SGD",
    locale: "en-SG",
    timeZone: "Asia/Singapore",
    rate: 1.34,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Hong Kong",
    code: "HK",
    currency: "HKD",
    locale: "en-HK",
    timeZone: "Asia/Hong_Kong",
    rate: 7.8,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Japan",
    code: "JP",
    currency: "JPY",
    locale: "ja-JP",
    timeZone: "Asia/Tokyo",
    rate: 150,
    deliveryDays: [4, 7],
    internationalDays: [6, 11],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "South Korea",
    code: "KR",
    currency: "KRW",
    locale: "ko-KR",
    timeZone: "Asia/Seoul",
    rate: 1350,
    deliveryDays: [4, 7],
    internationalDays: [6, 11],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "India",
    code: "IN",
    currency: "INR",
    locale: "en-IN",
    timeZone: "Asia/Kolkata",
    rate: 83,
    deliveryDays: [4, 8],
    internationalDays: [7, 12],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Brazil",
    code: "BR",
    currency: "BRL",
    locale: "pt-BR",
    timeZone: "America/Sao_Paulo",
    rate: 5,
    deliveryDays: [4, 8],
    internationalDays: [7, 12],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Mexico",
    code: "MX",
    currency: "MXN",
    locale: "es-MX",
    timeZone: "America/Mexico_City",
    rate: 17,
    deliveryDays: [4, 8],
    internationalDays: [6, 11],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "New Zealand",
    code: "NZ",
    currency: "NZD",
    locale: "en-NZ",
    timeZone: "Pacific/Auckland",
    rate: 1.65,
    deliveryDays: [4, 8],
    internationalDays: [7, 12],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Ireland",
    code: "IE",
    currency: "EUR",
    locale: "en-IE",
    timeZone: "Europe/Dublin",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Portugal",
    code: "PT",
    currency: "EUR",
    locale: "pt-PT",
    timeZone: "Europe/Lisbon",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Austria",
    code: "AT",
    currency: "EUR",
    locale: "de-AT",
    timeZone: "Europe/Vienna",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Belgium",
    code: "BE",
    currency: "EUR",
    locale: "nl-BE",
    timeZone: "Europe/Brussels",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Denmark",
    code: "DK",
    currency: "DKK",
    locale: "da-DK",
    timeZone: "Europe/Copenhagen",
    rate: 6.87,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Finland",
    code: "FI",
    currency: "EUR",
    locale: "fi-FI",
    timeZone: "Europe/Helsinki",
    rate: 0.92,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Poland",
    code: "PL",
    currency: "PLN",
    locale: "pl-PL",
    timeZone: "Europe/Warsaw",
    rate: 3.98,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Czech Republic",
    code: "CZ",
    currency: "CZK",
    locale: "cs-CZ",
    timeZone: "Europe/Prague",
    rate: 23.2,
    deliveryDays: [3, 6],
    internationalDays: [5, 9],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Turkey",
    code: "TR",
    currency: "TRY",
    locale: "tr-TR",
    timeZone: "Europe/Istanbul",
    rate: 32,
    deliveryDays: [4, 8],
    internationalDays: [7, 12],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Argentina",
    code: "AR",
    currency: "ARS",
    locale: "es-AR",
    timeZone: "America/Argentina/Buenos_Aires",
    rate: 900,
    deliveryDays: [4, 9],
    internationalDays: [7, 14],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Chile",
    code: "CL",
    currency: "CLP",
    locale: "es-CL",
    timeZone: "America/Santiago",
    rate: 940,
    deliveryDays: [4, 9],
    internationalDays: [7, 14],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Colombia",
    code: "CO",
    currency: "COP",
    locale: "es-CO",
    timeZone: "America/Bogota",
    rate: 4000,
    deliveryDays: [4, 9],
    internationalDays: [7, 14],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Malaysia",
    code: "MY",
    currency: "MYR",
    locale: "ms-MY",
    timeZone: "Asia/Kuala_Lumpur",
    rate: 4.4,
    deliveryDays: [4, 8],
    internationalDays: [6, 11],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Thailand",
    code: "TH",
    currency: "THB",
    locale: "th-TH",
    timeZone: "Asia/Bangkok",
    rate: 35.5,
    deliveryDays: [4, 8],
    internationalDays: [6, 11],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Vietnam",
    code: "VN",
    currency: "VND",
    locale: "vi-VN",
    timeZone: "Asia/Ho_Chi_Minh",
    rate: 25000,
    deliveryDays: [4, 9],
    internationalDays: [7, 14],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Philippines",
    code: "PH",
    currency: "PHP",
    locale: "en-PH",
    timeZone: "Asia/Manila",
    rate: 57,
    deliveryDays: [4, 8],
    internationalDays: [6, 11],
    payment: "card",
    paymentNote: DIGITAL,
  },
  {
    country: "Indonesia",
    code: "ID",
    currency: "IDR",
    locale: "id-ID",
    timeZone: "Asia/Jakarta",
    rate: 15700,
    deliveryDays: [4, 9],
    internationalDays: [7, 14],
    payment: "card",
    paymentNote: DIGITAL,
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
    payment: "card",
    paymentNote: DIGITAL,
  },
];

export const defaultRegion: Region = regions.find(
  (region) => region.country === "United States"
) as Region;

export const regionCountries = regions.map((region) => region.country);

const currencySymbols: Record<string, string> = {
  USD: "$",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  EUR: "€",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  ZAR: "R",
  AED: "AED",
  SAR: "SAR",
  SGD: "S$",
  HKD: "HK$",
  JPY: "¥",
  KRW: "₩",
  INR: "₹",
  BRL: "R$",
  MXN: "MX$",
  NZD: "NZ$",
  DKK: "kr",
  PLN: "zł",
  CZK: "Kč",
  TRY: "₺",
  ARS: "AR$",
  CLP: "CLP$",
  COP: "COL$",
  MYR: "RM",
  THB: "฿",
  VND: "₫",
  PHP: "₱",
  IDR: "Rp",
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
  return new Intl.DateTimeFormat(region.locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: region.timeZone,
  }).format(new Date(iso));
}

export function formatDate(iso: string, region: Region) {
  return new Intl.DateTimeFormat(region.locale, {
    dateStyle: "medium",
    timeZone: region.timeZone,
  }).format(new Date(iso));
}

export function formatTime(iso: string, region: Region) {
  return new Intl.DateTimeFormat(region.locale, {
    timeStyle: "short",
    timeZone: region.timeZone,
  }).format(new Date(iso));
}

export function localClock(region: Region, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: region.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    time: `${get("hour")}:${get("minute")}`,
    day: get("weekday"),
    weekday: get("weekday"),
    label: `${get("weekday")} ${get("hour")}:${get("minute")}`,
  };
}

export function isOpenNow(
  region: Region,
  schedule: { day: string; open: number | null; close: number | null }[],
  now = new Date()
) {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: region.timeZone,
    weekday: "short",
  }).format(now);

  const today = schedule.find((entry) => entry.day.toLowerCase() === day.toLowerCase());

  if (!today || today.open === null || today.close === null) return false;

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: region.timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const minutes = hour * 60 + minute;

  return minutes >= today.open * 60 && minutes < today.close * 60;
}

/** Delivery window for the shopper, in their own country. */
export function deliveryWindow(region: Region, isDomestic = true) {
  const [from, to] = isDomestic
    ? region.deliveryDays
    : region.internationalDays;

  return `${from}–${to} business days`;
}
