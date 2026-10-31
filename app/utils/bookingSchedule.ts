/**
 * Online booking schedule, managed from the dashboard's "Booking Schedule"
 * page (/app1) and read by the website (my-app/app/lib/bookingOptions.js
 * keeps the same defaults and rules). Stored as one document in the
 * BookingSettings collection:
 *
 *  - countries: where an appointment can be booked, with their cities and
 *    time zone (used for the 1-hour reminder emails).
 *  - weekly:    7 entries, Sunday first (JS getDay()), { open, from, until }.
 *  - overrides: specific dates { date, closed, from, until, note } that
 *    replace the weekly hours of that day (a holiday, a late opening…).
 *
 * Nothing saved yet = every day open, 08:00 to midnight, Lebanon / KSA / Kuwait.
 */

export type City = [string, string];
export type Country = { name: string; ar: string; timeZone: string; cities: City[] };
export type DayHours = { open: boolean; from: string; until: string };
export type Override = { date: string; closed: boolean; from: string; until: string; note?: string };
export type BookingSettings = { countries: Country[]; weekly: DayHours[]; overrides: Override[] };

export const SLOT_MINUTES = 30;
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const LEBANON_CITIES: City[] = [
  ['Beirut', 'بيروت'],
  ['Adma', 'أدما'],
  ['Ajaltoun', 'عجلتون'],
  ['Aley', 'عاليه'],
  ['Amchit', 'عمشيت'],
  ['Amioun', 'أميون'],
  ['Anfeh', 'أنفه'],
  ['Anjar', 'عنجر'],
  ['Antelias', 'أنطلياس'],
  ['Aramoun', 'عرمون'],
  ['Arsal', 'عرسال'],
  ['Baabda', 'بعبدا'],
  ['Baakleen', 'بعقلين'],
  ['Baalbek', 'بعلبك'],
  ['Bar Elias', 'برالياس'],
  ['Barja', 'برجا'],
  ['Batroun', 'البترون'],
  ['Bchamoun', 'بشامون'],
  ['Bcharre', 'بشري'],
  ['Bebnine', 'ببنين'],
  ['Beit Mery', 'بيت مري'],
  ['Beiteddine', 'بيت الدين'],
  ['Bhamdoun', 'بحمدون'],
  ['Bikfaya', 'بكفيا'],
  ['Bint Jbeil', 'بنت جبيل'],
  ['Bourj el Barajneh', 'برج البراجنة'],
  ['Bourj Hammoud', 'برج حمود'],
  ['Broummana', 'برمانا'],
  ['Byblos (Jbeil)', 'جبيل'],
  ['Chebaa', 'شبعا'],
  ['Chekka', 'شكا'],
  ['Chhim', 'شحيم'],
  ['Chiyah', 'الشياح'],
  ['Chmestar', 'شمسطار'],
  ['Choueifat', 'الشويفات'],
  ['Chtaura', 'شتورة'],
  ['Damour', 'الدامور'],
  ['Dbayeh', 'ضبية'],
  ['Deir el Ahmar', 'دير الأحمر'],
  ['Deir el Qamar', 'دير القمر'],
  ['Dekwaneh', 'الدكوانة'],
  ['Dhour el Choueir', 'ضهور الشوير'],
  ['Douma', 'دوما'],
  ['Ehden', 'إهدن'],
  ['El Mina', 'الميناء'],
  ['Fanar', 'الفنار'],
  ['Faraya', 'فاريا'],
  ['Furn el Chebbak', 'فرن الشباك'],
  ['Ghazieh', 'الغازية'],
  ['Ghazir', 'غزير'],
  ['Ghobeiry', 'الغبيري'],
  ['Hadath', 'الحدث'],
  ['Halba', 'حلبا'],
  ['Hammana', 'حمانا'],
  ['Haret Hreik', 'حارة حريك'],
  ['Harissa', 'حريصا'],
  ['Hasbaya', 'حاصبيا'],
  ['Hasroun', 'حصرون'],
  ['Hazmieh', 'الحازمية'],
  ['Hermel', 'الهرمل'],
  ['Jal el Dib', 'جل الديب'],
  ['Jdeideh', 'الجديدة'],
  ['Jezzine', 'جزين'],
  ['Jiyeh', 'الجية'],
  ['Joub Jannine', 'جب جنين'],
  ['Jounieh', 'جونية'],
  ['Kahaleh', 'الكحالة'],
  ['Kfar Roummane', 'كفررمان'],
  ['Kfardebian', 'كفرذبيان'],
  ['Kfarshima', 'كفرشيما'],
  ['Khiam', 'الخيام'],
  ['Kousba', 'كوسبا'],
  ['Machghara', 'مشغرة'],
  ['Maghdoucheh', 'مغدوشة'],
  ['Majdal Anjar', 'مجدل عنجر'],
  ['Mansourieh', 'المنصورية'],
  ['Marjayoun', 'مرجعيون'],
  ['Minieh', 'المنية'],
  ['Moukhtara', 'المختارة'],
  ['Naameh', 'الناعمة'],
  ['Nabatieh', 'النبطية'],
  ['Naqoura', 'الناقورة'],
  ['Qab Elias', 'قب الياس'],
  ['Qana', 'قانا'],
  ['Qaraoun', 'القرعون'],
  ['Qartaba', 'قرطبا'],
  ['Qobayat', 'القبيات'],
  ['Rabieh', 'الرابية'],
  ['Ras Baalbek', 'رأس بعلبك'],
  ['Rashaya', 'راشيا'],
  ['Rayak', 'رياق'],
  ['Saadnayel', 'سعدنايل'],
  ['Saghbine', 'صغبين'],
  ['Sarafand', 'الصرفند'],
  ['Sidon (Saida)', 'صيدا'],
  ['Sin el Fil', 'سن الفيل'],
  ['Sir el Danniyeh', 'سير الضنية'],
  ['Sofar', 'صوفر'],
  ['Tabarja', 'طبرجا'],
  ['Tannourine', 'تنورين'],
  ['Tebnine', 'تبنين'],
  ['Tripoli', 'طرابلس'],
  ['Tyre (Sour)', 'صور'],
  ['Zahle', 'زحلة'],
  ['Zalka', 'الزلقا'],
  ['Zgharta', 'زغرتا'],
  ['Zouk Mikael', 'ذوق مكايل'],
  ['Zouk Mosbeh', 'ذوق مصبح'],
];

export const DEFAULT_COUNTRIES: Country[] = [
  { name: "Lebanon", ar: "لبنان", timeZone: "Asia/Beirut", cities: LEBANON_CITIES },
  { name: "KSA", ar: "السعودية", timeZone: "Asia/Riyadh", cities: [["Riyadh", "الرياض"], ["Jeddah", "جدة"]] },
  { name: "Kuwait", ar: "الكويت", timeZone: "Asia/Kuwait", cities: [["Kuwait City", "مدينة الكويت"]] },
];

export const DEFAULT_WEEKLY: DayHours[] = Array.from({ length: 7 }, () => ({ open: true, from: "08:00", until: "24:00" }));

export const TIME_ZONES = [
  "Asia/Beirut", "Asia/Riyadh", "Asia/Kuwait", "Asia/Dubai", "Asia/Qatar", "Asia/Bahrain", "Asia/Muscat",
  "Asia/Amman", "Asia/Damascus", "Asia/Baghdad", "Africa/Cairo", "Europe/Istanbul", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "America/Toronto", "Australia/Sydney",
];

const isTime = (v: any) => typeof v === "string" && /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(v);
const isIso = (v: any) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Cleans what the page sends / what is stored; anything missing falls back to the defaults. */
export function normalizeSettings(raw: any): BookingSettings {
  const countries: Country[] = Array.isArray(raw?.countries)
    ? raw.countries
        .map((c: any) => ({
          name: String(c?.name || "").trim(),
          ar: String(c?.ar || "").trim(),
          timeZone: String(c?.timeZone || "Asia/Beirut").trim(),
          cities: (Array.isArray(c?.cities) ? c.cities : [])
            .map((x: any) =>
              Array.isArray(x) ? [String(x[0] || "").trim(), String(x[1] || "").trim()] : [String(x || "").trim(), ""]
            )
            .filter((x: City) => x[0]) as City[],
        }))
        .filter((c: Country) => c.name && c.cities.length)
    : [];
  const weekly: DayHours[] = DEFAULT_WEEKLY.map((def, i) => {
    const w = Array.isArray(raw?.weekly) ? raw.weekly[i] : null;
    if (!w) return { ...def };
    return { open: w.open !== false, from: isTime(w.from) ? w.from : def.from, until: isTime(w.until) ? w.until : def.until };
  });
  const byDate = new Map<string, Override>();
  (Array.isArray(raw?.overrides) ? raw.overrides : [])
    .filter((o: any) => isIso(o?.date))
    .forEach((o: any) =>
      byDate.set(o.date, {
        date: o.date,
        closed: !!o.closed,
        from: isTime(o.from) ? o.from : "08:00",
        until: isTime(o.until) ? o.until : "24:00",
        note: o.note ? String(o.note).slice(0, 120) : "",
      })
    );
  return {
    countries: countries.length ? countries : DEFAULT_COUNTRIES,
    weekly,
    overrides: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

/** Start times between two "HH:MM" (until excluded), every 30 minutes. */
export function slotsBetween(from: string, until: string): string[] {
  const out: string[] = [];
  for (let m = toMin(from); m + SLOT_MINUTES <= toMin(until); m += SLOT_MINUTES)
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}

/** The open start times of a date ("YYYY-MM-DD") under these settings. */
export function hoursFor(settings: BookingSettings, iso: string): string[] {
  const o = settings.overrides.find((x) => x.date === iso);
  if (o) return o.closed ? [] : slotsBetween(o.from, o.until);
  const [y, m, d] = iso.split("-").map(Number);
  const day = settings.weekly[new Date(y, m - 1, d).getDay()];
  return day?.open ? slotsBetween(day.from, day.until) : [];
}
