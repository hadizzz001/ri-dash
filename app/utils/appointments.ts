/**
 * Appointment rules shared by the dashboard calendar and its API, kept in line
 * with the website (my-app/app/lib/bookingPrice.js & bookingOptions.js):
 *
 *  - Prices stored on a booking are already at the location rate.
 *  - Home service doubles the services inside Lebanon.
 *  - Tax applies only once a city outside Beirut is set.
 *  - Bookings outside Lebanon are confirmed with a 25% deposit.
 */

export const LEBANON = "Lebanon";
export const TAX_FREE_CITY = "Beirut";
export const DEPOSIT_RATE = 0.25;

export const STAFF = [
  { id: "hijab", name: "Hijab", color: "#a5b4fc" },
  { id: "regular", name: "No preference", color: "#fdba74" },
] as const;

export const UNASSIGNED = { id: "unassigned", name: "Unassigned", color: "#cbd5e1" };

export const STATUSES = [
  { id: "pending", name: "Booked", color: "#3b82f6" },
  { id: "confirmed", name: "Confirmed", color: "#8b5cf6" },
  { id: "arrived", name: "Arrived", color: "#f59e0b" },
  { id: "started", name: "Started", color: "#10b981" },
  { id: "completed", name: "Completed", color: "#64748b" },
  { id: "no-show", name: "No-show", color: "#ef4444" },
  { id: "cancelled", name: "Cancelled", color: "#ef4444" },
] as const;

export const SERVICE_TYPES = [
  { id: "salon", name: "Salon" },
  { id: "home", name: "Home service" },
];

export const OPEN_FROM = 8; // 08:00
export const OPEN_UNTIL = 24; // midnight
export const SLOT_MINUTES = 30;

const pad = (n: number) => String(n).padStart(2, "0");

/** ['08:00', '08:30', …, '23:30'] */
export const OPEN_HOURS = Array.from(
  { length: ((OPEN_UNTIL - OPEN_FROM) * 60) / SLOT_MINUTES },
  (_, i) => {
    const m = OPEN_FROM * 60 + i * SLOT_MINUTES;
    return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  }
);

export const COUNTRIES = ["Lebanon", "KSA", "Kuwait"];

const round2 = (n: number) => Math.round(n * 100) / 100;

export type CartItem = {
  id?: string;
  title: string;
  cat?: string;
  price: number;
  qty: number;
  duration?: number | null;
};

export function cleanCart(cart: any): CartItem[] {
  if (!Array.isArray(cart)) return [];
  return cart
    .map((c) => ({
      id: c?.id ? String(c.id) : undefined,
      title: String(c?.title ?? "").trim(),
      cat: c?.cat ? String(c.cat) : undefined,
      price: Math.max(0, Number(c?.price) || 0),
      qty: Math.max(1, Math.round(Number(c?.qty) || 1)),
      duration: c?.duration ? Math.max(0, Number(c.duration) || 0) : null,
    }))
    .filter((c) => c.title);
}

export const defaultTaxPercent = (country: string, city: string, percent: number) =>
  !country || !city || (country === LEBANON && city.trim().toLowerCase() === TAX_FREE_CITY.toLowerCase())
    ? 0
    : Math.max(0, Number(percent) || 0);

export function computeTotals(
  cart: CartItem[],
  { country, city, serviceType, taxPercent }: { country: string; city: string; serviceType: string; taxPercent: number }
) {
  const subtotal = round2(cart.reduce((a, i) => a + Number(i.price) * (Number(i.qty) || 1), 0));
  const homeFee = serviceType === "home" && country === LEBANON ? subtotal : 0;
  const rate = defaultTaxPercent(country, city, taxPercent);
  const tax = round2(((subtotal + homeFee) * rate) / 100);
  const total = round2(subtotal + homeFee + tax);
  const deposit = country && country !== LEBANON ? round2(total * DEPOSIT_RATE) : 0;
  return { subtotal, homeFee, taxPercent: rate, tax, total, deposit };
}

/** Total minutes of a cart (60 when the services have no duration). */
export const cartMinutes = (cart: any[] = []) => {
  const m = (cart || []).reduce(
    (a: number, i: any) => a + (Number(i?.duration) || 0) * (Number(i?.qty) || 1),
    0
  );
  return m > 0 ? m : 60;
};

export const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
export const isHour = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export const makeReference = () => "RD-" + Math.random().toString(36).slice(2, 8).toUpperCase();

/** A fresh MongoDB ObjectId as 24 hex characters. */
export const newObjectId = () => {
  const ts = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  let rest = "";
  for (let i = 0; i < 16; i += 1) rest += Math.floor(Math.random() * 16).toString(16);
  return ts + rest;
};
