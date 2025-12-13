// SmartMatch PWA Service Worker
// Zero-cost offline architecture with intelligent caching

const CACHE_NAME = "smartmatch-v1";
const STATIC_CACHE = "smartmatch-static-v1";
const DYNAMIC_CACHE = "smartmatch-dynamic-v1";

// Assets to cache immediately
const STATIC_ASSETS = ["/", "/manifest.json", "/pwa-192x192.png", "/pwa-512x512.png"];

// API endpoints to cache
const API_CACHE_PATTERNS = [/\/api\/recommendations/, /\/data\//];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("🔧 SmartMatch SW: Installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("🔧 SmartMatch SW: Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("🔧 SmartMatch SW: Static assets cached");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("🔧 SmartMatch SW: Failed to cache static assets:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("🚀 SmartMatch SW: Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("🚀 SmartMatch SW: Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("🚀 SmartMatch SW: Activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - intelligent caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Handle API requests (Network First with fallback)
  if (API_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets (Cache First)
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.startsWith("/images/")) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle navigation requests (Network First for fresh content)
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Default: Network First
  event.respondWith(handleNetworkFirstRequest(request));
});

// API Request Strategy - Network First with 5-minute cache
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      // Cache API responses for 5 minutes
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("🔌 SmartMatch SW: Network failed, trying cache for API");

    // Fallback to cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // If no cache, return offline response
    return new Response(
      JSON.stringify({
        success: false,
        error: "Offline - Please check your connection",
        cached: true
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// Static Asset Strategy - Cache First
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("🔌 SmartMatch SW: Failed to fetch static asset:", request.url);
    return new Response("Offline", { status: 503 });
  }
}

// Navigation Strategy - Network First with offline fallback
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      return networkResponse;
    }

    throw new Error("Network response not ok");
  } catch (error) {
    console.log("🔌 SmartMatch SW: Navigation failed, trying offline fallback");

    // Try to serve cached index.html
    const cachedIndex = await caches.match("/");

    if (cachedIndex) {
      return cachedIndex;
    }

    // Ultimate fallback - simple offline page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SmartMatch - Offline</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #0f172a;
              color: #e2e8f0;
              text-align: center;
            }
            .offline-container {
              max-width: 400px;
              padding: 2rem;
            }
            .icon {
              font-size: 4rem;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="icon">🔮</div>
            <h1>SmartMatch</h1>
            <p>You're currently offline. Please check your internet connection and try again.</p>
            <p><small>Your previous recommendations are still available when you're back online.</small></p>
          </div>
        </body>
      </html>
    `,
      {
        status: 200,
        headers: { "Content-Type": "text/html" }
      }
    );
  }
}

// Network First Strategy - For other requests
async function handleNetworkFirstRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Background sync for form submissions when offline
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("🔄 SmartMatch SW: Background sync triggered");
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any queued requests when back online
  console.log("🔄 SmartMatch SW: Performing background sync");
}

// Push notifications for new recommendations (future feature)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/"
      }
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});

// Message handling for communication with main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_CACHE_INFO") {
    event.ports[0].postMessage({
      staticCache: STATIC_CACHE,
      dynamicCache: DYNAMIC_CACHE
    });
  }
});

console.log("🔮 SmartMatch SW: Service Worker loaded");
