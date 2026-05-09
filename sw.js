// 📦 Service Worker para Catálogo Mi Tiendita
// Versión: v4 — con limpieza automática de caché vieja

const CACHE_NAME = 'catalogo-v4';
const CACHE_VERSION = 4;

// Recursos principales a cachear
const urlsToCache = [
  '/catalogo/',
  '/catalogo/index.html',
  '/catalogo/manifest-catalogo.json',
  '/catalogo/inventario.json'
];

// 🧹 Función para limpiar cachés viejas
function limpiarCachesViejas() {
  return caches.keys().then(keys => {
    const promises = keys.map(key => {
      // Si la caché no es la versión actual, la eliminamos
      if (key !== CACHE_NAME) {
        console.log(`🧹 Eliminando caché vieja: ${key}`);
        return caches.delete(key);
      }
    });
    return Promise.all(promises);
  });
}

// 🧹 Función para limpiar imágenes en caché (opcional)
function limpiarImagenesCaché() {
  if (!caches) return Promise.resolve();
  return caches.keys().then(keys => {
    const promises = keys.map(key => {
      // Eliminar cachés de versiones anteriores de imágenes
      if (key.startsWith('catalogo-imagenes-') && key !== 'catalogo-imagenes-v4') {
        console.log(`🧹 Eliminando caché de imágenes vieja: ${key}`);
        return caches.delete(key);
      }
    });
    return Promise.all(promises);
  });
}

// 📥 INSTALACIÓN (limpia y luego cachea)
self.addEventListener('install', event => {
  console.log('🔧 Service Worker instalando...');
  
  event.waitUntil(
    Promise.all([
      // Primero limpiar cachés viejas
      limpiarCachesViejas(),
      limpiarImagenesCaché()
    ]).then(() => {
      // Luego cachear los recursos principales
      return caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Cacheando recursos principales...');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('⚠️ Error al cachear algunos recursos:', err);
        });
      });
    }).then(() => {
      console.log('✅ Service Worker instalado correctamente');
      // Forzar activación inmediata
      return self.skipWaiting();
    })
  );
});

// 🚀 ACTIVACIÓN (toma control inmediato)
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker activando...');
  
  event.waitUntil(
    Promise.all([
      // Limpiar nuevamente por si acaso
      limpiarCachesViejas(),
      limpiarImagenesCaché(),
      // Tomar control de todas las pestañas abiertas
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker activado y controlando la página');
    })
  );
});

// 🌐 INTERCEPTAR PETICIONES (con estrategia inteligente)
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Para imágenes: caché first (prioriza caché, luego red)
  if (url.match(/\.(webp|jpg|jpeg|png|gif|avif|svg)$/i)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request).then(networkResponse => {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, cacheCopy);
          });
          return networkResponse;
        }).catch(() => {
          // Fallback: imagen placeholder (opcional)
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
      })
    );
  } 
  // Para inventario.json: network first (prioriza red para mantener actualizado)
  else if (url.includes('inventario.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        return caches.match(event.request);
      })
    );
  }
  // Para el resto: network first con fallback a caché
  else {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
  }
});

// 📡 ESCUCHAR MENSAJES PARA LIMPIEZA MANUAL
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'limpiarCache') {
    console.log('🧹 Limpieza manual de caché solicitada');
    event.waitUntil(
      Promise.all([
        limpiarCachesViejas(),
        limpiarImagenesCaché()
      ]).then(() => {
        console.log('✅ Caché limpiada manualmente');
        event.ports[0].postMessage({ status: 'ok' });
      })
    );
  }
});
