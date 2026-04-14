/**
 * Service Worker para PWA de Catálogo
 * Permite funcionamiento offline y caché de recursos
 */

const CACHE_NAME = 'catalogo-pwa-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/app.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('Service Worker instalado');
    
    // Esperar hasta que todos los recursos estén en caché
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                // Forzar activación inmediata
                return self.skipWaiting();
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('Service Worker activado');
    
    // Limpiar caches antiguos
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Tomar control inmediato de todos los clientes
            return self.clients.claim();
        })
    );
});

// Interceptar peticiones fetch
self.addEventListener('fetch', event => {
    console.log('Fetch interceptado:', event.request.url);
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si el recurso está en caché, devolverlo
                if (response) {
                    console.log('Sirviendo desde caché:', event.request.url);
                    return response;
                }
                
                // Si no está en caché, hacer petición a la red
                console.log('Fetch desde red:', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        // Verificar respuesta válida
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clonar respuesta para guardar en caché
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.log('Error de red:', error);
                        
                        // Página de fallback para navegación offline
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        
                        return new Response('Contenido no disponible offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Sincronización en segundo plano (para enviar datos cuando vuelva internet)
self.addEventListener('sync', event => {
    console.log('Sync event:', event.tag);
    
    if (event.tag === 'sync-productos') {
        event.waitUntil(sincronizarProductos());
    }
});

// Función para sincronizar productos pendientes
async function sincronizarProductos() {
    console.log('Sincronizando productos pendientes...');
    // Aquí iría la lógica para enviar datos pendientes al servidor
    // Por ejemplo, pedidos realizados offline
}

// Manejo de notificaciones push
self.addEventListener('push', event => {
    console.log('Push notification recibida:', event);
    
    let data = {
        title: 'Novedades en el catálogo',
        body: 'Hay nuevos productos disponibles',
        icon: '/icons/icon-192.png'
    };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: '/icons/icon-72.png',
            vibrate: [200, 100, 200],
            actions: [
                {
                    action: 'open',
                    title: 'Ver catálogo'
                },
                {
                    action: 'close',
                    title: 'Cerrar'
                }
            ]
        })
    );
});

// Manejo de clic en notificaciones
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});