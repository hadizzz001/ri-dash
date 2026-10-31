'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookingSettings,
  Country,
  DEFAULT_COUNTRIES,
  DEFAULT_WEEKLY,
  TIME_ZONES,
  WEEKDAYS,
  hoursFor,
  normalizeSettings,
} from '../utils/bookingSchedule';

/**
 * Booking Schedule: what the website lets clients book.
 *  - Weekly days & hours (every day 08:00–24:00 by default)
 *  - Specific dates: add a date and close it or give it its own hours
 *  - Appointment countries & their cities (Lebanon, KSA, Kuwait by default)
 * Saved in one go with "Save changes".
 */

const pad = (n: number) => String(n).padStart(2, '0');
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** 00:00 … 24:00 every 30 minutes */
const TIMES = Array.from({ length: 49 }, (_, i) => `${pad(Math.floor(i / 2))}:${i % 2 ? '30' : '00'}`);
const label = (t: string) => (t === '24:00' ? '24:00 (midnight)' : t);

const citiesToText = (c: Country) => c.cities.map(([en, ar]) => (ar ? `${en} | ${ar}` : en)).join('\n');
const textToCities = (text: string): [string, string][] =>
  text
    .split('\n')
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((p) => p[0])
    .map((p) => [p[0], p[1] || '']);

function TimeSelect({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select className="border rounded p-1" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {TIMES.map((t) => (
        <option key={t} value={t}>
          {label(t)}
        </option>
      ))}
    </select>
  );
}

export default function BookingSchedulePage() {
  const [s, setS] = useState<BookingSettings | null>(null);
  const [cityText, setCityText] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [newDate, setNewDate] = useState('');
  const [orders, setOrders] = useState<any[] | null>(null);

  const load = (data: any) => {
    const n = normalizeSettings(data);
    setS(n);
    setCityText(n.countries.map(citiesToText));
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

  const update = (fn: (prev: BookingSettings) => BookingSettings) => {
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

  if (!s) return <div className="p-6">Loading…</div>;

  const save = async () => {
    // cities come from the text boxes
    const payload = { ...s, countries: s.countries.map((c, i) => ({ ...c, cities: textToCities(cityText[i] || '') })) };
    const empty = payload.countries.find((c) => !c.name.trim() || c.cities.length === 0);
    if (empty) return setMsg({ text: `Every country needs a name and at least one city${empty.name ? ` (${empty.name})` : ''}.`, error: true });
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/booking-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    const [y, m, d] = newDate.split('-').map(Number);
    const w = s.weekly[new Date(y, m - 1, d).getDay()];
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
  const setCountry = (i: number, patch: Partial<Country>) =>
    update((p) => ({ ...p, countries: p.countries.map((c, k) => (k === i ? { ...c, ...patch } : c)) }));

  const card = 'border rounded-md p-4 mb-6 bg-white';
  const btn = 'px-3 py-1.5 rounded border text-sm font-semibold hover:bg-gray-50';
  const pastOverrides = s.overrides.filter((o) => o.date < today).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
        <h1 className="text-2xl font-bold">Booking Schedule</h1>
        <div className="flex gap-2">
          {dirty && (
            <button type="button" className={btn} onClick={() => window.location.reload()}>
              Discard
            </button>
          )}
          <button
            type="button"
            disabled={saving || !dirty}
            onClick={save}
            className="px-4 py-2 rounded bg-black !text-white font-semibold disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
      <p className="text-gray-600 mb-4">
        Choose the days, hours and countries clients can book on the website. A start time is offered every 30 minutes;
        a time already booked disappears for everybody.
      </p>
      {msg && (
        <div className={`mb-4 p-3 rounded ${msg.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg.text}</div>
      )}

      {/* ---------------------------------------------------- weekly */}
      <section className={card}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-bold">Weekly days & hours</h2>
          <button type="button" className={btn} onClick={() => update((p) => ({ ...p, weekly: DEFAULT_WEEKLY.map((w) => ({ ...w })) }))}>
            Reset: every day 08:00–24:00
          </button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {s.weekly.map((w, i) => (
              <tr key={i} className="border-t">
                <td className="py-2 font-semibold w-32">{WEEKDAYS[i]}</td>
                <td className="py-2 w-32">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={w.open} onChange={(e) => setDay(i, { open: e.target.checked })} />
                    {w.open ? 'Open' : 'Closed'}
                  </label>
                </td>
                <td className="py-2">
                  {w.open ? (
                    <span className="inline-flex items-center gap-2 flex-wrap">
                      From <TimeSelect value={w.from} onChange={(v) => setDay(i, { from: v })} />
                      to <TimeSelect value={w.until} onChange={(v) => setDay(i, { until: v })} />
                      {w.from >= w.until && <span className="text-red-600">Closing must be after opening</span>}
                    </span>
                  ) : (
                    <span className="text-gray-400">No bookings</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ---------------------------------------------- specific dates */}
      <section className={card}>
        <h2 className="text-lg font-bold mb-1">Specific dates</h2>
        <p className="text-gray-600 text-sm mb-3">
          Add a date to close it (holiday, day off) or give it its own hours. It replaces the weekly hours for that day only.
        </p>
        <div className="flex gap-2 items-center mb-4 flex-wrap">
          <input type="date" min={today} className="border rounded p-1.5" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button type="button" className={btn} onClick={addDate} disabled={!newDate}>
            + Add date
          </button>
          {pastOverrides > 0 && (
            <button
              type="button"
              className={`${btn} ml-auto`}
              onClick={() => update((p) => ({ ...p, overrides: p.overrides.filter((o) => o.date >= today) }))}
            >
              Remove {pastOverrides} past date{pastOverrides > 1 ? 's' : ''}
            </button>
          )}
        </div>
        {s.overrides.length === 0 ? (
          <p className="text-gray-400 text-sm">No specific dates — the weekly hours apply every day.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {s.overrides.map((o) => (
                <tr key={o.date} className={`border-t ${o.date < today ? 'opacity-50' : ''}`}>
                  <td className="py-2 font-semibold w-56">
                    {new Date(`${o.date}T00:00:00`).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-2 w-40">
                    <select className="border rounded p-1" value={o.closed ? 'closed' : 'open'} onChange={(e) => setOverride(o.date, { closed: e.target.value === 'closed' })}>
                      <option value="open">Open — custom hours</option>
                      <option value="closed">Closed all day</option>
                    </select>
                  </td>
                  <td className="py-2">
                    {!o.closed && (
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        <TimeSelect value={o.from} onChange={(v) => setOverride(o.date, { from: v })} />
                        to <TimeSelect value={o.until} onChange={(v) => setOverride(o.date, { until: v })} />
                        {o.from >= o.until && <span className="text-red-600">Closing must be after opening</span>}
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    <input
                      className="border rounded p-1 w-full"
                      placeholder="Note (optional)"
                      value={o.note || ''}
                      onChange={(e) => setOverride(o.date, { note: e.target.value })}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      className="text-red-600 px-2"
                      aria-label="Remove date"
                      onClick={() => update((p) => ({ ...p, overrides: p.overrides.filter((x) => x.date !== o.date) }))}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Today: {hoursFor(s, today).length ? `${hoursFor(s, today)[0]} – last start ${hoursFor(s, today).slice(-1)[0]}` : 'closed'}
        </p>
      </section>

      {/* ---------------------------------------------------- countries */}
      <section className={card}>
        <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
          <h2 className="text-lg font-bold">Appointment countries</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className={btn}
              onClick={() => {
                if (!window.confirm('Go back to Lebanon, KSA and Kuwait with their default cities?')) return;
                update((p) => ({ ...p, countries: DEFAULT_COUNTRIES }));
                setCityText(DEFAULT_COUNTRIES.map(citiesToText));
              }}
            >
              Reset to defaults
            </button>
            <button
              type="button"
              className={btn}
              onClick={() => {
                update((p) => ({ ...p, countries: [...p.countries, { name: '', ar: '', timeZone: 'Asia/Beirut', cities: [] }] }));
                setCityText((t) => [...t, '']);
              }}
            >
              + Add country
            </button>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-3">
          Clients pick one of these as the <b>appointment country</b>. Cities: one per line, optionally “English | Arabic”.
          Prices: Lebanon uses the normal rate, every other country the travelling rate (×4) with a 25% deposit.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {s.countries.map((c, i) => (
            <div key={i} className="border rounded p-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="text-xs text-gray-600">
                  Name (English) *
                  <input className="border rounded p-1.5 w-full text-sm" value={c.name} onChange={(e) => setCountry(i, { name: e.target.value })} />
                </label>
                <label className="text-xs text-gray-600">
                  Name (Arabic)
                  <input dir="rtl" className="border rounded p-1.5 w-full text-sm" value={c.ar} onChange={(e) => setCountry(i, { ar: e.target.value })} />
                </label>
              </div>
              <label className="text-xs text-gray-600 block mb-2">
                Time zone (for the 1-hour reminder)
                <select className="border rounded p-1.5 w-full text-sm" value={c.timeZone} onChange={(e) => setCountry(i, { timeZone: e.target.value })}>
                  {Array.from(new Set([...TIME_ZONES, c.timeZone])).map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-gray-600 block">
                Cities * ({textToCities(cityText[i] || '').length})
                <textarea
                  className="border rounded p-1.5 w-full text-sm font-mono"
                  rows={6}
                  value={cityText[i] || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCityText((t) => t.map((x, k) => (k === i ? v : x)));
                    setDirty(true);
                  }}
                />
              </label>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">{i === 0 ? 'First in the list' : ''}</span>
                <button
                  type="button"
                  className="text-red-600 text-sm"
                  disabled={s.countries.length <= 1}
                  onClick={() => {
                    if (!window.confirm(`Remove ${c.name || 'this country'}? Clients will no longer be able to book it.`)) return;
                    update((p) => ({ ...p, countries: p.countries.filter((_, k) => k !== i) }));
                    setCityText((t) => t.filter((_, k) => k !== i));
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- upcoming */}
      <h2 className="text-xl font-bold mb-2">Upcoming appointments</h2>
      <p className="text-gray-600 mb-3">
        Their times are taken. Details are on the <a href="/reservation" className="!text-blue-700 underline">Calendar</a>.
      </p>
      <table className="w-full border border-collapse border-gray-300 text-sm">
        <thead>
          <tr>
            <th className="border p-2">Date</th>
            <th className="border p-2">Time</th>
            <th className="border p-2">Location</th>
            <th className="border p-2">Client</th>
            <th className="border p-2">Reference</th>
          </tr>
        </thead>
        <tbody>
          {orders === null ? (
            <tr>
              <td colSpan={5} className="border p-2 text-center">Loading…</td>
            </tr>
          ) : upcoming.length === 0 ? (
            <tr>
              <td colSpan={5} className="border p-2 text-center">No upcoming appointments.</td>
            </tr>
          ) : (
            upcoming.map((o) => (
              <tr key={o.id}>
                <td className="border p-2">{new Date(`${o.date}T00:00:00`).toLocaleDateString()}</td>
                <td className="border p-2">{o.hour}</td>
                <td className="border p-2">
                  {o.city}, {o.country}
                </td>
                <td className="border p-2">
                  {o.name}
                  {o.clientCountry ? <small className="text-gray-500"> · from {o.clientCountry}</small> : null}
                </td>
                <td className="border p-2">{o.reference || '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
