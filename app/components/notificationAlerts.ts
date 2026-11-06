import { NotificationItem, describe } from "./notificationText";

/**
 * How the bell reaches the admin outside its list: the chime, the ring, and the
 * browser's own notifications (the "desktop alerts").
 */

/* --------------------------------------------------------------- sound */

let audio: AudioContext | null | undefined;

/** One for the whole page. Browsers keep it silent until the page has been clicked once. */
export const pageAudio = () => {
  if (audio === undefined) {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audio = Ctx ? new Ctx() : null;
    } catch {
      audio = null;
    }
  }
  return audio;
};

/** A short two-note chime, for what doesn't keep ringing. */
export const chime = () => {
  const ctx = pageAudio();
  if (ctx?.state !== "running") return;
  [
    [880, 0],
    [1175, 0.13],
  ].forEach(([freq, at]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.32);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + 0.34);
  });
};

/** Chimes twice, then a pause: one round of the ring. */
const RING_SECONDS = 3;
const RING_NOTES = [
  [880, 0],
  [1175, 0.16],
  [880, 0.62],
  [1175, 0.78],
];

const buildRing = (ctx: AudioContext) => {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.round(RING_SECONDS * rate), rate);
  const samples = buffer.getChannelData(0);
  RING_NOTES.forEach(([freq, at]) => {
    const start = Math.round(at * rate);
    const end = Math.min(samples.length, start + Math.round(0.9 * rate));
    for (let i = start; i < end; i++) {
      const t = (i - start) / rate;
      const fade = Math.min(1, t / 0.008) * Math.exp(-t * 5.5);
      samples[i] += 0.3 * fade * (Math.sin(2 * Math.PI * freq * t) + 0.25 * Math.sin(4 * Math.PI * freq * t));
    }
  });
  return buffer;
};

let ringBuffer: AudioBuffer | null = null;

/**
 * Starts the ring; the function it returns stops it. It is one sound on a loop,
 * not a timer: a tab in the background runs its timers late, but not its audio.
 * With several dashboard tabs open only one rings, or they would ring over each
 * other. When that tab closes, the next one takes over.
 */
export function startRinging(): () => void {
  const ctx = pageAudio();
  if (!ctx) return () => {};

  let source: AudioBufferSourceNode | null = null;
  const play = () => {
    source = ctx.createBufferSource();
    source.buffer = ringBuffer ||= buildRing(ctx);
    source.loop = true;
    source.connect(ctx.destination);
    source.start();
  };
  const silence = () => {
    source?.stop();
    source?.disconnect();
    source = null;
  };

  if (!navigator.locks) {
    play();
    return silence;
  }
  const leaveQueue = new AbortController();
  let release = () => {};
  navigator.locks
    .request(
      "rd-ring",
      { signal: leaveQueue.signal },
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
          play();
        })
    )
    .catch(() => {
      /* stopped while waiting for the other tab */
    });
  return () => {
    leaveQueue.abort();
    silence();
    release();
  };
}

/* ------------------------------------------------------- desktop alerts */

export type AlertPermission = NotificationPermission | "unsupported";

/** iPhones only have these on sites added to the Home Screen, and http:// pages never do. */
export const alertPermission = (): AlertPermission =>
  typeof window !== "undefined" && "Notification" in window && window.isSecureContext ? window.Notification.permission : "unsupported";

/** Opens the browser's own question, or answers "denied" at once if the site is blocked. */
export const askPermission = () =>
  new Promise<NotificationPermission>((resolve) => {
    // Older Safari answers through a callback, not a promise
    const answer = window.Notification.requestPermission(resolve) as Promise<NotificationPermission> | undefined;
    answer?.then?.(resolve);
  });

let worker: Promise<ServiceWorkerRegistration | null> | null = null;

const alertWorker = () => {
  worker ||= (async () => {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("/notify-sw.js");
      const waited = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5000));
      return reg.active ? reg : await Promise.race([navigator.serviceWorker.ready, waited]);
    } catch {
      return null;
    }
  })();
  return worker;
};

const show = async (title: string, options: NotificationOptions, onClick?: () => void) => {
  try {
    const reg = await alertWorker();
    if (reg) return void (await reg.showNotification(title, options));
  } catch {
    /* tried below */
  }
  try {
    const alert = new window.Notification(title, options);
    alert.onclick = () => {
      window.focus();
      onClick?.();
      alert.close();
    };
  } catch {
    /* the page itself still shows it */
  }
};

/** A ringing appointment's alert stays on the screen until it is dealt with. */
export const alertAbout = (n: NotificationItem, ring: boolean, onClick: () => void) => {
  const { title, body, href } = describe(n);
  return show(title, { body, tag: n.id, icon: "/favicon.ico", requireInteraction: ring, data: { item: n, href, ring } }, onClick);
};

/** Proof that it works, as the computer itself can still be blocking the browser. */
export const alertTurnedOn = () =>
  show("Notifications are on", { body: "New appointments will show up like this.", tag: "rd-notif-on", icon: "/favicon.ico" });

/** Takes down the alerts of the appointments that have stopped ringing. */
export const closeRingAlerts = async (stillRinging: string[]) => {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const shown = (await reg?.getNotifications()) || [];
    shown.forEach((alert) => {
      if (alert.data?.ring && !stillRinging.includes(alert.tag)) alert.close();
    });
  } catch {
    /* they close when clicked */
  }
};

/** What to click in this browser: no website can lift a block by itself. */
export function unblockSteps() {
  const ua = navigator.userAgent;
  const phone = /Android|iPhone|iPad/i.test(ua);
  const anyBrowser = [
    "Open this browser's settings and look for Site settings or Notifications.",
    `Find ${window.location.hostname} and set it to Allow.`,
  ];

  if (/SamsungBrowser|iPhone|iPad/i.test(ua)) return anyBrowser;
  if (/Firefox\//.test(ua)) {
    return phone
      ? ["Tap the lock icon next to the web address.", "Set Notification to Allowed."]
      : [
          "Click the crossed-out bell at the left of the web address, at the top of this window.",
          "Next to Send Notifications, click the × to remove the block.",
          "Then click Allow notifications here.",
        ];
  }
  if (/Edg\//.test(ua)) {
    return phone
      ? ["Tap the lock icon next to the web address.", "Tap Permissions and turn Notifications on."]
      : ["Click the lock icon at the left of the web address, at the top of this window.", "Under Permissions for this site, set Notifications to Allow."];
  }
  if (/Chrome\//.test(ua)) {
    return phone
      ? [
          "Tap the small icon at the left of the web address.",
          "Tap Permissions and turn Notifications on. If it isn't listed, tap Site settings, then Notifications, then Allow.",
        ]
      : [
          "Click the small icon at the left of the web address, at the top of this window.",
          "Turn Notifications on. If it isn't listed, click Site settings and set Notifications to Allow.",
        ];
  }
  if (/Safari\//.test(ua)) {
    return [
      "In the menu bar, click Safari, then Settings (or Preferences).",
      "Open the Websites tab and pick Notifications on the left.",
      `Find ${window.location.hostname} and set it to Allow.`,
    ];
  }
  return anyBrowser;
}
