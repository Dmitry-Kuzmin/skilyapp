// SW disabled — push notifications via 5gvci.com paused.
// To re-enable, restore:
//   self.options = { "domain": "5gvci.com", "zoneId": 10323310 }
//   self.lary = ""
//   importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw')

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
