'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Lock,
  LockOpen,
  MapPin,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  BookingSettings,
  Country,
  CountryDate,
  DEFAULT_COUNTRIES,
  DEFAULT_WEEKLY,
  TIME_ZONES,
  WEEKDAYS,
  bookable,
  hoursFor,
  normalizeSettings,
} from '../utils/bookingSchedule';
import './schedule.css';

/**
 * Booking Schedule: what the website lets clients book.
 *  - Appointment countries. Each one can be locked (the website then says
 *    it isn't available right now and gives the salon's phone / WhatsApp),
 *    and either opens on every open day of the weekly hours or only on the
 *    dates picked in its own calendar (e.g. the days the team is in KSA).
 *  - Weekly days & hours (every day 08:00–24:00 by default).
 *  - Specific dates: close a date or give it its own hours.
 * Saved in one go with "Save changes".
 */

/** The salon's phone, as the website shows it for a locked country */
const SALON_PHONE = '+961 3 896 074';

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const todayISO = () => toIso(new Date());
const longDate = (iso: string) =>
  fromIso(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** 00:00 … 24:00 every 30 minutes */
const TIMES = Array.from({ length: 49 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);
const timeLabel = (t: string) => (t === '24:00' ? '24:00 (midnight)' : t);

const citiesToText = (c: Country) => c.cities.map(([en, ar]) => (ar ? `${en} | ${ar}` : en)).join('\n');
const textToCities = (text: string): [string, string][] =>
  text
    .split('\n')
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((p) => p[0])
    .map((p) => [p[0], p[1] || '']);

/** A country being edited: cities as text, a stable key, the hours given to newly picked dates. */
type Draft = Country & { uid: string; citiesText: string; fresh?: boolean; newHours: { from: string; until: string } };
type Schedule = Omit<BookingSettings, 'countries'> & { countries: Draft[] };

let uidSeq = 0;
const toDraft = (c: Country, fresh = false): Draft => {
  const next = c.dates.find((d) => d.date >= todayISO());
  uidSeq += 1;
  return {
    ...c,
    uid: `country-${uidSeq}`,
    citiesText: citiesToText(c),
    fresh,
    newHours: next ? { from: next.from, until: next.until } : { from: '08:00', until: '24:00' },
  };
};

/* ------------------------------------------------------------ pieces */

function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <select className="rd-input rd-input--sm" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
      {TIMES.map((t) => (
        <option key={t} value={t}>
          {timeLabel(t)}
        </option>
      ))}
    </select>
  );
}

/** Opening – closing time, with a warning while they are in the wrong order. */
function HoursPicker({
  from,
  until,
  onChange,
}: {
  from: string;
  until: string;
  onChange: (patch: { from?: string; until?: string }) => void;
}) {
  return (
    <span className="sch-hours">
      <TimeSelect value={from} onChange={(v) => onChange({ from: v })} label="Opens at" />
      <span className="rd-muted">to</span>
      <TimeSelect value={until} onChange={(v) => onChange({ until: v })} label="Closes at" />
      {from >= until && <span className="sch-bad">Closing must be after opening</span>}
    </span>
  );
}

/**
 * A month to pick a country's booking dates: click a day to add or remove
 * it, Shift-click another day to add every day in between. Days that already
 * have appointments in this country get a dot.
 */
function DatesCalendar({
  picked,
  marked,
  onToggle,
  onAddRange,
}: {
  picked: Set<string>;
  marked: Set<string>;
  onToggle: (iso: string) => void;
  onAddRange: (a: string, b: string) => void;
}) {
  const today = todayISO();
  const [month, setMonth] = useState(() => {
    const next = Array.from(picked).filter((d) => d >= today).sort()[0];
    return (next || today).slice(0, 7);
  });
  const lastClicked = useRef<string | null>(null);

  const first = fromIso(`${month}-01`);
  const lead = (first.getDay() + 6) % 7; // weeks start on Monday
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  const shift = (n: number) => setMonth(toIso(new Date(first.getFullYear(), first.getMonth() + n, 1)).slice(0, 7));

  return (
    <div className="sch-cal">
      <div className="sch-cal__head">
        <button
          type="button"
          className="rd-btn rd-btn--quiet rd-btn--sm rd-btn--icon"
          onClick={() => shift(-1)}
          disabled={month <= today.slice(0, 7)}
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span>{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
        <button type="button" className="rd-btn rd-btn--quiet rd-btn--sm rd-btn--icon" onClick={() => shift(1)} aria-label="Next month">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="sch-cal__grid">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <span key={d} className="sch-cal__dow">
            {d}
          </span>
        ))}
        {cells.map((iso, i) =>
          iso === null ? (
            <span key={`lead-${i}`} />
          ) : (
            <button
              type="button"
              key={iso}
              className={[
                'sch-cal__day',
                picked.has(iso) ? 'is-on' : '',
                iso === today ? 'is-today' : '',
                marked.has(iso) ? 'has-dot' : '',
              ].join(' ')}
              disabled={iso < today}
              aria-pressed={picked.has(iso)}
              aria-label={`${longDate(iso)}${picked.has(iso) ? ' (open)' : ''}`}
              onClick={(e) => {
                if (e.shiftKey && lastClicked.current && lastClicked.current !== iso) onAddRange(lastClicked.current, iso);
                else onToggle(iso);
                lastClicked.current = iso;
              }}
            >
              {Number(iso.slice(8))}
            </button>
          )
        )}
      </div>
      <div className="sch-cal__legend">
        <span>
          <i />
          Open for booking
        </span>
        {marked.size > 0 && (
          <span>
            <i className="is-dot" />
            Has appointments
          </span>
        )}
      </div>
    </div>
  );
}

/** One appointment country: lock, booking days (weekly or its own dates), name / cities. */
function CountryCard({
  c,
  first,
  canRemove,
  marked,
  onChange,
  onRemove,
}: {
  c: Draft;
  first: boolean;
  canRemove: boolean;
  marked: Set<string>;
  onChange: (patch: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  const today = todayISO();
  const upcoming = c.dates.filter((d) => d.date >= today);
  const picked = useMemo(() => new Set(c.dates.map((d) => d.date)), [c.dates]);
  const cityCount = textToCities(c.citiesText).length;
  const label = c.name.trim() || 'this country';

  const withDates = (dates: CountryDate[]) => onChange({ dates: dates.sort((a, b) => a.date.localeCompare(b.date)) });
  const add = (isos: string[]) => {
    const extra = isos.filter((iso) => iso >= today && !picked.has(iso)).map((iso) => ({ date: iso, ...c.newHours }));
    if (extra.length) withDates([...c.dates, ...extra]);
  };
  const toggle = (iso: string) => (picked.has(iso) ? withDates(c.dates.filter((d) => d.date !== iso)) : add([iso]));
  const addRange = (a: string, b: string) => {
    const [from, to] = a < b ? [a, b] : [b, a];
    const list: string[] = [];
    for (const d = fromIso(from); toIso(d) <= to; d.setDate(d.getDate() + 1)) list.push(toIso(d));
    add(list);
  };
  const setDate = (iso: string, patch: Partial<CountryDate>) =>
    withDates(c.dates.map((d) => (d.date === iso ? { ...d, ...patch } : d)));

  const status = c.locked ? 'locked' : c.mode === 'dates' && upcoming.length === 0 ? 'none' : 'open';

  return (
    <section className={`rd-card sch-country ${c.locked ? 'is-locked' : ''}`}>
      <div className="rd-card__head">
        <div className="sch-country__title">
          <span className="sch-pin" aria-hidden="true">
            {c.locked ? <Lock size={18} strokeWidth={1.8} /> : <MapPin size={18} strokeWidth={1.8} />}
          </span>
          <div>
            <h3 className="rd-card__title">
              {c.name.trim() || 'New country'}
              {c.ar && (
                <span className="sch-country__ar">
                  {' · '}
                  <bdi dir="rtl">{c.ar}</bdi>
                </span>
              )}
            </h3>
            <p className="rd-card__sub">
              {c.timeZone} · {cityCount} {cityCount === 1 ? 'city' : 'cities'}
              {c.mode === 'dates' ? ` · ${upcoming.length} upcoming date${upcoming.length === 1 ? '' : 's'}` : ''}
            </p>
          </div>
        </div>
        <div className="rd-actions">
          {status === 'locked' ? (
            <span className="rd-badge rd-badge--danger">Locked</span>
          ) : status === 'none' ? (
            <span className="rd-badge rd-badge--warn">No upcoming dates</span>
          ) : (
            <span className="rd-badge rd-badge--success">Open for booking</span>
          )}
          <button
            type="button"
            className={`rd-btn rd-btn--sm ${c.locked ? 'rd-btn--primary' : 'rd-btn--ghost'}`}
            onClick={() => onChange({ locked: !c.locked })}
            aria-pressed={c.locked}
          >
            {c.locked ? (
              <>
                <LockOpen size={15} /> Unlock
              </>
            ) : (
              <>
                <Lock size={15} /> Lock
              </>
            )}
          </button>
        </div>
      </div>

      {c.locked && (
        <div className="rd-alert rd-alert--info">
          <Lock size={16} />
          <span>
            Clients can’t book {label} online. When they choose it, the website shows “Not available right now” with
            your phone ({SALON_PHONE}) and a WhatsApp button.
          </span>
        </div>
      )}

      <div className="sch-row">
        <span className="rd-label">Booking days</span>
        <div className="rd-seg" role="group" aria-label={`Booking days in ${label}`}>
          <button
            type="button"
            className={c.mode === 'weekly' ? 'is-on' : ''}
            aria-pressed={c.mode === 'weekly'}
            onClick={() => onChange({ mode: 'weekly' })}
          >
            Every open day
          </button>
          <button
            type="button"
            className={c.mode === 'dates' ? 'is-on' : ''}
            aria-pressed={c.mode === 'dates'}
            onClick={() => onChange({ mode: 'dates' })}
          >
            Only chosen dates
          </button>
        </div>
      </div>

      {c.mode === 'weekly' ? (
        <p className="rd-hint">
          Clients can book any open day of the weekly hours below (and the specific dates). Choose “Only chosen dates”
          to open {label} on certain days only.
        </p>
      ) : (
        <div className="sch-dates">
          <DatesCalendar picked={picked} marked={marked} onToggle={toggle} onAddRange={addRange} />
          <div>
            <div className="sch-new">
              <span className="rd-label">Hours for new dates</span>
              <HoursPicker
                from={c.newHours.from}
                until={c.newHours.until}
                onChange={(p) => onChange({ newHours: { ...c.newHours, ...p } })}
              />
              {upcoming.length > 1 && (
                <button
                  type="button"
                  className="rd-btn rd-btn--quiet rd-btn--sm"
                  onClick={() => withDates(c.dates.map((d) => (d.date >= today ? { ...d, ...c.newHours } : d)))}
                >
                  Apply to all dates
                </button>
              )}
            </div>
            {upcoming.length === 0 ? (
              <p className="rd-empty-note">
                No dates yet — click days in the calendar. Until there are, the website asks clients to contact you.
              </p>
            ) : (
              <ul className="sch-datelist">
                {upcoming.map((d) => (
                  <li key={d.date}>
                    <span className="sch-datelist__date">{longDate(d.date)}</span>
                    <HoursPicker from={d.from} until={d.until} onChange={(p) => setDate(d.date, p)} />
                    <button
                      type="button"
                      className="rd-btn rd-btn--quiet rd-btn--sm rd-btn--icon"
                      aria-label={`Remove ${longDate(d.date)}`}
                      title="Remove this date"
                      onClick={() => toggle(d.date)}
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="rd-hint">Click a day to open or close it · Shift-click a second day to add every day in between.</p>
          </div>
        </div>
      )}

      <details className="rd-details" open={c.fresh || undefined}>
        <summary>
          <ChevronRight size={15} /> Name, time zone &amp; cities
        </summary>
        <div className="rd-details__body rd-form">
          <div className="rd-grid">
            <label className="rd-field">
              <span className="rd-label">Name (English) *</span>
              <input className="rd-input" value={c.name} onChange={(e) => onChange({ name: e.target.value })} />
            </label>
            <label className="rd-field">
              <span className="rd-label">Name (Arabic)</span>
              <input dir="rtl" className="rd-input" value={c.ar} onChange={(e) => onChange({ ar: e.target.value })} />
            </label>
            <label className="rd-field">
              <span className="rd-label">
                Time zone <small>(for the 1-hour reminder)</small>
              </span>
              <select className="rd-input" value={c.timeZone} onChange={(e) => onChange({ timeZone: e.target.value })}>
                {Array.from(new Set([...TIME_ZONES, c.timeZone])).map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="rd-field">
            <span className="rd-label">
              Cities * <small>({cityCount}) — one per line, optionally “English | Arabic”</small>
            </span>
            <textarea
              className="rd-input sch-cities"
              rows={6}
              value={c.citiesText}
              onChange={(e) => onChange({ citiesText: e.target.value })}
            />
          </label>
          <div className="rd-actions" style={{ justifyContent: 'space-between' }}>
            <span className="rd-hint">{first ? 'First in the list on the website.' : ''}</span>
            <button type="button" className="rd-btn rd-btn--danger rd-btn--sm" disabled={!canRemove} onClick={onRemove}>
              <Trash2 size={15} /> Remove country
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}

/* -------------------------------------------------------------- page */

export default function BookingSchedulePage() {
  const [s, setS] = useState<Schedule | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [newDate, setNewDate] = useState('');
  const [orders, setOrders] = useState<any[] | null>(null);

  const load = (data: any) => {
    const n = normalizeSettings(data);
    setS({ ...n, countries: n.countries.map((c) => toDraft(c)) });
    setDirty(false);
  };

  useEffect(() => {
    fetch('/api/booking-settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then(load)
      .catch(() => load(null));
    fetch('/api/order')
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .catch(() => setOrders([]));
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const update = (fn: (prev: Schedule) => Schedule) => {
    setS((prev) => (prev ? fn(prev) : prev));
    setDirty(true);
  };

  const today = todayISO();
  const upcoming = useMemo(
    () =>
      (orders || [])
        .filter((o) => o.date >= today && o.status !== 'cancelled')
        .sort((a, b) => `${a.date} ${a.hour}`.localeCompare(`${b.date} ${b.hour}`)),
    [orders, today]
  );
  // Days with appointments, per country (dots in each country's calendar)
  const bookedDays = useMemo(() => {
    const out: Record<string, Set<string>> = {};
    upcoming.forEach((o) => {
      if (!out[o.country]) out[o.country] = new Set();
      out[o.country].add(o.date);
    });
    return out;
  }, [upcoming]);

  if (!s) {
    return (
      <div className="rd-page">
        <PageHeader title="Booking Schedule" subtitle="Loading…" />
      </div>
    );
  }

  const save = async () => {
    const countries = s.countries.map(({ uid, citiesText, fresh, newHours, ...c }) => ({
      ...c,
      cities: textToCities(citiesText),
      dates: c.dates.filter((d) => d.date >= today), // past dates are no use any more
    }));
    const empty = countries.find((c) => !c.name.trim() || c.cities.length === 0);
    if (empty) {
      return setMsg({
        text: `Every country needs a name and at least one city${empty.name.trim() ? ` (${empty.name.trim()})` : ''}.`,
        error: true,
      });
    }
    const badDay = countries
      .filter((c) => c.mode === 'dates')
      .flatMap((c) => c.dates.map((d) => ({ c, d })))
      .find(({ d }) => d.from >= d.until);
    if (badDay) {
      return setMsg({ text: `${badDay.c.name}, ${longDate(badDay.d.date)}: the closing time must be after the opening time.`, error: true });
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/booking-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekly: s.weekly, overrides: s.overrides, countries }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not save');
      load(json);
      setMsg({ text: 'Saved — the website uses the new schedule now.' });
    } catch (e: any) {
      setMsg({ text: e.message, error: true });
    } finally {
      setSaving(false);
    }
  };

  const addDate = () => {
    if (!newDate) return;
    if (s.overrides.some((o) => o.date === newDate)) return setMsg({ text: 'That date is already in the list.', error: true });
    const w = s.weekly[fromIso(newDate).getDay()];
    update((p) => ({
      ...p,
      overrides: [...p.overrides, { date: newDate, closed: false, from: w.from, until: w.until, note: '' }].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    }));
    setNewDate('');
    setMsg(null);
  };

  const setDay = (i: number, patch: any) =>
    update((p) => ({ ...p, weekly: p.weekly.map((w, k) => (k === i ? { ...w, ...patch } : w)) }));
  const setOverride = (date: string, patch: any) =>
    update((p) => ({ ...p, overrides: p.overrides.map((o) => (o.date === date ? { ...o, ...patch } : o)) }));
  const setCountry = (uid: string, patch: Partial<Draft>) =>
    update((p) => ({ ...p, countries: p.countries.map((c) => (c.uid === uid ? { ...c, ...patch } : c)) }));

  const pastOverrides = s.overrides.filter((o) => o.date < today).length;
  const todayHours = hoursFor(s, today);
  const lockedCount = s.countries.filter((c) => c.locked).length;

  return (
    <div className="rd-page">
      <PageHeader
        title="Booking Schedule"
        subtitle="Where and when clients can book on the website. A start time is offered every 30 minutes; a booked time disappears for everybody."
        actions={
          <>
            {dirty && (
              <button type="button" className="rd-btn rd-btn--ghost" onClick={() => window.location.reload()}>
                <RotateCcw size={16} /> Discard
              </button>
            )}
            <button type="button" className="rd-btn rd-btn--primary" disabled={saving || !dirty} onClick={save}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      />

      {msg && <div className={`rd-alert ${msg.error ? 'rd-alert--error' : 'rd-alert--success'}`}>{msg.text}</div>}

      {/* ---------------------------------------------------- countries */}
      <div className="rd-section">
        <span>
          Appointment countries · {s.countries.length}
          {lockedCount ? ` (${lockedCount} locked)` : ''}
        </span>
        <div className="rd-actions">
          <button
            type="button"
            className="rd-btn rd-btn--ghost rd-btn--sm"
            onClick={() => {
              if (!window.confirm('Go back to Lebanon, KSA and Kuwait with their default cities, open every day?')) return;
              update((p) => ({ ...p, countries: DEFAULT_COUNTRIES.map((c) => toDraft(c)) }));
            }}
          >
            <RotateCcw size={14} /> Reset to defaults
          </button>
          <button
            type="button"
            className="rd-btn rd-btn--ghost rd-btn--sm"
            onClick={() =>
              update((p) => ({
                ...p,
                countries: [...p.countries, toDraft({ name: '', ar: '', timeZone: 'Asia/Beirut', cities: [], ...bookable() }, true)],
              }))
            }
          >
            <Plus size={14} /> Add country
          </button>
        </div>
      </div>
      <p className="rd-hint" style={{ marginBottom: 12 }}>
        Clients pick one of these as the appointment country. Prices: Lebanon uses the normal rate, every other country
        the travelling rate (×4) with a 25% deposit.
      </p>

      {s.countries.map((c, i) => (
        <CountryCard
          key={c.uid}
          c={c}
          first={i === 0}
          canRemove={s.countries.length > 1}
          marked={bookedDays[c.name] || new Set()}
          onChange={(patch) => setCountry(c.uid, patch)}
          onRemove={() => {
            if (!window.confirm(`Remove ${c.name.trim() || 'this country'}? Clients will no longer be able to book it.`)) return;
            update((p) => ({ ...p, countries: p.countries.filter((x) => x.uid !== c.uid) }));
          }}
        />
      ))}

      {/* ---------------------------------------------------- weekly */}
      <div className="rd-section" id="weekly">
        <span>Weekly days &amp; hours</span>
        <button
          type="button"
          className="rd-btn rd-btn--ghost rd-btn--sm"
          onClick={() => update((p) => ({ ...p, weekly: DEFAULT_WEEKLY.map((w) => ({ ...w })) }))}
        >
          <RotateCcw size={14} /> Every day 08:00–24:00
        </button>
      </div>
      <p className="rd-hint" style={{ marginBottom: 12 }}>
        Used by the countries set to “Every open day”.
      </p>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <tbody>
            {s.weekly.map((w, i) => (
              <tr key={i}>
                <td className="sch-day">{WEEKDAYS[i]}</td>
                <td className="is-nowrap" style={{ width: 130 }}>
                  <label className="rd-switch">
                    <input type="checkbox" checked={w.open} onChange={(e) => setDay(i, { open: e.target.checked })} />
                    <span className="rd-switch__track" />
                    {w.open ? 'Open' : 'Closed'}
                  </label>
                </td>
                <td>
                  {w.open ? (
                    <HoursPicker from={w.from} until={w.until} onChange={(p) => setDay(i, p)} />
                  ) : (
                    <span className="rd-muted">No bookings</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------------------------------------- specific dates */}
      <div className="rd-section">
        <span>Specific dates</span>
        {pastOverrides > 0 && (
          <button
            type="button"
            className="rd-btn rd-btn--ghost rd-btn--sm"
            onClick={() => update((p) => ({ ...p, overrides: p.overrides.filter((o) => o.date >= today) }))}
          >
            <Trash2 size={14} /> Remove {pastOverrides} past date{pastOverrides > 1 ? 's' : ''}
          </button>
        )}
      </div>
      <div className="rd-card">
        <p className="rd-hint" style={{ marginBottom: 12 }}>
          Close a date (holiday, day off) or give it its own hours. It replaces the weekly hours of that day, for the
          countries set to “Every open day”. Today: {todayHours.length ? `${todayHours[0]} – last start ${todayHours[todayHours.length - 1]}` : 'closed'}.
        </p>
        <div className="sch-add-date" style={{ marginBottom: s.overrides.length ? 8 : 0 }}>
          <input
            type="date"
            min={today}
            className="rd-input"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            aria-label="Date"
          />
          <button type="button" className="rd-btn rd-btn--ghost" onClick={addDate} disabled={!newDate}>
            <Plus size={16} /> Add date
          </button>
        </div>
        {s.overrides.length > 0 && (
          <ul className="sch-datelist" style={{ maxHeight: 'none' }}>
            {s.overrides.map((o) => (
              <li key={o.date} style={{ opacity: o.date < today ? 0.5 : 1 }}>
                <span className="sch-datelist__date">{longDate(o.date)}</span>
                <select
                  className="rd-input rd-input--sm"
                  style={{ width: 'auto' }}
                  value={o.closed ? 'closed' : 'open'}
                  onChange={(e) => setOverride(o.date, { closed: e.target.value === 'closed' })}
                  aria-label="Open or closed"
                >
                  <option value="open">Open — custom hours</option>
                  <option value="closed">Closed all day</option>
                </select>
                {!o.closed && <HoursPicker from={o.from} until={o.until} onChange={(p) => setOverride(o.date, p)} />}
                <input
                  className="rd-input rd-input--sm"
                  style={{ width: 'auto', flex: '1 1 160px' }}
                  placeholder="Note (optional)"
                  value={o.note || ''}
                  onChange={(e) => setOverride(o.date, { note: e.target.value })}
                />
                <button
                  type="button"
                  className="rd-btn rd-btn--quiet rd-btn--sm rd-btn--icon"
                  aria-label={`Remove ${longDate(o.date)}`}
                  title="Remove this date"
                  onClick={() => update((p) => ({ ...p, overrides: p.overrides.filter((x) => x.date !== o.date) }))}
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------------------------------------------- upcoming */}
      <div className="rd-section">
        <span>Upcoming appointments · {orders === null ? '…' : upcoming.length}</span>
        <a href="/reservation" className="rd-btn rd-btn--ghost rd-btn--sm">
          <CalendarDays size={14} /> Open the calendar
        </a>
      </div>
      <div className="rd-table-wrap">
        <table className="rd-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Location</th>
              <th>Client</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {orders === null ? (
              <tr>
                <td colSpan={5} className="rd-empty">
                  Loading…
                </td>
              </tr>
            ) : upcoming.length === 0 ? (
              <tr>
                <td colSpan={5} className="rd-empty">
                  No upcoming appointments.
                </td>
              </tr>
            ) : (
              upcoming.map((o) => (
                <tr key={o.id}>
                  <td className="is-nowrap">{longDate(o.date)}</td>
                  <td>{o.hour}</td>
                  <td>
                    {o.city}
                    <span className="rd-cell-sub">{o.country}</span>
                  </td>
                  <td>
                    <span className="rd-cell-title">{o.name}</span>
                    {o.clientCountry ? <span className="rd-cell-sub">from {o.clientCountry}</span> : null}
                  </td>
                  <td className="is-muted">{o.reference || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
