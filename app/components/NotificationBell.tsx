"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, BellRing, CheckCheck, MonitorSmartphone, Volume2, VolumeX, X } from "lucide-react";
import { DEVICE_COOKIE } from "../constants";
import {
  AlertPermission,
  alertAbout,
  alertPermission,
  alertTurnedOn,
  askPermission,
  chime,
  closeRingAlerts,
  pageAudio,
  startRinging,
  unblockSteps,
} from "./notificationAlerts";
import { NotificationItem, daySection, describe, timeAgo } from "./notificationText";
import "./notifications.css";

const POLL_MS = 20 * 1000;
const PERMISSION_CHECK_MS = 2 * 1000;
const TOAST_MS = 9 * 1000;
const URGENT_TOAST_MS = 20 * 1000;
const RING_CARDS = 3;
const SOUND_KEY = "rd-notif-sound";
const DESKTOP_KEY = "rd-notif-desktop";
const ASK_LATER_KEY = "rd-notif-ask-later"; // "Not now" lasts until the dashboard is opened again
const WAKE_AUDIO_ON = ["click", "pointerup", "touchend", "keydown"];
const TABS = [
  { id: "all", label: "All" },
  { id: "client", label: "Clients" },
  { id: "admin", label: "Admin" },
] as const;

const readFlag = (key: string, fallback: boolean) => {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : saved === "1";
  } catch {
    return fallback;
  }
};
const saveFlag = (key: string, on: boolean) => {
  try {
    localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* blocked: it lasts until the page is reloaded */
  }
};

/** Gives this browser an id once, sent along with every change it makes (see notify.ts). */
const ensureDeviceCookie = () => {
  if (document.cookie.split("; ").some((c) => c.startsWith(`${DEVICE_COOKIE}=`))) return;
  const id = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  document.cookie = `${DEVICE_COOKIE}=${id}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=strict`;
};

/** Newest first, without doubles; the freshly loaded copy of a notification wins. */
const merge = (fresh: NotificationItem[], known: NotificationItem[]) => {
  const ids = new Set(fresh.map((n) => n.id));
  return [...fresh, ...known.filter((n) => !ids.has(n.id))].sort((a, b) => (a.id < b.id ? 1 : -1));
};

/**
 * The dashboard's bell, under the menu button on every page: what clients do on
 * the website and what the team does here. It looks for new ones every 20
 * seconds; those show as a pop-up (with a sound, and a desktop alert while the
 * tab is in the background, both optional), and in the tab's title.
 * Clicking one opens what it is about.
 *
 * An appointment a client booked keeps ringing, on every device with the
 * dashboard open, until someone opens it: from here or on the calendar.
 */
export default function NotificationBell({ menuOpen }: { menuOpen: boolean }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [ringing, setRinging] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [sound, setSound] = useState(true);
  const [audioLocked, setAudioLocked] = useState(false); // the page hasn't been clicked yet
  const [desktop, setDesktop] = useState(false);
  const [desktopNote, setDesktopNote] = useState("");
  const [permission, setPermission] = useState<AlertPermission>("unsupported");
  const [askLater, setAskLater] = useState(false);
  const [asking, setAsking] = useState<"no" | "waiting" | "steps">("no");
  const [justAllowed, setJustAllowed] = useState(false);

  const seen = useRef<Set<string> | null>(null); // ids already shown (null: nothing loaded yet)
  const firstPage = useRef(true); // "Show more" counts from the first load
  const settings = useRef({ sound: true, desktop: false });
  const panelOpen = useRef(false); // no pop-ups on top of the list that shows the same
  const handled = useRef(new Set<string>()); // read here: an answer already on its way can't bring them back
  const openedOrders = useRef(new Set<string>()); // appointments opened on this page
  const alerted = useRef(new Set<string>()); // ringing ones that already got a desktop alert from this tab
  const ringingNow = useRef<NotificationItem[]>([]);
  const otherTabs = useRef<BroadcastChannel | null>(null);
  const lastPermission = useRef<AlertPermission>("unsupported");
  const bellBtn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  ringingNow.current = ringing;

  const applyRead = useCallback((ids: string[]) => {
    const newly = ids.filter((id) => !handled.current.has(id));
    if (!newly.length) return;
    newly.forEach((id) => handled.current.add(id));
    setItems((list) => list.map((x) => (newly.includes(x.id) ? { ...x, read: true } : x)));
    setRinging((list) => list.filter((x) => !newly.includes(x.id)));
    setUnread((c) => Math.max(0, c - newly.length));
  }, []);

  const markRead = useCallback(
    (n: NotificationItem) => {
      if (n.read || handled.current.has(n.id)) return;
      applyRead([n.id]);
      otherTabs.current?.postMessage({ read: [n.id] });
      fetch("/api/notifications", {
        method: "PATCH",
        keepalive: true, // it may be sent just before the page changes
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      }).catch(() => {});
    },
    [applyRead]
  );

  /** Opens what a notification is about: on the calendar without leaving it. */
  const follow = useCallback(
    (n: NotificationItem) => {
      setToasts((list) => list.filter((x) => x.id !== n.id));
      const { href } = describe(n);
      if (window.location.pathname === "/reservation" && n.orderId && href.startsWith("/reservation?")) {
        setOpen(false);
        // A ringing one stops when it has really opened (rd:appointment-opened):
        // the calendar says no while another appointment is being edited
        if (!ringingNow.current.some((x) => x.id === n.id)) markRead(n);
        window.dispatchEvent(new CustomEvent("rd:open-appointment", { detail: n.orderId }));
      } else {
        markRead(n);
        window.location.href = href;
      }
    },
    [markRead]
  );

  const announce = useCallback(
    (fresh: NotificationItem[], ringGoingOn: boolean) => {
      if (!panelOpen.current) setToasts((list) => [...fresh, ...list].slice(0, 3));
      if (settings.current.sound && !ringGoingOn) chime();
      if (settings.current.desktop && document.hidden) {
        fresh.slice(0, 3).forEach((n) => alertAbout(n, false, () => follow(n)));
      }
    },
    [follow]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.status === 401) {
        setRinging([]);
        return setSignedOut(true);
      }
      if (!res.ok) return;
      setSignedOut(false);
      const data = await res.json();
      const page: NotificationItem[] = (data.items || []).map((n: NotificationItem) => (handled.current.has(n.id) ? { ...n, read: true } : n));
      const rings: NotificationItem[] = data.ringing || [];
      // Opened on the calendar before the bell knew about them
      rings.filter((n) => openedOrders.current.has(n.orderId as string)).forEach(markRead);
      const nowRinging = rings.filter((n) => !handled.current.has(n.id));
      setRinging(nowRinging);
      setUnread(data.unread || 0);
      setItems((known) => merge(page, known));
      if (firstPage.current) {
        firstPage.current = false;
        setHasMore(!!data.hasMore);
      }

      const known = seen.current;
      seen.current = new Set([...Array.from(known || []), ...page.map((n) => n.id)]);
      const fresh = known ? page.filter((n) => !known.has(n.id)) : [];
      if (fresh.length) {
        // The calendar shows them right away, whoever made them
        window.dispatchEvent(new Event("rd:notifications"));
        const ringIds = rings.map((n) => n.id);
        const once = fresh.filter((n) => !n.read && !ringIds.includes(n.id));
        if (once.length) announce(once, nowRinging.length > 0);
      }

      // Away from this window: an alert that stays on the screen too
      if (settings.current.desktop && (document.hidden || !document.hasFocus())) {
        nowRinging
          .filter((n) => !alerted.current.has(n.id))
          .slice(0, RING_CARDS)
          .forEach((n) => {
            alerted.current.add(n.id);
            alertAbout(n, true, () => follow(n));
          });
      }
    } catch {
      /* offline: the next round tries again */
    }
  }, [announce, follow, markRead]);

  useEffect(() => {
    ensureDeviceCookie();
    settings.current = { sound: readFlag(SOUND_KEY, true), desktop: alertPermission() === "granted" && readFlag(DESKTOP_KEY, true) };
    setSound(settings.current.sound);
    setDesktop(settings.current.desktop);
    try {
      setAskLater(!!sessionStorage.getItem(ASK_LATER_KEY));
    } catch {
      /* blocked: it asks on every page */
    }

    load();
    const timer = window.setInterval(load, POLL_MS);
    const onReturn = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [load]);

  // The tab's title shows the count while the admin is elsewhere, and which tab is ringing
  const isRinging = ringing.length > 0;
  useEffect(() => {
    const base = document.title.replace(/^(🔔 )?(\(\d+\+?\)\s*)?/, "");
    const count = unread > 0 ? `(${unread > 99 ? "99+" : unread}) ` : "";
    document.title = `${isRinging ? "🔔 " : ""}${count}${base}`;
  }, [unread, isRinging]);

  // Browsers keep a page silent until it has been clicked once
  useEffect(() => {
    const ctx = pageAudio();
    if (!ctx) return;
    const update = () => setAudioLocked(ctx.state !== "running");
    const wake = () => {
      if (ctx.state !== "running") ctx.resume().catch(() => {});
    };
    update();
    wake();
    ctx.addEventListener("statechange", update);
    WAKE_AUDIO_ON.forEach((e) => window.addEventListener(e, wake, true));
    document.addEventListener("visibilitychange", wake);
    return () => {
      ctx.removeEventListener("statechange", update);
      WAKE_AUDIO_ON.forEach((e) => window.removeEventListener(e, wake, true));
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  // Only a tab that can make a sound takes its turn to ring
  const soundsNow = isRinging && sound && !audioLocked;
  useEffect(() => (soundsNow ? startRinging() : undefined), [soundsNow]);

  // Opened on the calendar, however it got there: it stops ringing
  useEffect(() => {
    const onOpened = (e: Event) => {
      const orderId = (e as CustomEvent).detail;
      openedOrders.current.add(orderId);
      ringingNow.current.filter((n) => n.orderId === orderId).forEach(markRead);
    };
    window.addEventListener("rd:appointment-opened", onOpened);
    return () => window.removeEventListener("rd:appointment-opened", onOpened);
  }, [markRead]);

  // Opened in another tab: this one stops at once, not at its next look
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("rd-notif");
    channel.onmessage = (e) => applyRead(e.data?.read || []);
    otherTabs.current = channel;
    return () => {
      channel.close();
      otherTabs.current = null;
    };
  }, [applyRead]);

  // Sound or alerts switched in another tab
  useEffect(() => {
    const onChange = (e: StorageEvent) => {
      if (e.key === SOUND_KEY) {
        settings.current.sound = e.newValue !== "0";
        setSound(settings.current.sound);
      } else if (e.key === DESKTOP_KEY) {
        settings.current.desktop = e.newValue !== "0" && alertPermission() === "granted";
        setDesktop(settings.current.desktop);
      }
    };
    window.addEventListener("storage", onChange);
    return () => window.removeEventListener("storage", onChange);
  }, []);

  // A desktop alert was clicked (notify-sw.js)
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "rd:follow") follow(e.data.item);
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [follow]);

  // Ringing ones that were opened: their desktop alerts go too
  useEffect(() => {
    if (seen.current) closeRingAlerts(ringing.map((n) => n.id));
  }, [ringing]);

  // The block is lifted in the browser's own settings, so the page has to keep looking
  useEffect(() => {
    const check = () => setPermission(alertPermission());
    check();
    const timer = window.setInterval(check, PERMISSION_CHECK_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const was = lastPermission.current;
    lastPermission.current = permission;
    if (was === permission || was === "unsupported") return;
    if (permission === "granted") {
      settings.current.desktop = true;
      setDesktop(true);
      saveFlag(DESKTOP_KEY, true);
      setAsking("no");
      setJustAllowed(true);
      alertTurnedOn();
    } else {
      settings.current.desktop = false;
      setDesktop(false);
      if (was === "denied") setAsking("no"); // not blocked any more: the browser can ask
      else if (permission === "denied") setAsking((a) => (a === "waiting" ? "steps" : a));
    }
  }, [permission]);

  useEffect(() => {
    if (!justAllowed) return;
    const timer = window.setTimeout(() => setJustAllowed(false), URGENT_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [justAllowed]);

  // Pop-ups leave by themselves, the oldest first; the urgent ones stay longer
  useEffect(() => {
    if (!toasts.length) return;
    const last = toasts[toasts.length - 1];
    const timer = window.setTimeout(
      () => setToasts((list) => list.filter((x) => x.id !== last.id)),
      describe(last).tone === "urgent" ? URGENT_TOAST_MS : TOAST_MS
    );
    return () => window.clearTimeout(timer);
  }, [toasts]);

  useEffect(() => {
    panelOpen.current = open;
    if (!open) return;
    setToasts([]);
    load(); // what was just done on this device shows up right away
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        bellBtn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, load]);

  const markAllRead = () => {
    const ids = [...items, ...ringing].filter((n) => !n.read).map((n) => n.id);
    applyRead(ids);
    otherTabs.current?.postMessage({ read: ids });
    setUnread(0);
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  };

  const loadMore = async () => {
    const last = items[items.length - 1]?.id;
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/notifications?before=${last}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems((known) => merge(known, data.items || []));
        setHasMore(!!data.hasMore);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleSound = () => {
    const on = !sound;
    settings.current.sound = on;
    setSound(on);
    saveFlag(SOUND_KEY, on);
    if (on && !isRinging) pageAudio()?.resume().then(chime).catch(() => {});
  };

  /** The browser's own question; when it can't ask any more, what to click instead. */
  const allow = async () => {
    setAsking("waiting");
    const answer = await askPermission();
    setPermission(answer);
    setAsking(answer === "granted" ? "no" : "steps");
  };

  const notNow = () => {
    setAskLater(true);
    setAsking("no");
    try {
      sessionStorage.setItem(ASK_LATER_KEY, "1");
    } catch {
      /* blocked: it asks again on the next page */
    }
  };

  const toggleDesktop = () => {
    setDesktopNote("");
    if (!desktop && permission === "unsupported") return setDesktopNote("This browser has no desktop alerts.");
    if (!desktop && permission !== "granted") {
      // Its message says what to do, and the list would cover it
      setAskLater(false);
      setOpen(false);
      return void allow();
    }
    settings.current.desktop = !desktop;
    setDesktop(!desktop);
    saveFlag(DESKTOP_KEY, !desktop);
  };

  const shown = useMemo(() => {
    const ringIds = ringing.map((n) => n.id);
    const list = (tab === "all" ? items : items.filter((n) => n.actor === tab)).filter((n) => !ringIds.includes(n.id));
    const groups: { title: string; rows: NotificationItem[] }[] = [];
    if (ringing.length && tab !== "admin") groups.push({ title: "Ringing until opened", rows: ringing });
    list.forEach((n) => {
      const title = daySection(n.createdAt);
      const group = groups[groups.length - 1];
      if (group?.title === title) group.rows.push(n);
      else groups.push({ title, rows: [n] });
    });
    return groups;
  }, [items, ringing, tab]);

  const blocked = permission === "denied";
  const showAsk = (blocked || permission === "default") && !askLater;
  const BellIcon = isRinging ? BellRing : Bell;

  return (
    <>
      <button
        type="button"
        ref={bellBtn}
        className={`rd-bell ${menuOpen ? "is-menu" : ""} ${open ? "is-open" : ""} ${isRinging ? "is-ringing" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={isRinging ? `Notifications, ${ringing.length} new appointment${ringing.length === 1 ? "" : "s"} ringing` : unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Notifications"
      >
        <BellIcon size={18} />
        {unread > 0 && <span className="rd-bell__count">{unread > 99 ? "99+" : unread}</span>}
      </button>

      {open && (
        <>
          <div className="rd-notif-backdrop" onClick={() => setOpen(false)} />
          <div ref={panel} tabIndex={-1} className={`rd-notif ${menuOpen ? "is-menu" : ""}`} role="dialog" aria-label="Notifications">
            <div className="rd-notif__head">
              <h2>
                Notifications
                {unread > 0 && <span className="rd-notif__pill">{unread} new</span>}
              </h2>
              <button type="button" className="rd-notif__link" onClick={markAllRead} disabled={unread === 0}>
                <CheckCheck size={15} />
                Mark all as read
              </button>
            </div>

            <div className="rd-notif__tabs" role="tablist" aria-label="Who made them">
              {TABS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-on" : ""} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="rd-notif__scroll">
              {signedOut ? (
                <div className="rd-notif__empty">
                  <b>Please sign in again</b>
                  <p>Your session has ended, so notifications can&apos;t be shown.</p>
                  <a href="/" className="rd-notif__signin">
                    Sign in
                  </a>
                </div>
              ) : shown.length === 0 ? (
                <div className="rd-notif__empty">
                  <b>You&apos;re all caught up</b>
                  <p>New bookings, cancellations, orders and the team&apos;s changes will show up here.</p>
                </div>
              ) : (
                shown.map((group) => (
                  <section key={group.title}>
                    <h3 className="rd-notif__day">{group.title}</h3>
                    <ul>
                      {group.rows.map((n) => {
                        const { title, body, icon, tone } = describe(n);
                        const rings = ringing.some((x) => x.id === n.id);
                        const Icon = rings ? BellRing : icon;
                        return (
                          <li key={n.id}>
                            <button type="button" className={`rd-notif__row is-${tone} ${n.read ? "" : "is-unread"} ${rings ? "is-ringing" : ""}`} onClick={() => follow(n)}>
                              <span className="rd-notif__icon">
                                <Icon size={17} />
                              </span>
                              <span className="rd-notif__text">
                                <b>{title}</b>
                                <span>{body}</span>
                                <small>
                                  {timeAgo(n.createdAt)} ·{" "}
                                  <span className={`rd-notif__actor is-${n.actor}`}>{n.actor === "client" ? "Client" : n.mine ? "You" : "Admin"}</span>
                                </small>
                              </span>
                              {!n.read && <span className="rd-notif__dot" aria-label="Unread" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
              {hasMore && !signedOut && (
                <button type="button" className="rd-notif__more" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? "Loading…" : "Show more"}
                </button>
              )}
            </div>

            <div className="rd-notif__foot">
              <button type="button" className="rd-notif__link" onClick={toggleSound} aria-pressed={sound}>
                {sound ? <Volume2 size={15} /> : <VolumeX size={15} />}
                Sound {sound ? "on" : "off"}
              </button>
              <button type="button" className="rd-notif__link" onClick={toggleDesktop} aria-pressed={desktop}>
                <MonitorSmartphone size={15} />
                Desktop alerts {desktop ? "on" : "off"}
              </button>
            </div>
            {desktopNote && <p className="rd-notif__note">{desktopNote}</p>}
          </div>
        </>
      )}

      <div className={`rd-ntoasts ${menuOpen ? "is-menu" : ""}`}>
        {/* The list shows the same while it is open, and would be underneath */}
        {!open && (
          <>
            {ringing.slice(0, RING_CARDS).map((n) => {
              const { title, body } = describe(n);
              return (
                <div key={n.id} className="rd-ntoast rd-ring" role="alert">
                  <button type="button" className="rd-ntoast__main" onClick={() => follow(n)}>
                    <span className="rd-notif__icon">
                      <BellRing size={17} />
                    </span>
                    <span className="rd-notif__text">
                      <b>{title}</b>
                      <span>{body}</span>
                    </span>
                    <span className="rd-ring__open">Open</span>
                  </button>
                </div>
              );
            })}
            {ringing.length > RING_CARDS && (
              <button type="button" className="rd-ring__more" onClick={() => setOpen(true)}>
                +{ringing.length - RING_CARDS} more new appointment{ringing.length - RING_CARDS === 1 ? "" : "s"}
              </button>
            )}

            {sound && audioLocked && (isRinging || !showAsk) && (
              <div className="rd-ntoast rd-ntoast--late rd-hint" role="status">
                <VolumeX size={15} />
                <span>Tap or click anywhere on this page so new appointments can ring. Browsers keep a page silent until then.</span>
              </div>
            )}

            {signedOut && (
              <div className="rd-ntoast is-urgent" role="alert">
                <span className="rd-notif__icon">
                  <BellOff size={17} />
                </span>
                <div className="rd-notif__text">
                  <b>You&apos;re signed out</b>
                  <span>New appointments can&apos;t ring until you sign in again.</span>
                  <a href="/" className="rd-notif__signin">
                    Sign in
                  </a>
                </div>
              </div>
            )}

            {showAsk && (
              <div className="rd-ntoast rd-ask" role="status">
                <span className="rd-notif__icon">
                  <BellOff size={17} />
                </span>
                <div className="rd-notif__text">
                  <b>{blocked ? "Notifications are blocked" : "Turn on notifications"}</b>
                  {asking === "waiting" ? (
                    <span>Choose Allow in the message your browser just opened.</span>
                  ) : asking === "steps" ? (
                    <>
                      <span>
                        {blocked
                          ? "Browsers don't let a website remove this block itself, so it has to be done here once:"
                          : "The browser didn't ask, or its message was closed. Click Allow notifications again. If nothing shows up:"}
                      </span>
                      <ol className="rd-ask__steps">
                        {unblockSteps().map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      {blocked && <small>This message goes away by itself once it&apos;s allowed. If it stays, reload the page.</small>}
                    </>
                  ) : (
                    <span>
                      {blocked
                        ? "Your browser is blocking alerts from this dashboard, so you could miss new appointments."
                        : "Get an alert for every new appointment, even while this tab is in the background."}
                    </span>
                  )}
                  <div className="rd-ask__actions">
                    {asking !== "waiting" && !(blocked && asking === "steps") && (
                      <button type="button" className="rd-ask__go" onClick={allow}>
                        {blocked ? "How to unblock" : "Allow notifications"}
                      </button>
                    )}
                    <button type="button" className="rd-notif__link" onClick={notNow}>
                      Not now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {justAllowed && (
              <div className="rd-ntoast is-good" role="status">
                <span className="rd-notif__icon">
                  <BellRing size={17} />
                </span>
                <span className="rd-notif__text">
                  <b>Notifications are on</b>
                  <span>You should see a test alert now. If not, this computer or phone is blocking the browser: allow it in the device&apos;s notification settings.</span>
                </span>
                <button type="button" className="rd-ntoast__close" aria-label="Dismiss" onClick={() => setJustAllowed(false)}>
                  <X size={15} />
                </button>
              </div>
            )}
          </>
        )}

        {toasts.map((n) => {
          const { title, body, icon: Icon, tone } = describe(n);
          return (
            <div key={n.id} className={`rd-ntoast is-${tone}`} role="status">
              <button type="button" className="rd-ntoast__main" onClick={() => follow(n)}>
                <span className="rd-notif__icon">
                  <Icon size={17} />
                </span>
                <span className="rd-notif__text">
                  <b>{title}</b>
                  <span>{body}</span>
                </span>
              </button>
              <button type="button" className="rd-ntoast__close" aria-label="Dismiss" onClick={() => setToasts((list) => list.filter((x) => x.id !== n.id))}>
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
