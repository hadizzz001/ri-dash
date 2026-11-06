/**
 * Shows the dashboard's desktop alerts. Phones only allow them through a service
 * worker, and from here a click still works after the page that raised the alert
 * has gone. It does nothing else: no caching, pages load as if it weren't here.
 */

// The bell isn't on these pages, so nothing there would answer a click
const NO_BELL = ["/", "/login"];

const pathOf = (client) => new URL(client.url).pathname;

const follow = async ({ item, href } = {}) => {
  const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const withBell = tabs.filter((tab) => !NO_BELL.includes(pathOf(tab)));
  const tab = withBell.find((t) => pathOf(t) === "/reservation") || withBell[0];
  if (!tab) return self.clients.openWindow(href || "/reservation");
  await tab.focus().catch(() => {});
  if (item) tab.postMessage({ type: "rd:follow", item });
};

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(follow(event.notification.data || {}));
});
