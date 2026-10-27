"use client";

/**
 * Appointments calendar — laid out like Fresha's partner calendar:
 * toolbar (Today, ‹ ›, date picker, team / status filters, search, Day /
 * Week / List views, Add), team-member columns over a time grid with the
 * current-time line, colour-coded appointment blocks (drag to move them),
 * click an empty slot to book, click a block to open the full editor drawer.
 *
 * Team members are the website's first booking step: "Hijab" or
 * "No preference" (Order.staff). Bookings made before that are "Unassigned".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./calendar.css";
import AppointmentDrawer, { Draft, Service, statusOf } from "./AppointmentDrawer";
import { sendEmail } from "../api/sendEmail/sendEmail";
import {
  OPEN_FROM,
  OPEN_UNTIL,
  STAFF,
  STATUSES,
  UNASSIGNED,
  cartMinutes,
  defaultTaxPercent,
} from "../utils/appointments";

/* ------------------------------------------------------------- helpers */

const HOUR_PX = 96; // keep in sync with --fz-hour in calendar.css
const SNAP = 15; // minutes
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (iso: string, n: number) => {
  const d = fromIso(iso);
  d.setDate(d.getDate() + n);
  return toIso(d);
};
const weekStart = (iso: string) => {
  const d = fromIso(iso);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return toIso(d);
};
const toMin = (h?: string | null) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(h || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
const fromMin = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => fromIso(iso).toLocaleDateString("en-GB", opts);
const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";

const staffOf = (o: any) => STAFF.find((s) => s.id === o.staff) || UNASSIGNED;
const isCancelled = (o: any) => o.status === "cancelled";

/** Tinted background for a block, from its team member's colour. */
const tint = (hex: string, alpha = 0.28) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/** Side-by-side lanes for overlapping appointments in one column. */
function layoutLanes(items: { id: string; start: number; end: number }[]) {
  const out: Record<string, { lane: number; lanes: number }> = {};
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  let cluster: typeof sorted = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    cluster.forEach((c) => (out[c.id].lanes = laneEnds.length));
    cluster = [];
    laneEnds = [];
  };
  sorted.forEach((it) => {
    if (it.start >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= it.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.end);
    } else laneEnds[lane] = it.end;
    out[it.id] = { lane, lanes: 1 };
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  });
  flush();
  return out;
}

type Col = { key: string; date: string; staff: string | null; title: string; sub: string; color: string; today?: boolean };

const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/* ----------------------------------------------------------- mini calendar */

function MiniCalendar({ value, onPick, marked }: { value: string; onPick: (iso: string) => void; marked: Set<string> }) {
  const [month, setMonth] = useState(() => value.slice(0, 7));
  const first = fromIso(`${month}-01`);
  const start = weekStart(toIso(first));
  const today = toIso(new Date());
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const shift = (n: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + n, 1);
    setMonth(toIso(d).slice(0, 7));
  };

  return (
    <div>
      <div className="fz-mcal-head">
        <button type="button" className="fz-btn fz-btn--icon fz-btn--sm" onClick={() => shift(-1)} aria-label="Previous month">
          <Icon d="M15 18l-6-6 6-6" />
        </button>
        <span>{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
        <button type="button" className="fz-btn fz-btn--icon fz-btn--sm" onClick={() => shift(1)} aria-label="Next month">
          <Icon d="M9 18l6-6-6-6" />
        </button>
      </div>
      <div className="fz-mcal-grid">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
          <div key={d} className="fz-mcal-dow">
            {d}
          </div>
        ))}
        {days.map((iso) => (
          <button
            type="button"
            key={iso}
            onClick={() => onPick(iso)}
            className={[
              "fz-mcal-day",
              iso.slice(0, 7) !== month ? "is-out" : "",
              iso === today ? "is-today" : "",
              iso === value ? "is-on" : "",
              marked.has(iso) ? "has-dot" : "",
            ].join(" ")}
          >
            {Number(iso.slice(8))}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

export default function AppointmentsCalendar() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [globalTax, setGlobalTax] = useState(0);

  const [view, setView] = useState<"day" | "week" | "list">("day");
  const [date, setDate] = useState(() => toIso(new Date()));
  const [staffFilter, setStaffFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [pop, setPop] = useState(false);

  const [listRange, setListRange] = useState<"upcoming" | "past" | "day" | "all">("upcoming");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  const [drawer, setDrawer] = useState<{ draft: Draft; isNew: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const [hover, setHover] = useState<{ key: string; min: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const bodyRef = useRef<HTMLDivElement>(null);

  const flash = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  /* ------------------------------------------------------------ data */

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/order", { cache: "no-store" });
      if (res.ok) setOrders(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetch("/api/appointment-services")
      .then((r) => r.json())
      .then((j) => setServices(Array.isArray(j) ? j : []))
      .catch(() => setServices([]));
    fetch("/api/tax")
      .then((r) => r.json())
      .then((j) => setGlobalTax(Number(j?.percent) || 0))
      .catch(() => setGlobalTax(0));

    // New website bookings show up on their own; the red line moves
    const poll = window.setInterval(load, 60_000);
    const tick = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [load]);

  // Open on the current time (or the opening hour)
  useEffect(() => {
    if (!bodyRef.current || view === "list") return;
    const m = now.getHours() * 60 + now.getMinutes();
    const target = Math.max(0, ((Math.max(m, OPEN_FROM * 60) - OPEN_FROM * 60) / 60) * HOUR_PX - 140);
    bodyRef.current.scrollTop = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  /* --------------------------------------------------------- filters */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (staffFilter !== "all" && staffOf(o).id !== staffFilter) return false;
      if (statusFilter === "active" && isCancelled(o)) return false;
      if (statusFilter === "unpaid" && (o.paid || isCancelled(o))) return false;
      if (!["all", "active", "unpaid"].includes(statusFilter) && (o.status || "pending") !== statusFilter) return false;
      if (!q) return true;
      return [o.name, o.phone, o.email, o.reference, o.city]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q));
    });
  }, [orders, search, staffFilter, statusFilter]);

  const markedDays = useMemo(() => new Set(orders.filter((o) => !isCancelled(o)).map((o) => o.date)), [orders]);

  /* --------------------------------------------------------- columns */

  const today = toIso(now);
  const columns: Col[] = useMemo(() => {
    if (view === "week") {
      const start = weekStart(date);
      return Array.from({ length: 7 }, (_, i) => {
        const d = addDays(start, i);
        const count = filtered.filter((o) => o.date === d).length;
        return {
          key: d,
          date: d,
          staff: null,
          title: fmt(d, { weekday: "short" }),
          sub: `${count} appt${count === 1 ? "" : "s"}`,
          color: "#ede9fe",
          today: d === today,
        };
      });
    }
    const dayOrders = filtered.filter((o) => o.date === date);
    const team = [
      ...STAFF,
      ...(dayOrders.some((o) => staffOf(o).id === UNASSIGNED.id) || staffFilter === UNASSIGNED.id ? [UNASSIGNED] : []),
    ].filter((s) => staffFilter === "all" || s.id === staffFilter);
    return team.map((s) => {
      const count = dayOrders.filter((o) => staffOf(o).id === s.id).length;
      return {
        key: s.id,
        date,
        staff: s.id,
        title: s.name,
        sub: `${count} appointment${count === 1 ? "" : "s"}`,
        color: s.color,
      };
    });
  }, [view, date, filtered, staffFilter, today]);

  const eventsFor = (col: Col) =>
    filtered.filter((o) => o.date === col.date && (col.staff === null || staffOf(o).id === col.staff));

  /* --------------------------------------------------------- drawer */

  const newDraft = (patch: Partial<Draft> = {}): Draft => ({
    name: "",
    phone: "",
    email: "",
    country: "Lebanon",
    city: "Beirut",
    date,
    hour: "10:00",
    serviceType: "salon",
    staff: "",
    status: "confirmed",
    paid: false,
    notes: "",
    taxPercent: defaultTaxPercent("Lebanon", "Beirut", globalTax),
    cart: [],
    ...patch,
  });

  const openOrder = (o: any) => {
    setDrawerError("");
    setDrawer({
      isNew: false,
      draft: {
        id: o.id,
        reference: o.reference || "",
        name: o.name || "",
        phone: o.phone || "",
        email: o.email || "",
        country: o.country || "",
        city: o.city || "",
        date: o.date || "",
        hour: o.hour || "",
        serviceType: o.serviceType || "salon",
        staff: o.staff || "",
        status: o.status || "pending",
        paid: !!o.paid,
        notes: o.notes || "",
        taxPercent: o.taxPercent != null ? Number(o.taxPercent) || 0 : 0,
        cart: Array.isArray(o.cart) ? o.cart.map((c: any) => ({ ...c })) : [],
        cancelledAt: o.cancelledAt || null,
        cancelledBy: o.cancelledBy || null,
        lang: o.lang || null,
      },
    });
  };

  const openNew = (patch: Partial<Draft> = {}) => {
    setDrawerError("");
    setDrawer({ isNew: true, draft: newDraft(patch) });
  };

  const upsert = (o: any) =>
    setOrders((prev) => (prev.some((x) => x.id === o.id) ? prev.map((x) => (x.id === o.id ? o : x)) : [o, ...prev]));

  /** PATCH/POST with a "time already taken — save anyway?" step. */
  const send = async (url: string, method: string, body: any): Promise<any | null> => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (res.status === 409 && !body.force) {
      if (window.confirm(`${json.error}\n\nSave anyway (double booking)?`)) return send(url, method, { ...body, force: true });
      throw new Error("Not saved — that time is already booked.");
    }
    if (!res.ok) throw new Error(json.error || "Could not save the appointment");
    return json;
  };

  const save = async (d: Draft) => {
    if (!d.name.trim()) return setDrawerError("Please enter the client's name.");
    if (!d.date || !d.hour) return setDrawerError("Please choose the date and start time.");
    if (!d.country || !d.city.trim()) return setDrawerError("Please choose the country and city.");
    const cart = d.cart
      .map((c) => ({ ...c, title: String(c.title || "").trim(), price: Number(c.price) || 0, qty: Math.max(1, Number(c.qty) || 1), duration: c.duration ? Number(c.duration) : null }))
      .filter((c) => c.title);
    if (!cart.length) return setDrawerError("Add at least one service.");

    const isNew = !d.id;
    setSaving(true);
    setDrawerError("");
    try {
      const saved = await send(isNew ? "/api/order" : `/api/order/${d.id}`, isNew ? "POST" : "PATCH", {
        name: d.name,
        phone: d.phone,
        email: d.email,
        country: d.country,
        city: d.city,
        date: d.date,
        hour: d.hour,
        serviceType: d.serviceType,
        staff: d.staff,
        status: d.status || "confirmed",
        paid: d.paid,
        notes: d.notes,
        taxPercent: Number(d.taxPercent) || 0,
        cart,
      });
      upsert(saved);
      setDrawer(null);
      flash(isNew ? "Appointment created" : d.status === "cancelled" ? "Appointment cancelled" : "Appointment saved");
      if (saved?.date && saved.date !== date && view !== "list") setDate(saved.date);
    } catch (e: any) {
      setDrawerError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (d: Draft) => {
    setSaving(true);
    try {
      const saved = await send(`/api/order/${d.id}`, "PATCH", { paid: true });
      upsert(saved);
      setDrawer(null);
      flash("Marked as paid");
      if (saved.email) {
        sendEmail({
          orderId: saved.reference || saved.id,
          name: saved.name,
          email: saved.email,
          total: saved.total,
          phone: saved.phone,
          cart: saved.cart,
          date: saved.date,
          hour: saved.hour,
          country: saved.country,
          city: saved.city,
        } as any).catch((e: any) => console.error("Receipt email failed:", e));
      }
    } catch (e: any) {
      setDrawerError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: Draft) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/order/${d.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete the appointment");
      setOrders((prev) => prev.filter((o) => o.id !== d.id));
      setDrawer(null);
      flash("Appointment deleted");
    } catch (e: any) {
      setDrawerError(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------ grid interaction */

  const minuteAt = (e: React.MouseEvent | React.DragEvent, el: HTMLElement) => {
    const y = e.clientY - el.getBoundingClientRect().top;
    const raw = OPEN_FROM * 60 + (y / HOUR_PX) * 60;
    const snapped = Math.floor(raw / SNAP) * SNAP;
    return Math.min(Math.max(snapped, OPEN_FROM * 60), OPEN_UNTIL * 60 - SNAP);
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>, col: Col) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    setHover(null);
    const o = orders.find((x) => x.id === id);
    if (!o) return;
    const hour = fromMin(minuteAt(e, e.currentTarget));
    const patch: any = { date: col.date, hour };
    if (col.staff !== null) patch.staff = col.staff === UNASSIGNED.id ? "" : col.staff;
    if (o.date === patch.date && o.hour === hour && (patch.staff === undefined || (o.staff || "") === patch.staff)) return;

    // Optimistic move, rolled back on failure
    upsert({ ...o, ...patch, staff: patch.staff ?? o.staff });
    try {
      const saved = await send(`/api/order/${o.id}`, "PATCH", patch);
      upsert(saved);
      flash(`Moved to ${fmt(saved.date, { weekday: "short", day: "numeric", month: "short" })} at ${saved.hour}`);
    } catch (err: any) {
      upsert(o);
      flash(err.message, true);
    }
  };

  /* --------------------------------------------------------- nav */

  const step = view === "week" ? 7 : 1;
  const label =
    view === "week"
      ? (() => {
          const s = weekStart(date);
          const e = addDays(s, 6);
          return `${fmt(s, { day: "numeric", month: "short" })} – ${fmt(e, { day: "numeric", month: "short", year: "numeric" })}`;
        })()
      : fmt(date, { weekday: "long", day: "numeric", month: "short", year: "numeric" });

  /* --------------------------------------------------------- list */

  const listRows = useMemo(() => {
    const rows = filtered.filter((o) =>
      listRange === "upcoming" ? o.date >= today : listRange === "past" ? o.date < today : listRange === "day" ? o.date === date : true
    );
    const key = (o: any) => `${o.date || ""} ${o.hour || ""}`;
    rows.sort((a, b) => (sortAsc ? key(a).localeCompare(key(b)) : key(b).localeCompare(key(a))));
    return rows;
  }, [filtered, listRange, today, date, sortAsc]);

  const PAGE = 25;
  const pageRows = listRows.slice(page * PAGE, page * PAGE + PAGE);
  useEffect(() => setPage(0), [listRange, search, staffFilter, statusFilter]);

  const stats = useMemo(() => {
    const live = listRows.filter((o) => !isCancelled(o));
    return {
      count: live.length,
      value: live.reduce((a, o) => a + (Number(o.total) || 0), 0),
      paid: live.filter((o) => o.paid).length,
      cancelled: listRows.length - live.length,
    };
  }, [listRows]);

  /* --------------------------------------------------------- render */

  const gridHeight = (OPEN_UNTIL - OPEN_FROM) * HOUR_PX;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMin - OPEN_FROM * 60) / 60) * HOUR_PX;
  const showNow = nowMin >= OPEN_FROM * 60 && nowMin < OPEN_UNTIL * 60;

  return (
    <div className="fz">
      {/* ---------------------------------------------------- toolbar */}
      <div className="fz-toolbar">
        <button type="button" className="fz-btn" onClick={() => setDate(toIso(new Date()))}>
          Today
        </button>
        <div className="fz-group">
          <button type="button" className="fz-btn fz-btn--icon" aria-label="Previous" onClick={() => setDate(addDays(date, -step))}>
            <Icon d="M15 18l-6-6 6-6" />
          </button>
          <button type="button" className="fz-btn fz-datebtn" onClick={() => setPop((p) => !p)} aria-expanded={pop}>
            {label}
          </button>
          <button type="button" className="fz-btn fz-btn--icon" aria-label="Next" onClick={() => setDate(addDays(date, step))}>
            <Icon d="M9 18l6-6-6-6" />
          </button>
        </div>
        {pop && (
          <div className="fz-pop" style={{ left: 96 }} onMouseLeave={() => setPop(false)}>
            <MiniCalendar
              value={date}
              marked={markedDays}
              onPick={(iso) => {
                setDate(iso);
                setPop(false);
              }}
            />
            <div className="fz-pop-quick">
              {[
                ["In 1 week", 7],
                ["In 2 weeks", 14],
                ["In 4 weeks", 28],
              ].map(([l, n]) => (
                <button
                  key={l as string}
                  type="button"
                  className="fz-btn fz-btn--sm"
                  onClick={() => {
                    setDate(addDays(toIso(new Date()), n as number));
                    setPop(false);
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        <select className="fz-select" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} aria-label="Team member">
          <option value="all">All team members</option>
          {STAFF.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={UNASSIGNED.id}>{UNASSIGNED.name}</option>
        </select>

        <select className="fz-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
          <option value="active">All except cancelled</option>
          <option value="all">All statuses</option>
          <option value="unpaid">Unpaid</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="fz-spacer" />

        <label className="fz-search">
          <Icon d="M21 21l-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" />
          <input
            className="fz-input"
            placeholder="Search client, phone, ref…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <div className="fz-seg" role="tablist" aria-label="View">
          {(["day", "week", "list"] as const).map((v) => (
            <button type="button" key={v} role="tab" aria-selected={view === v} className={view === v ? "is-on" : ""} onClick={() => setView(v)}>
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <button type="button" className="fz-btn fz-btn--icon" aria-label="Refresh" title="Refresh" onClick={load}>
          <Icon d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
        </button>

        <button type="button" className="fz-btn fz-btn--dark" onClick={() => openNew()}>
          Add <Icon d="M12 5v14M5 12h14" />
        </button>
      </div>

      {/* -------------------------------------------------------- body */}
      <div className="fz-body" ref={bodyRef}>
        {loading ? (
          <div className="fz-empty">Loading appointments…</div>
        ) : view === "list" ? (
          <div className="fz-list">
            <div className="fz-stats">
              <div className="fz-stat">
                <b>{stats.count}</b>
                <span>Appointments</span>
              </div>
              <div className="fz-stat">
                <b>{money(stats.value)}</b>
                <span>Total value</span>
              </div>
              <div className="fz-stat">
                <b>{stats.paid}</b>
                <span>Paid</span>
              </div>
              <div className="fz-stat">
                <b>{stats.cancelled}</b>
                <span>Cancelled</span>
              </div>
              <div className="fz-stat" style={{ display: "flex", alignItems: "center" }}>
                <select className="fz-select" value={listRange} onChange={(e) => setListRange(e.target.value as any)} aria-label="Range" style={{ width: "100%" }}>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                  <option value="day">{fmt(date, { day: "numeric", month: "short", year: "numeric" })} only</option>
                  <option value="all">All dates</option>
                </select>
              </div>
            </div>

            {listRows.length === 0 ? (
              <div className="fz-empty">No appointments match these filters.</div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table className="fz-table">
                    <thead>
                      <tr>
                        <th>Ref #</th>
                        <th>Client</th>
                        <th>Services</th>
                        <th className="is-sort" onClick={() => setSortAsc((s) => !s)}>
                          Scheduled {sortAsc ? "↑" : "↓"}
                        </th>
                        <th>Team member</th>
                        <th>Location</th>
                        <th>Price</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((o) => {
                        const st = statusOf(o.status);
                        const sf = staffOf(o);
                        return (
                          <tr key={o.id} onClick={() => openOrder(o)}>
                            <td style={{ fontWeight: 700, color: "#6950f3" }}>{o.reference || "—"}</td>
                            <td>
                              <div className="fz-client">
                                <span className="fz-avatar" style={{ background: tint(sf.color, 0.5) }}>
                                  {initials(o.name)}
                                </span>
                                <div>
                                  <b>{o.name}</b>
                                  <small>{o.phone}</small>
                                </div>
                              </div>
                            </td>
                            <td style={{ maxWidth: 260 }}>
                              {(o.cart || []).map((c: any) => c.title + (c.qty > 1 ? ` ×${c.qty}` : "")).join(", ")}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              {o.date ? fmt(o.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"}
                              <br />
                              <small style={{ color: "#6b7280" }}>{o.hour}</small>
                            </td>
                            <td>{sf.name}</td>
                            <td>
                              {o.city}
                              <br />
                              <small style={{ color: "#6b7280" }}>
                                {o.country}
                                {o.serviceType === "home" ? " · Home" : o.serviceType === "salon" ? " · Salon" : ""}
                              </small>
                            </td>
                            <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                              {money(o.total)}
                              {o.paid && (
                                <span className="fz-tag fz-tag--paid" style={{ marginLeft: 6 }}>
                                  Paid
                                </span>
                              )}
                            </td>
                            <td>
                              <span className="fz-status" style={{ color: st.color, background: tint(st.color, 0.12) }}>
                                {st.name}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="fz-pager">
                  <span>
                    {page * PAGE + 1}–{Math.min(listRows.length, (page + 1) * PAGE)} of {listRows.length}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="fz-btn fz-btn--sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </button>
                    <button
                      type="button"
                      className="fz-btn fz-btn--sm"
                      disabled={(page + 1) * PAGE >= listRows.length}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* column headers */}
            <div className="fz-head">
              <div className="fz-head-gutter" />
              {columns.map((c) => (
                <div key={c.key} className={`fz-head-col ${c.today ? "is-today" : ""}`}>
                  {view === "week" ? (
                    <>
                      <span className="fz-head-sub">{c.title}</span>
                      <span className="fz-daynum">{Number(c.date.slice(8))}</span>
                      <span className="fz-head-sub">{c.sub}</span>
                    </>
                  ) : (
                    <>
                      <span className="fz-avatar" style={{ background: c.color }}>
                        {initials(c.title)}
                      </span>
                      <span className="fz-head-name">{c.title}</span>
                      <span className="fz-head-sub">{c.sub}</span>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* time grid */}
            <div className="fz-grid" style={{ height: gridHeight }}>
              <div className="fz-gutter">
                {Array.from({ length: OPEN_UNTIL - OPEN_FROM }, (_, i) => (
                  <div className="fz-gutter-hour" key={i}>
                    <span>{pad(OPEN_FROM + i)}:00</span>
                  </div>
                ))}
                {showNow && (view === "week" ? columns.some((c) => c.date === today) : date === today) && (
                  <span className="fz-now-label" style={{ top: nowTop }}>
                    {fromMin(nowMin)}
                  </span>
                )}
              </div>

              {columns.map((col) => {
                const events = eventsFor(col);
                const lanes = layoutLanes(
                  events.map((o) => {
                    const start = toMin(o.hour) ?? OPEN_FROM * 60;
                    return { id: o.id, start, end: start + cartMinutes(o.cart) };
                  })
                );
                return (
                  <div
                    key={col.key}
                    className={`fz-col ${dragId && hover?.key === col.key ? "is-drop" : ""}`}
                    onMouseMove={(e) => setHover({ key: col.key, min: minuteAt(e, e.currentTarget) })}
                    onMouseLeave={() => setHover(null)}
                    onClick={(e) =>
                      openNew({
                        date: col.date,
                        hour: fromMin(Math.floor(minuteAt(e, e.currentTarget) / 30) * 30),
                        staff: col.staff && col.staff !== UNASSIGNED.id ? col.staff : "",
                      })
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHover({ key: col.key, min: minuteAt(e, e.currentTarget) });
                    }}
                    onDrop={(e) => onDrop(e, col)}
                  >
                    {hover?.key === col.key && (
                      <div className="fz-hover" style={{ top: ((hover.min - OPEN_FROM * 60) / 60) * HOUR_PX }}>
                        {fromMin(hover.min)}
                      </div>
                    )}

                    {showNow && col.date === today && <div className="fz-now" style={{ top: nowTop }} />}

                    {events.map((o) => {
                      const start = toMin(o.hour) ?? OPEN_FROM * 60;
                      const mins = cartMinutes(o.cart);
                      const top = Math.max(0, ((start - OPEN_FROM * 60) / 60) * HOUR_PX);
                      const height = Math.max(26, (mins / 60) * HOUR_PX - 2);
                      const { lane, lanes: n } = lanes[o.id] || { lane: 0, lanes: 1 };
                      const sf = staffOf(o);
                      const st = statusOf(o.status);
                      return (
                        <div
                          key={o.id}
                          className={`fz-appt ${isCancelled(o) ? "is-cancelled" : ""} ${dragId === o.id ? "is-dragging" : ""}`}
                          style={{
                            top,
                            height,
                            left: `calc(${(lane / n) * 100}% + 2px)`,
                            width: `calc(${100 / n}% - 4px)`,
                            background: tint(sf.color, 0.38),
                            borderLeftColor: st.color,
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", o.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDragId(o.id);
                          }}
                          onDragEnd={() => {
                            setDragId(null);
                            setHover(null);
                          }}
                          onMouseMove={(e) => {
                            e.stopPropagation();
                            if (hover) setHover(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openOrder(o);
                          }}
                          title={`${o.hour} ${o.name} — ${(o.cart || []).map((c: any) => c.title).join(", ")}`}
                        >
                          <div className="fz-appt-icons">
                            {o.paid && <span className="fz-tag fz-tag--paid">Paid</span>}
                            {o.serviceType === "home" && <span className="fz-tag">Home</span>}
                          </div>
                          <div className="fz-appt-time">{o.hour}</div>
                          <div className="fz-appt-name">{o.name}</div>
                          {height > 50 && (
                            <div className="fz-appt-svc">
                              {(o.cart || []).map((c: any) => c.title).join(", ")}
                            </div>
                          )}
                          {height > 76 && (
                            <div className="fz-appt-svc">
                              {view === "week" ? `${sf.name} · ` : ""}
                              {o.city} · {money(o.total)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {drawer && (
        <AppointmentDrawer
          draft={drawer.draft}
          isNew={drawer.isNew}
          services={services}
          globalTax={globalTax}
          saving={saving}
          error={drawerError}
          onClose={() => setDrawer(null)}
          onSave={save}
          onMarkPaid={markPaid}
          onDelete={remove}
        />
      )}

      {toast && <div className={`fz-toast ${toast.error ? "is-error" : ""}`}>{toast.text}</div>}
    </div>
  );
}
