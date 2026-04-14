/**
 * Aplicación PWA de Catálogo de Productos
 * Funcionalidades: Filtros, búsqueda, modo offline, instalación PWA
 */

// Clase principal de la aplicación
class CatalogoPWA {
    constructor() {
        // Estado de la aplicación
        this.productos = [];
        this.productosFiltrados = [];
        this.filtros = {
            search: '',
            category: '',
            supplier: '',
            rating: '',
            maxPrice: 1000
        };
        
        // Inicializar la aplicación
        this.init();
    }
    
    /**
     * Inicializa la aplicación
     */
    async init() {
        // Cargar productos
        await this.cargarProductos();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Configurar PWA
        this.setupPWA();
        
        // Configurar modo offline
        this.setupOfflineMode();
        
        // Renderizar UI inicial
        this.renderizarFiltros();
        this.filtrarProductos();
    }
    
    /**
     * Carga los productos desde el archivo JSON
     * Implementa caché para modo offline
     */
    async cargarProductos() {
        try {
            // Intentar cargar desde la red
            const response = await fetch('data/productos.json');
            const data = await response.json();
            this.productos = data.productos;
            
            // Guardar en caché para offline
            if ('caches' in window) {
                const cache = await caches.open('productos-v1');
                cache.put('data/productos.json', new Response(JSON.stringify(data)));
            }
        } catch (error) {
            console.log('Modo offline - cargando desde caché');
            // Si falla la red, intentar desde caché
            const cache = await caches.open('productos-v1');
            const cachedResponse = await cache.match('data/productos.json');
            if (cachedResponse) {
                const data = await cachedResponse.json();
                this.productos = data.productos;
            } else {
                // Datos de respaldo si no hay caché
                this.productos = this.getProductosRespaldo();
            }
        }
    }
    
    /**
     * Datos de respaldo para caso extremo
     */
    getProductosRespaldo() {
        return [
            {
                id: 1,
                nombre: "Producto de ejemplo",
                descripcion: "Este producto se muestra cuando no hay conexión",
                precio: 99.99,
                categoria: "General",
                proveedor: "Demo",
                rating: 4.5,
                stock: 10,
                imagen: "https://via.placeholder.com/300x200",
                destacado: false,
                etiquetas: ["demo"]
            }
        ];
    }
    
    /**
     * Configura todos los event listeners de la UI
     */
    setupEventListeners() {
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.filtros.search = e.target.value.toLowerCase();
            this.filtrarProductos();
            document.getElementById('clearSearch').style.display = 
                this.filtros.search ? 'block' : 'none';
        });
        
        // Botón limpiar búsqueda
        document.getElementById('clearSearch').addEventListener('click', () => {
            searchInput.value = '';
            this.filtros.search = '';
            this.filtrarProductos();
            document.getElementById('clearSearch').style.display = 'none';
        });
        
        // Filtro de categoría
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filtros.category = e.target.value;
            this.filtrarProductos();
        });
        
        // Filtro de proveedor
        document.getElementById('supplierFilter').addEventListener('change', (e) => {
            this.filtros.supplier = e.target.value;
            this.filtrarProductos();
        });
        
        // Filtro de rating
        document.getElementById('ratingFilter').addEventListener('change', (e) => {
            this.filtros.rating = e.target.value;
            this.filtrarProductos();
        });
        
        // Filtro de precio
        const priceRange = document.getElementById('priceRange');
        const priceValue = document.getElementById('priceValue');
        priceRange.addEventListener('input', (e) => {
            this.filtros.maxPrice = parseInt(e.target.value);
            priceValue.textContent = `$${this.filtros.maxPrice}`;
            this.filtrarProductos();
        });
        
        // Resetear filtros
        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetearFiltros();
        });
    }
    
    /**
     * Resetea todos los filtros a su estado inicial
     */
    resetearFiltros() {
        // Resetear valores en UI
        document.getElementById('searchInput').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('supplierFilter').value = '';
        document.getElementById('ratingFilter').value = '';
        document.getElementById('priceRange').value = '1000';
        document.getElementById('priceValue').textContent = '$1000';
        
        // Resetear estado
        this.filtros = {
            search: '',
            category: '',
            supplier: '',
            rating: '',
            maxPrice: 1000
        };
        
        // Aplicar filtros
        this.filtrarProductos();
        document.getElementById('clearSearch').style.display = 'none';
    }
    
    /**
     * Filtra los productos según todos los criterios activos
     */
    filtrarProductos() {
        this.productosFiltrados = this.productos.filter(producto => {
            // Filtro de búsqueda (nombre, descripción, etiquetas)
            if (this.filtros.search) {
                const searchMatch = 
                    producto.nombre.toLowerCase().includes(this.filtros.search) ||
                    producto.descripcion.toLowerCase().includes(this.filtros.search) ||
                    producto.etiquetas.some(tag => tag.toLowerCase().includes(this.filtros.search));
                if (!searchMatch) return false;
            }
            
            // Filtro de categoría
            if (this.filtros.category && producto.categoria !== this.filtros.category) {
                return false;
            }
            
            // Filtro de proveedor
            if (this.filtros.supplier && producto.proveedor !== this.filtros.supplier) {
                return false;
            }
            
            // Filtro de rating
            if (this.filtros.rating && producto.rating < parseFloat(this.filtros.rating)) {
                return false;
            }
            
            // Filtro de precio máximo
            if (producto.precio > this.filtros.maxPrice) {
                return false;
            }
            
            return true;
        });
        
        // Actualizar contador y renderizar
        this.actualizarContador();
        this.renderizarProductos();
    }
    
    /**
     * Renderiza los filtros (categorías y proveedores únicos)
     */
    renderizarFiltros() {
        // Obtener categorías únicas
        const categorias = [...new Set(this.productos.map(p => p.categoria))];
        const categorySelect = document.getElementById('categoryFilter');
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria;
            option.textContent = categoria;
            categorySelect.appendChild(option);
        });
        
        // Obtener proveedores únicos
        const proveedores = [...new Set(this.productos.map(p => p.proveedor))];
        const supplierSelect = document.getElementById('supplierFilter');
        proveedores.forEach(proveedor => {
            const option = document.createElement('option');
            option.value = proveedor;
            option.textContent = proveedor;
            supplierSelect.appendChild(option);
        });
    }
    
    /**
     * Renderiza los productos en el grid
     */
    renderizarProductos() {
        const grid = document.getElementById('productsGrid');
        
        if (this.productosFiltrados.length === 0) {
            grid.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-box-open"></i>
                    <p>No se encontraron productos</p>
                </div>
            `;
            return;
        }
        
        // Generar HTML de productos
        grid.innerHTML = this.productosFiltrados.map(producto => `
            <div class="product-card" data-id="${producto.id}">
                ${producto.destacado ? '<div class="product-badge">🌟 Destacado</div>' : ''}
                <img src="${producto.imagen}" alt="${producto.nombre}" class="product-image" loading="lazy">
                <div class="product-info">
                    <h3 class="product-title">${producto.nombre}</h3>
                    <p class="product-description">${producto.descripcion}</p>
                    <div class="product-price">$${producto.precio.toFixed(2)}</div>
                    <div class="product-meta">
                        <div class="product-rating">
                            ${this.renderizarEstrellas(producto.rating)}
                            <span>(${producto.rating})</span>
                        </div>
                        <div class="product-supplier">
                            <i class="fas fa-truck"></i>
                            ${producto.proveedor}
                        </div>
                    </div>
                    <div class="product-meta">
                        <span><i class="fas fa-box"></i> Stock: ${producto.stock} uds</span>
                        <span><i class="fas fa-tag"></i> ${producto.categoria}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Agregar event listeners a las tarjetas
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id);
                this.mostrarDetalleProducto(id);
            });
        });
    }
    
    /**
     * Renderiza estrellas según calificación
     */
    renderizarEstrellas(rating) {
        const estrellasLlenas = Math.floor(rating);
        const tieneMedia = rating % 1 >= 0.5;
        let html = '';
        
        for (let i = 0; i < estrellasLlenas; i++) {
            html += '<i class="fas fa-star"></i>';
        }
        
        if (tieneMedia) {
            html += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const estrellasVacias = 5 - Math.ceil(rating);
        for (let i = 0; i < estrellasVacias; i++) {
            html += '<i class="far fa-star"></i>';
        }
        
        return html;
    }
    
    /**
     * Muestra detalles del producto (alert por simplicidad)
     * En producción, mostraría un modal
     */
    mostrarDetalleProducto(id) {
        const producto = this.productos.find(p => p.id === id);
        if (producto) {
            alert(`
                ${producto.nombre}\n
                Precio: $${producto.precio}\n
                Proveedor: ${producto.proveedor}\n
                Stock disponible: ${producto.stock} unidades\n
                Calificación: ${producto.rating} estrellas\n
                Categoría: ${producto.categoria}\n
                Descripción: ${producto.descripcion}
            `);
        }
    }
    
    /**
     * Actualiza el contador de resultados
     */
    actualizarContador() {
        const countElement = document.getElementById('resultsCount');
        countElement.textContent = `Mostrando ${this.productosFiltrados.length} de ${this.productos.length} productos`;
    }
    
    /**
     * Configura la instalación de la PWA
     */
    setupPWA() {
        let deferredPrompt;
        const installButton = document.getElementById('installButton');
        
        // Escuchar evento beforeinstallprompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installButton.style.display = 'block';
        });
        
        // Manejar instalación
        installButton.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    console.log('PWA instalada correctamente');
                    installButton.style.display = 'none';
                }
                deferredPrompt = null;
            }
        });
        
        // Detectar cuando la app ya está instalada
        window.addEventListener('appinstalled', () => {
            console.log('PWA instalada');
            installButton.style.display = 'none';
        });
    }
    
    /**
     * Configura el modo offline y detección de conexión
     */
    setupOfflineMode() {
        const statusElement = document.getElementById('onlineStatus');
        
        // Función para actualizar estado de conexión
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                statusElement.innerHTML = '<i class="fas fa-wifi"></i> En línea';
                statusElement.className = 'status online';
            } else {
                statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
                statusElement.className = 'status offline';
            }
        };
        
        // Escuchar cambios en la conexión
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Estado inicial
        updateOnlineStatus();
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new CatalogoPWA();
});
