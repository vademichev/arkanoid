const CACHE_NAME = 'arkanoid-pwa-v2';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.min.js'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache);
      await self.skipWaiting();
      console.log('Кэш успешно создан:', CACHE_NAME);
    } catch (error) {
      console.error('Ошибка при кэшировании ресурсов:', error);
    }
  })());
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          if (cacheName !== CACHE_NAME) {
            await caches.delete(cacheName);
          }
        })
      );
      await self.clients.claim();
      console.log('Service Worker активирован, старые кэши удалены');
    } catch (error) {
      console.error('Ошибка при активации Service Worker:', error);
    }
  })());
});

// Обработка запросов по стратегии Cache First
self.addEventListener('fetch', (event) => {
  // Игнорируем не-GET запросы и запросы к внешним доменам (кроме CDN Phaser)
  if (event.request.method !== 'GET') return;
  
  const isPhaserCDN = event.request.url.includes('cdn.jsdelivr.net');
  const isSameOrigin = event.request.url.startsWith(self.location.origin);
  
  if (!isSameOrigin && !isPhaserCDN) return;
  
  event.respondWith((async () => {
    try {
      // Сначала пытаемся получить из кэша
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        console.log('Загружено из кэша:', event.request.url);
        return cachedResponse;
      }
      
      // Если в кэше нет - запрашиваем с сервера
      console.log('Запрос с сервера:', event.request.url);
      const networkResponse = await fetch(event.request);
      
      // Кэшируем успешные ответы
      if (networkResponse.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
      }
      
      return networkResponse;
    } catch (error) {
      console.error('Ошибка при обработке запроса:', error);
      
      // Для основных ресурсов пытаемся вернуть кэш как fallback
      if (event.request.url.includes('index.html') || 
          event.request.url.includes('phaser.min.js')) {
        return caches.match(event.request);
      }
      
      throw error;
    }
  })());
});