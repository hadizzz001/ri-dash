"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COUNTRIES,
  LEBANON,
  OPEN_HOURS,
  SERVICE_TYPES,
  STAFF,
  STATUSES,
  computeTotals,
  defaultTaxPercent,
} from "../utils/appointments";
import { buildUpdateMessage, messageLang, whatsappLink } from "../utils/appointmentMessage";
import { Copy, MessageCircle, Send, X } from "lucide-react";
import { sendUpdateEmail } from "../api/sendEmail/sendUpdateEmail";

export type Service = { id: string; title: string; cat: string; price: number; duration: number | null };

export type Draft = {
  id?: string;
  reference?: string;
  name: string;
  phone: string;
  email: string;
  country: string;
  city: string;
  date: string;
  hour: string;
  serviceType: string;
  staff: string;
  status: string;
  paid: boolean;
  notes: string;
  taxPercent: number | string;
  discountPercent?: number | string;
  cart: { id?: string; title: string; cat?: string; price: number | string; qty: number | string; duration?: number | string | null }[];
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  lang?: string | null;
  clientCountry?: string | null;
};

const money = (n: any) => `$${(Number(n) || 0).toFixed(2)}`;
export const statusOf = (id?: string | null) =>
  STATUSES.find((s) => s.id === (id || "pending")) || STATUSES[0];

const prettyDate = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

type Props = {
  draft: Draft;
  isNew: boolean;
  services: Service[];
  orders?: any[];
  countries?: string[];
  globalTax: number;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (draft: Draft) => Promise<boolean | void> | void;
  onMarkPaid: (draft: Draft) => void;
  onDelete: (draft: Draft) => void;
};

/**
 * Fresha-style appointment drawer: every detail of the booking can be edited
 * (client, date & time, team member, place, salon/home, services and prices,
 * tax, notes, status, payment). Totals follow the website's rules live.
 */
export default function AppointmentDrawer({
  draft: initial,
  isNew,
  services,
  orders = [],
  countries = COUNTRIES,
  globalTax,
  saving,
  error,
  onClose,
  onSave,
  onMarkPaid,
  onDelete,
}: Props) {
  const [d, setD] = useState<Draft>(initial);
  const [pick, setPick] = useState("");
  const [svcQuery, setSvcQuery] = useState("");
  const [svcOpen, setSvcOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgLang, setMsgLang] = useState<string>("en");
  const [msgText, setMsgText] = useState("");

  const openMessage = (lang = messageLang(d.lang)) => {
    setMsgLang(lang);
    setMsgText(buildUpdateMessage(d, lang));
    setMsgOpen(true);
    setMenu(false);
  };

  const [emailNote, setEmailNote] = useState("");

  const sendMessage = (alsoSave: boolean) => {
    window.open(whatsappLink(d.phone, msgText), "_blank", "noopener");
    // Every update sent on WhatsApp also goes to the client's email
    if (d.email) {
      sendUpdateEmail({ email: d.email, name: d.name, reference: d.reference, message: msgText, lang: msgLang })
        .then(() => setEmailNote(`Update emailed to ${d.email}`))
        .catch((e: any) => {
          console.error("Update email failed:", e);
          setEmailNote("WhatsApp opened, but the email could not be sent.");
        });
    }
    setMsgOpen(false);
    if (alsoSave) onSave(d);
  };

  // Saving an edited appointment also sends the full update on WhatsApp + email
  const saveAndNotify = async (target: Draft = d) => {
    const d = target;
    const ready =
      d.name.trim() && d.date && d.hour && d.country && d.city.trim() &&
      d.cart.some((c) => String(c.title || "").trim());
    const notify = !isNew && ready;
    // Open the WhatsApp tab now (inside the click, so it isn't blocked as a
    // popup) and only point it at WhatsApp once the save succeeded
    const win = notify && d.phone ? window.open("about:blank", "_blank") : null;
    const snapshot = d;
    const ok = await onSave(d);
    if (!notify || ok !== true) {
      win?.close();
      return;
    }
    const lang = messageLang(snapshot.lang);
    const text = buildUpdateMessage(snapshot, lang);
    if (win) win.location.href = whatsappLink(snapshot.phone, text);
    if (snapshot.email) {
      sendUpdateEmail({ email: snapshot.email, name: snapshot.name, reference: snapshot.reference, message: text, lang }).catch(
        (e: any) => console.error("Update email failed:", e)
      );
    }
  };

  useEffect(() => {
    setD(initial);
    setDirty(false);
  }, [initial]);

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (msgOpen) setMsgOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, msgOpen]);

  const set = (patch: Partial<Draft>) => {
    setD((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  // A new place re-applies the tax rule (Beirut is tax free)
  const setPlace = (patch: Partial<Draft>) => {
    setD((prev) => {
      const next = { ...prev, ...patch };
      next.taxPercent = defaultTaxPercent(next.country, next.city, globalTax);
      return next;
    });
    setDirty(true);
  };

  const cart = d.cart.map((c) => ({
    ...c,
    price: Number(c.price) || 0,
    qty: Math.max(1, Number(c.qty) || 1),
    duration: c.duration ? Number(c.duration) : null,
  }));
  const totals = computeTotals(cart as any, {
    country: d.country,
    city: d.city,
    serviceType: d.serviceType,
    taxPercent: Number(d.taxPercent) || 0,
    discountPercent: isNew ? 0 : Number(d.discountPercent) || 0,
  });
  const minutes = cart.reduce((a, c) => a + (Number(c.duration) || 0) * c.qty, 0);
  const st = statusOf(d.status);
  const rate = d.country && d.country !== LEBANON ? 4 : 1;

  const grouped = useMemo(() => {
    const q = svcQuery.trim().toLowerCase();
    const map = new Map<string, Service[]>();
    services
      .filter((s) => !q || s.title.toLowerCase().includes(q) || (s.cat || "").toLowerCase().includes(q))
      .forEach((s) => {
      const k = s.cat || "Other";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    });
    return Array.from(map.entries());
  }, [services, svcQuery]);

  const addService = (id: string) => {
    if (!id) return;
    if (id === "__custom") {
      set({ cart: [...d.cart, { title: "Custom service", price: 0, qty: 1, duration: 30 }] });
    } else {
      const s = services.find((x) => x.id === id);
      if (!s) return;
      set({
        cart: [
          ...d.cart,
          { id: s.id, title: s.title, cat: s.cat, price: Math.round(s.price * rate * 100) / 100, qty: 1, duration: s.duration },
        ],
      });
    }
    setPick("");
    setSvcQuery("");
    setSvcOpen(false);
  };

  const updateLine = (i: number, patch: any) =>
    set({ cart: d.cart.map((c, k) => (k === i ? { ...c, ...patch } : c)) });

  const removeLine = (i: number) => set({ cart: d.cart.filter((_, k) => k !== i) });

  // Times already taken that day by another live booking (same rule as the API)
  const taken = new Set(
    orders
      .filter((o) => o.date === d.date && o.id !== d.id && o.status !== "cancelled")
      .map((o) => o.hour)
  );
  const freeHours = OPEN_HOURS.filter((h) => !taken.has(h));
  const hours = !d.hour || freeHours.includes(d.hour) ? freeHours : [d.hour, ...freeHours];
  const hourTaken = !!d.hour && taken.has(d.hour);
  const initials = (d.name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const tryClose = () => {
    if (dirty && !window.confirm("Discard your changes?")) return;
    onClose();
  };

  return (
    <>
      <div className="fz-overlay" onClick={tryClose} />
      <aside className="fz-drawer" role="dialog" aria-modal="true" aria-label="Appointment">
        <div className="fz-dhead" style={{ background: isNew ? "#0d1619" : st.color }}>
          <div>
            <h2>{isNew ? "New appointment" : prettyDate(d.date)}</h2>
            <p>
              {d.hour || "--:--"}
              {d.reference ? ` · ${d.reference}` : ""}
            </p>
          </div>
          {!isNew && (
            <select
              className="fz-select"
              value={d.status || "pending"}
              onChange={(e) => set({ status: e.target.value })}
              aria-label="Status"
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="fz-close" onClick={tryClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="fz-dbody">
          {error && <div className="fz-alert">{error}</div>}
          {d.status === "cancelled" && d.cancelledAt && (
            <div className="fz-alert">
              Cancelled{d.cancelledBy === "client" ? " by the client" : d.cancelledBy === "salon" ? " by the salon" : ""} on{" "}
              {new Date(d.cancelledAt).toLocaleString()} — the time is free again on the website.
            </div>
          )}
          {d.paid && <div className="fz-alert fz-alert--info">Paid ✓</div>}
          {emailNote && <div className="fz-alert fz-alert--info">{emailNote}</div>}

          {/* Client */}
          <section className="fz-sec">
            <h3>Client</h3>
            <div className="fz-client" style={{ marginBottom: 14 }}>
              <span className="fz-avatar" style={{ background: "#ede9fe" }}>
                {initials}
              </span>
              <div>
                <b>{d.name || "New client"}</b>
                <small>{[d.phone, d.email].filter(Boolean).join(" · ") || "Add the client's details"}</small>
                {d.clientCountry && <small>Lives in {d.clientCountry}</small>}
              </div>
            </div>
            <div className="fz-field">
              <label htmlFor="fz-name">Full name *</label>
              <input id="fz-name" value={d.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div className="fz-row">
              <div className="fz-field">
                <label htmlFor="fz-phone">Phone</label>
                <input id="fz-phone" inputMode="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
              </div>
              <div className="fz-field">
                <label htmlFor="fz-email">Email</label>
                <input id="fz-email" type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} />
              </div>
            </div>
          </section>

          {/* When & who */}
          <section className="fz-sec">
            <h3>Date, time & team member</h3>
            <div className="fz-row3">
              <div className="fz-field">
                <label htmlFor="fz-date">Date *</label>
                <input id="fz-date" type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} />
              </div>
              <div className="fz-field">
                <label htmlFor="fz-hour">Time *</label>
                <select id="fz-hour" value={d.hour} onChange={(e) => set({ hour: e.target.value })}>
                  <option value="">Choose…</option>
                  {hours.map((h) => (
                    <option key={h} value={h}>
                      {h}
                      {h === d.hour && hourTaken ? " (already booked)" : ""}
                    </option>
                  ))}
                </select>
                {freeHours.length === 0 && (
                  <small style={{ color: "#dc2626" }}>No free times on this day.</small>
                )}
              </div>
              <div className="fz-field">
                <label htmlFor="fz-staff">Team member</label>
                <select id="fz-staff" value={d.staff || ""} onChange={(e) => set({ staff: e.target.value })}>
                  <option value="">Unassigned</option>
                  {STAFF.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Where */}
          <section className="fz-sec">
            <h3>Location</h3>
            <div className="fz-row">
              <div className="fz-field">
                <label htmlFor="fz-country">Country *</label>
                <select id="fz-country" value={d.country} onChange={(e) => setPlace({ country: e.target.value })}>
                  <option value="">Choose…</option>
                  {Array.from(new Set([...countries, d.country].filter(Boolean))).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fz-field">
                <label htmlFor="fz-city">City *</label>
                <input id="fz-city" value={d.city} onChange={(e) => setPlace({ city: e.target.value })} />
              </div>
            </div>
            <div className="fz-field" style={{ marginBottom: 0 }}>
              <label>Service type</label>
              <div className="fz-chips">
                {SERVICE_TYPES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className={`fz-chip ${d.serviceType === s.id ? "is-on" : ""}`}
                    onClick={() => set({ serviceType: s.id })}
                  >
                    {s.name}
                    {s.id === "home" && d.country === LEBANON ? " (×2)" : ""}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Services */}
          <section className="fz-sec">
            <h3>Services</h3>
            {d.cart.length > 0 && (
              <div className="fz-svc-head">
                <span>Service</span>
                <span>Price $</span>
                <span>Qty</span>
                <span>Min</span>
                <span />
              </div>
            )}
            {d.cart.map((c, i) => (
              <div className="fz-svc" key={i}>
                <input value={c.title} onChange={(e) => updateLine(i, { title: e.target.value })} aria-label="Service name" />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={c.price}
                  onChange={(e) => updateLine(i, { price: e.target.value })}
                  aria-label="Price"
                />
                <input
                  type="number"
                  min={1}
                  value={c.qty}
                  onChange={(e) => updateLine(i, { qty: e.target.value })}
                  aria-label="Quantity"
                />
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={c.duration ?? ""}
                  onChange={(e) => updateLine(i, { duration: e.target.value })}
                  aria-label="Duration in minutes"
                />
                <button type="button" className="fz-x" onClick={() => removeLine(i)} aria-label="Remove service">
                  ×
                </button>
              </div>
            ))}
            <div className="fz-field fz-svcpick" style={{ marginTop: 6 }}>
              <input
                type="search"
                value={svcQuery}
                placeholder="🔍 Search a service to add…"
                aria-label="Search a service to add"
                onFocus={() => setSvcOpen(true)}
                onBlur={() => window.setTimeout(() => setSvcOpen(false), 150)}
                onChange={(e) => {
                  setSvcQuery(e.target.value);
                  setSvcOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const first = grouped[0]?.[1]?.[0];
                    if (first) addService(first.id);
                  } else if (e.key === "Escape") {
                    e.stopPropagation();
                    setSvcOpen(false);
                  }
                }}
              />
              {svcOpen && (
                <div className="fz-svcpick-list" onMouseDown={(e) => e.preventDefault()}>
                  {grouped.length === 0 && <div className="fz-svcpick-empty">No service matches “{svcQuery}”</div>}
                  {grouped.map(([cat, list]) => (
                    <div key={cat}>
                      <div className="fz-svcpick-cat">{cat}</div>
                      {list.map((s) => (
                        <button type="button" key={s.id} onClick={() => addService(s.id)}>
                          <span>{s.title}</span>
                          <small>
                            {s.duration ? `${s.duration} min · ` : ""}
                            {money(s.price * rate)}
                          </small>
                        </button>
                      ))}
                    </div>
                  ))}
                  <button type="button" className="fz-svcpick-custom" onClick={() => addService("__custom")}>
                    + Custom service
                  </button>
                </div>
              )}
            </div>
            {rate > 1 && (
              <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                Services added outside Lebanon use the travelling rate (×4).
              </p>
            )}
          </section>

          {/* Notes */}
          <section className="fz-sec">
            <h3>Notes</h3>
            <div className="fz-field" style={{ marginBottom: 0 }}>
              <textarea
                value={d.notes}
                placeholder="Notes visible to the team"
                onChange={(e) => set({ notes: e.target.value })}
              />
            </div>
          </section>

          {/* Totals */}
          <section className="fz-sec" style={{ borderBottom: 0 }}>
            <h3>Payment</h3>
            <div className="fz-row">
              <div className="fz-field">
                <label htmlFor="fz-tax">Tax %</label>
                <input
                  id="fz-tax"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={d.taxPercent}
                  onChange={(e) => set({ taxPercent: e.target.value })}
                />
              </div>
              <div className="fz-field">
                <label>Payment status</label>
                <div className="fz-chips">
                  <button type="button" className={`fz-chip ${!d.paid ? "is-on" : ""}`} onClick={() => set({ paid: false })}>
                    Unpaid
                  </button>
                  <button type="button" className={`fz-chip ${d.paid ? "is-on" : ""}`} onClick={() => set({ paid: true })}>
                    Paid
                  </button>
                </div>
              </div>
            </div>
            {d.country === LEBANON && d.city.trim().toLowerCase() === "beirut" && (
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: -4 }}>Beirut is tax free.</p>
            )}
            {!isNew && (
              <div className="fz-field">
                <label htmlFor="fz-discount">Discount (%)</label>
                <input
                  id="fz-discount"
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  placeholder="0"
                  value={d.discountPercent ?? ""}
                  onChange={(e) => set({ discountPercent: e.target.value })}
                />
              </div>
            )}
            <div className="fz-sum">
              <div>
                <span>Subtotal</span>
                <span>{money(totals.subtotal)}</span>
              </div>
              {totals.homeFee > 0 && (
                <div>
                  <span>Home service (×2)</span>
                  <span>{money(totals.homeFee)}</span>
                </div>
              )}
              {totals.discount > 0 && (
                <div style={{ color: "#16a34a" }}>
                  <span>Discount ({totals.discountPercent}%)</span>
                  <span>-{money(totals.discount)}</span>
                </div>
              )}
              {totals.tax > 0 && (
                <div>
                  <span>Tax ({totals.taxPercent}%)</span>
                  <span>{money(totals.tax)}</span>
                </div>
              )}
              <div className="fz-sum-total">
                <span>Total</span>
                <span>{money(totals.total)}</span>
              </div>
              {totals.deposit > 0 && (
                <div style={{ color: "#6b7280" }}>
                  <span>Deposit to confirm (25%)</span>
                  <span>{money(totals.deposit)}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="fz-dfoot">
          <div className="fz-total">
            <small>Total</small>
            <b>{money(totals.total)}</b>
          </div>

          {!isNew && (
            <div className="fz-menu">
              <button type="button" className="fz-btn" onClick={() => setMenu((m) => !m)}>
                More ▾
              </button>
              {menu && (
                <div style={{ position: "fixed", inset: 0, zIndex: 1140 }} onClick={() => setMenu(false)} />
              )}
              {menu && (
                <div className="fz-menu-list" onMouseLeave={() => setMenu(false)}>
                  {!d.paid && (
                    <button type="button" onClick={() => (setMenu(false), onMarkPaid(d))}>
                      ✓ Mark as paid & email receipt
                    </button>
                  )}
                  {d.status !== "cancelled" ? (
                    <button type="button" onClick={() => (setMenu(false), saveAndNotify({ ...d, status: "cancelled" }))}>
                      Cancel appointment & notify client
                    </button>
                  ) : (
                    <button type="button" onClick={() => (setMenu(false), onSave({ ...d, status: "pending" }))}>
                      Restore appointment
                    </button>
                  )}
                  <button type="button" onClick={() => (setMenu(false), onSave({ ...d, status: "no-show" }))}>
                    Mark as no-show
                  </button>
                  {d.phone && (
                    <button type="button" onClick={() => openMessage()}>
                      <MessageCircle size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
                      Send booking details on WhatsApp
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ color: "#dc2626" }}
                    onClick={() => {
                      setMenu(false);
                      if (window.confirm("Delete this appointment for good? The time becomes free on the website.")) onDelete(d);
                    }}
                  >
                    Delete appointment
                  </button>
                </div>
              )}
            </div>
          )}

          {!isNew && d.phone && (
            <button type="button" className="fz-btn" onClick={() => openMessage()} title="Send the full booking details to the client">
              <MessageCircle size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />
              Message client
            </button>
          )}

          <button type="button" className="fz-btn fz-btn--dark" disabled={saving} onClick={() => saveAndNotify()} title={isNew ? undefined : "Saves and sends the update to the client on WhatsApp and email"}>
            {saving ? "Saving…" : isNew ? "Create appointment" : "Save & notify client"}
          </button>
        </div>
      </aside>

      {msgOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,.45)", display: "grid", placeItems: "center", padding: 16 }}
          onClick={() => setMsgOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Message the client"
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 14, width: "min(560px, 100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: "1px solid #eee" }}>
              <b style={{ flex: 1 }}>Send booking details to {d.name || "client"}</b>
              <div className="fz-chips">
                {[
                  ["en", "EN"],
                  ["ar", "عربي"],
                  ["fr", "FR"],
                ].map(([code, label]) => (
                  <button
                    type="button"
                    key={code}
                    className={`fz-chip ${msgLang === code ? "is-on" : ""}`}
                    onClick={() => openMessage(code as any)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button type="button" className="fz-x" onClick={() => setMsgOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 18, overflow: "auto" }}>
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 0 }}>
                To {d.phone}{d.email ? ` · also emailed to ${d.email}` : ""}. You can edit the text before sending.
              </p>
              <textarea
                value={msgText}
                dir={msgLang === "ar" ? "rtl" : "ltr"}
                onChange={(e) => setMsgText(e.target.value)}
                style={{ width: "100%", minHeight: 340, fontFamily: "inherit", fontSize: 14, lineHeight: 1.5, padding: 12, border: "1px solid #e5e7eb", borderRadius: 10, whiteSpace: "pre-wrap" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap", padding: "12px 18px", borderTop: "1px solid #eee" }}>
              <button type="button" className="fz-btn" onClick={() => navigator.clipboard?.writeText(msgText)}>
                <Copy size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} />
                Copy
              </button>
              {dirty ? (
                <button type="button" className="fz-btn fz-btn--dark" disabled={saving} onClick={() => sendMessage(true)}>
                  <Send size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} />
                  Save changes & send on WhatsApp
                </button>
              ) : (
                <button type="button" className="fz-btn fz-btn--dark" onClick={() => sendMessage(false)}>
                  <Send size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} />
                  Send on WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
