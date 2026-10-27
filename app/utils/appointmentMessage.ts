/**
 * "Your appointment was updated" message sent from the dashboard on WhatsApp.
 * Same layout as the website's booking message (my-app/app/lib/bookingMessage.js)
 * so the client sees every detail of the booking, in their language.
 */
import { LEBANON, computeTotals } from "./appointments";

type Lang = "en" | "ar" | "fr";

const T = {
  en: {
    updated: "Your booking at Rafi Daham Hair Beauty Salon has been updated.",
    details: "Booking Details:",
    reference: "Booking reference",
    name: "Name",
    phone: "Phone",
    email: "Email",
    location: "Location",
    staff: "Preference",
    staffs: { hijab: "Hijab", rafi: "Rafi", regular: "General" } as Record<string, string>,
    serviceType: "Service type",
    serviceTypes: { salon: "Salon service", home: "Home service" } as Record<string, string>,
    date: "Date",
    time: "Time",
    duration: "Duration",
    services: "Services",
    subtotal: "Subtotal",
    homeFee: "Home service (×2)",
    tax: "Tax",
    total: "Total",
    deposit: "Deposit to confirm (25%)",
    notes: "Notes",
    status: "Status",
    statuses: {
      pending: "Booked",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
    } as Record<string, string>,
    paid: "Payment",
    paidYes: "Paid ✓",
    mins: "mins",
    welcome: "We look forward to welcoming you and providing you with an exceptional experience.",
    thanks: "Thank you for choosing Rafi Daham.",
  },
  ar: {
    updated: "تم تعديل حجزك لدى صالون رافي دهام للشعر والتجميل.",
    details: "تفاصيل الحجز:",
    reference: "رقم الحجز",
    name: "الاسم",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    location: "الموقع",
    staff: "التفضيل",
    staffs: { hijab: "محجبة", rafi: "رافي", regular: "عام" } as Record<string, string>,
    serviceType: "نوع الخدمة",
    serviceTypes: { salon: "خدمة في الصالون", home: "خدمة منزلية" } as Record<string, string>,
    date: "التاريخ",
    time: "الوقت",
    duration: "المدة",
    services: "الخدمات",
    subtotal: "المجموع الفرعي",
    homeFee: "خدمة منزلية (ضعف السعر)",
    tax: "الضريبة",
    total: "الإجمالي",
    deposit: "العربون للتأكيد (25%)",
    notes: "ملاحظات",
    status: "الحالة",
    statuses: { pending: "محجوز", confirmed: "مؤكد", cancelled: "ملغى" } as Record<string, string>,
    paid: "الدفع",
    paidYes: "مدفوع ✓",
    mins: "دقيقة",
    welcome: "نتطلّع إلى استقبالك وتقديم تجربة استثنائية لك.",
    thanks: "شكراً لاختيارك رافي دهام.",
  },
  fr: {
    updated: "Votre réservation au salon Rafi Daham Hair Beauty a été modifiée.",
    details: "Détails de la réservation :",
    reference: "Référence",
    name: "Nom",
    phone: "Téléphone",
    email: "E-mail",
    location: "Lieu",
    staff: "Préférence",
    staffs: { hijab: "Hijab", rafi: "Rafi", regular: "Général" } as Record<string, string>,
    serviceType: "Type de service",
    serviceTypes: { salon: "Au salon", home: "À domicile" } as Record<string, string>,
    date: "Date",
    time: "Heure",
    duration: "Durée",
    services: "Services",
    subtotal: "Sous-total",
    homeFee: "Service à domicile (×2)",
    tax: "Taxe",
    total: "Total",
    deposit: "Acompte de confirmation (25 %)",
    notes: "Remarques",
    status: "Statut",
    statuses: { pending: "Réservé", confirmed: "Confirmé", cancelled: "Annulé" } as Record<string, string>,
    paid: "Paiement",
    paidYes: "Payé ✓",
    mins: "min",
    welcome: "Nous avons hâte de vous accueillir et de vous offrir une expérience exceptionnelle.",
    thanks: "Merci d’avoir choisi Rafi Daham.",
  },
};

const LOCALES: Record<Lang, string> = { en: "en-GB", ar: "ar-EG", fr: "fr-FR" };
const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;

export const messageLang = (lang?: string | null): Lang =>
  lang === "ar" || lang === "fr" ? lang : "en";

const longDate = (iso: string, lang: Lang) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(LOCALES[lang], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export function buildUpdateMessage(b: any, langIn?: string | null): string {
  const lang = messageLang(langIn);
  const t = T[lang];
  const cart = (b.cart || []).map((c: any) => ({
    title: String(c.title || ""),
    price: Number(c.price) || 0,
    qty: Math.max(1, Number(c.qty) || 1),
    duration: c.duration ? Number(c.duration) : null,
  }));
  const totals = computeTotals(cart, {
    country: b.country,
    city: b.city,
    serviceType: b.serviceType,
    taxPercent: Number(b.taxPercent) || 0,
  });
  const minutes = cart.reduce((a: number, c: any) => a + (c.duration || 0) * c.qty, 0);

  const services = cart.map(
    (i: any) =>
      `• ${i.title}${i.qty > 1 ? ` x${i.qty}` : ""} — ${money(i.price * i.qty)}${
        i.duration ? ` (${i.duration} ${t.mins})` : ""
      }`
  );
  const extra = totals.homeFee || totals.tax
    ? [
        `${t.subtotal}: ${money(totals.subtotal)}`,
        totals.homeFee ? `${t.homeFee}: ${money(totals.homeFee)}` : null,
        totals.tax ? `${t.tax} (${totals.taxPercent}%): ${money(totals.tax)}` : null,
      ]
    : [];
  const status = t.statuses[b.status || "pending"];
  const deposit = b.country && b.country !== LEBANON ? totals.deposit : 0;

  return [
    t.updated,
    "",
    `*${t.details}*`,
    b.reference ? `${t.reference}: ${b.reference}` : null,
    status ? `${t.status}: ${status}` : null,
    `${t.name}: ${b.name}`,
    b.phone ? `${t.phone}: ${b.phone}` : null,
    b.email ? `${t.email}: ${b.email}` : null,
    b.city || b.country ? `${t.location}: ${[b.city, b.country].filter(Boolean).join(", ")}` : null,
    t.staffs[b.staff] ? `${t.staff}: ${t.staffs[b.staff]}` : null,
    t.serviceTypes[b.serviceType] ? `${t.serviceType}: ${t.serviceTypes[b.serviceType]}` : null,
    `${t.date}: ${longDate(b.date, lang)}`,
    `${t.time}: ${b.hour}`,
    minutes ? `${t.duration}: ${minutes} ${t.mins}` : null,
    "",
    `${t.services}:`,
    ...services,
    "",
    ...extra,
    `${t.total}: ${money(totals.total)}`,
    deposit && !b.paid ? `${t.deposit}: ${money(deposit)}` : null,
    b.paid ? `${t.paid}: ${t.paidYes}` : null,
    b.notes ? `${t.notes}: ${b.notes}` : null,
    "",
    t.welcome,
    "",
    t.thanks,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/** wa.me link with the message pre-filled. */
export const whatsappLink = (phone: string, text: string) =>
  `https://wa.me/${String(phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
