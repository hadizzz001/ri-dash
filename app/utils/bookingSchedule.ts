/**
 * Online booking schedule, managed from the dashboard's "Booking Schedule"
 * page (/app1) and read by the website (my-app/app/lib/bookingOptions.js
 * keeps the same defaults and rules). Stored as one document in the
 * BookingSettings collection:
 *
 *  - countries: where an appointment can be booked, with their cities and
 *    time zone (used for the 1-hour reminder emails). Each one can be
 *    locked (the website says it isn't available right now and gives the
 *    salon's phone) and has a mode:
 *      "weekly" — the weekly hours and specific dates below;
 *      "dates"  — only the dates of its own calendar (`dates`), e.g. the
 *                 days the team travels to KSA.
 *    and its locked dates & hours (`unavailable`): times the team isn't
 *    available there, { date, from, until } (all day = 00:00 to 24:00, a
 *    date can have several). The website hides them in either mode.
 *  - weekly:    7 entries, Sunday first (JS getDay()), { open, from, until }.
 *  - overrides: specific dates { date, closed, from, until, note } that
 *    replace the weekly hours of that day (a holiday, a late opening…).
 *
 * Nothing saved yet = every day open, 08:00 to midnight, Lebanon / KSA / Kuwait.
 */

export type City = [string, string];
export type CountryDate = { date: string; from: string; until: string };
export type CountryMode = "weekly" | "dates";
/** Hours of a date the team isn't available in a country (all day = 00:00 to 24:00). */
export type LockedTime = { date: string; from: string; until: string };
export type Country = {
  name: string;
  ar: string;
  timeZone: string;
  cities: City[];
  locked: boolean;
  mode: CountryMode;
  dates: CountryDate[];
  unavailable: LockedTime[];
};
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

/** Open for booking on the weekly hours (a new or default country). */
export const bookable = () => ({
  locked: false,
  mode: "weekly" as CountryMode,
  dates: [] as CountryDate[],
  unavailable: [] as LockedTime[],
});

export const DEFAULT_COUNTRIES: Country[] = [
  { name: "Lebanon", ar: "لبنان", timeZone: "Asia/Beirut", cities: LEBANON_CITIES, ...bookable() },
  { name: "KSA", ar: "السعودية", timeZone: "Asia/Riyadh", cities: [["Riyadh", "الرياض"], ["Jeddah", "جدة"]], ...bookable() },
  { name: "Kuwait", ar: "الكويت", timeZone: "Asia/Kuwait", cities: [["Kuwait City", "مدينة الكويت"]], ...bookable() },
];

export const DEFAULT_WEEKLY: DayHours[] = Array.from({ length: 7 }, () => ({ open: true, from: "08:00", until: "24:00" }));

export const TIME_ZONES = [
  "Asia/Beirut", "Asia/Riyadh", "Asia/Kuwait", "Asia/Dubai", "Asia/Qatar", "Asia/Bahrain", "Asia/Muscat",
  "Asia/Amman", "Asia/Damascus", "Asia/Baghdad", "Africa/Cairo", "Europe/Istanbul", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "America/Toronto", "Australia/Sydney",
];

const isTime = (v: any) => typeof v === "string" && /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(v);
const isIso = (v: any) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** A country's own calendar: one entry per date, oldest first. */
export function normalizeDates(list: any): CountryDate[] {
  const byDate = new Map<string, CountryDate>();
  (Array.isArray(list) ? list : [])
    .filter((d: any) => isIso(d?.date))
    .forEach((d: any) =>
      byDate.set(d.date, {
        date: d.date,
        from: isTime(d.from) ? d.from : "08:00",
        until: isTime(d.until) ? d.until : "24:00",
      })
    );
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export const ALL_DAY = { from: "00:00", until: "24:00" };
export const isAllDay = (t: { from: string; until: string }) => t.from === ALL_DAY.from && t.until === ALL_DAY.until;

/** A country's locked dates & hours, by date then start; a missing time means the whole day. */
export function normalizeUnavailable(list: any): LockedTime[] {
  const byKey = new Map<string, LockedTime>();
  (Array.isArray(list) ? list : [])
    .filter((t: any) => isIso(t?.date))
    .forEach((t: any) => {
      const lock = {
        date: t.date,
        from: isTime(t.from) ? t.from : ALL_DAY.from,
        until: isTime(t.until) ? t.until : ALL_DAY.until,
      };
      byKey.set(`${lock.date} ${lock.from} ${lock.until}`, lock);
    });
  return Array.from(byKey.values()).sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));
}

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
          locked: c?.locked === true,
          mode: (c?.mode === "dates" ? "dates" : "weekly") as CountryMode,
          dates: normalizeDates(c?.dates),
          unavailable: normalizeUnavailable(c?.unavailable),
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

/** Does the 30-minute start time `hour` fall in one of these locked hours? */
export const isLockedAt = (locks: { from: string; until: string }[], hour: string) =>
  locks.some((t) => toMin(hour) < toMin(t.until) && toMin(hour) + SLOT_MINUTES > toMin(t.from));

/** Start times of a date before the country's locked hours: its own calendar, else the specific date or weekday. */
function openHours(settings: BookingSettings, iso: string, c?: Country): string[] {
  if (c?.mode === "dates") {
    const own = c.dates.find((x) => x.date === iso);
    return own ? slotsBetween(own.from, own.until) : [];
  }
  const o = settings.overrides.find((x) => x.date === iso);
  if (o) return o.closed ? [] : slotsBetween(o.from, o.until);
  const [y, m, d] = iso.split("-").map(Number);
  const day = settings.weekly[new Date(y, m - 1, d).getDay()];
  return day?.open ? slotsBetween(day.from, day.until) : [];
}

/**
 * The open start times of a date ("YYYY-MM-DD") under these settings, in an
 * appointment country when one is given: none if it is locked, its own
 * calendar's hours if it has one, otherwise the specific date or weekday,
 * minus the country's locked dates & hours.
 */
export function hoursFor(settings: BookingSettings, iso: string, country?: string): string[] {
  const c = country ? settings.countries.find((x) => x.name === country) : undefined;
  if (c?.locked) return [];
  const open = openHours(settings, iso, c);
  const locks = (c?.unavailable || []).filter((t) => t.date === iso);
  return locks.length ? open.filter((h) => !isLockedAt(locks, h)) : open;
}
