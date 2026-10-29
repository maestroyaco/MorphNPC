document.addEventListener('DOMContentLoaded', () => {
    // ... (tus constantes y variables existentes) ...
    const galleryContainer = document.getElementById('gallery-container');
    const cartItemsUl = document.getElementById('cart-items');
    const cartCountSpan = document.getElementById('cart-count');
    const downloadSelectedBtn = document.getElementById('download-selected-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');
    const paginationControlsContainer = document.getElementById('pagination-controls');
    const totalItemsCountSpan = document.getElementById('total-items-count');

    const CART_STORAGE_KEY = 'morphNPCCart';

    const CATEGORIES = {
        npc: { title: 'NPC', description: 'Explora los skins y añade tus favoritos al carrito.' },
        ornaments: { title: 'Ornamentos', description: 'Cada ornamento incluye su vista previa y un SWF individual con su símbolo original ornament_ID.' },
        auras: { title: 'Auras', description: 'Auras del cliente con una captura real de su animación. El SWF conserva la animación original.' },
        mounts: { title: 'Monturas', description: 'Monturas verificadas en clips/sprites. Vista previa del gráfico completo y descarga del SWF original.' }
    };
    const categoryButtons = document.querySelectorAll('[data-category]');
    const searchInput = document.getElementById('catalog-search');
    const status = document.getElementById('catalog-status');
    let currentCategory = 'npc';
    let allItems = [];
    let visibleItems = [];
    let downloading = false;

    function filterItems() {
        const query = searchInput.value.trim().toLowerCase();
        visibleItems = allItems.filter(item => item.category === currentCategory &&
            (!query || item.name.toLowerCase().includes(query) || item.id.toLowerCase().includes(query)));
        totalItemsCountSpan.textContent = visibleItems.length;
        document.getElementById('category-title').textContent = CATEGORIES[currentCategory].title;
        document.getElementById('category-description').textContent = CATEGORIES[currentCategory].description;
        status.textContent = `${visibleItems.length} recursos en ${CATEGORIES[currentCategory].title}`;
        categoryButtons.forEach(button => {
            const active = button.dataset.category === currentCategory;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
        });
    }
    let cart = new Set();

    let currentPage = 1; // Se actualizará desde la URL si es necesario
    const ITEMS_PER_PAGE = 30;

    // --- Funciones del Carrito y LocalStorage (sin cambios) ---
    function loadCartFromStorage() {
        const storedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (storedCart) {
            try {
                const parsedCart = JSON.parse(storedCart);
                if (Array.isArray(parsedCart)) {
                    cart = new Set(parsedCart);
                }
            } catch (e) {
                console.error("Error al parsear carrito desde localStorage:", e);
                cart = new Set();
            }
        }
        cartCountSpan.textContent = cart.size;
        downloadSelectedBtn.disabled = downloading || cart.size === 0;
    }

    function saveCartToStorage() {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(Array.from(cart)));
    }

    // --- Funciones de Paginación y URL Hash ---
    function getCurrentPageFromHash() {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const page = Number(params.get('page'));
        return Number.isInteger(page) && page > 0 ? page : 1;
    }

    function getCategoryFromHash() {
        const category = new URLSearchParams(window.location.hash.slice(1)).get('category');
        return Object.hasOwn(CATEGORIES, category) ? category : 'npc';
    }

    function updateURLHash(page) {
        const hash = `#category=${currentCategory}&page=${page}`;
        if (window.location.hash !== hash) window.location.hash = hash;
    }

    async function fetchData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const npcItems = await response.json();
            const catalogResponse = await fetch('catalog.json');
            if (!catalogResponse.ok) throw new Error(`Catálogo HTTP ${catalogResponse.status}`);
            const catalog = await catalogResponse.json();
            allItems = npcItems.map(item => ({ ...item, category: 'npc' })).concat(catalog);
            currentCategory = getCategoryFromHash();
            categoryButtons.forEach(button => {
                button.querySelector('.category-count').textContent = allItems.filter(item => item.category === button.dataset.category).length;
            });
            filterItems();

            // Establecer currentPage desde la URL ANTES del primer render
            currentPage = getCurrentPageFromHash();
            // Asegurarse de que currentPage no exceda el total de páginas
            const totalPages = Math.ceil(visibleItems.length / ITEMS_PER_PAGE);
            if (currentPage > totalPages && totalPages > 0) {
                currentPage = totalPages;
                updateURLHash(currentPage); // Corregir URL si estaba fuera de rango
            } else if (currentPage < 1) {
                currentPage = 1;
                updateURLHash(currentPage);
            }


            renderCart();
            renderPage(); // Renderiza la galería y la paginación
            
        } catch (error) {
            console.error("Error al cargar los datos de los NPC:", error);
            status.textContent = 'No se pudo cargar el catálogo. Recarga la página para volver a intentarlo.';
            galleryContainer.innerHTML = '';
            renderCart();
        }
    }

    function renderPage() { // Esta función ahora solo llama a los renders específicos
        renderGallery();
        renderPaginationControls();
        // El scroll se maneja cuando se cambia de página explícitamente
    }

    function navigateToPage(pageNumber) {
        const totalPages = Math.ceil(visibleItems.length / ITEMS_PER_PAGE);
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            currentPage = pageNumber;
            updateURLHash(currentPage); // Actualiza la URL
            renderGallery(); // Vuelve a renderizar la galería para la nueva página
            renderPaginationControls(); // Vuelve a renderizar los controles de paginación
            scrollToGalleryTop(); // Scroll a la parte superior de la galería
        }
    }


    function scrollToGalleryTop() {
        setTimeout(() => {
            const galleryTopOffset = galleryContainer.offsetTop;
            const headerOffset = document.querySelector('header')?.offsetHeight || 80;
            window.scrollTo({
                top: galleryTopOffset - headerOffset - 20,
                behavior: 'smooth'
            });
        }, 100); // El timeout ayuda a que el DOM se actualice
    }
    
    // --- renderGallery y funciones de botones (actualizadas para usar navigateToPage) ---
    function renderGallery() {
        galleryContainer.innerHTML = '';
        galleryContainer.dataset.category = currentCategory;
        
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const itemsToDisplay = visibleItems.slice(startIndex, endIndex);

        if (visibleItems.length === 0) {
            galleryContainer.innerHTML = "<p>No hay recursos que coincidan con tu búsqueda.</p>";
            return;
        }
        if (itemsToDisplay.length === 0 && visibleItems.length > 0) {
             galleryContainer.innerHTML = "<p>No hay más skins para mostrar en esta página.</p>";
             return;
        }

        itemsToDisplay.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('npc-card');
            card.dataset.id = item.id;

            const img = document.createElement('img');
            img.src = item.png_url;
            img.alt = `${CATEGORIES[item.category].title}: ${item.name}`;
            img.decoding = 'async';
            img.loading = 'lazy';

            const name = document.createElement('h3');
            name.textContent = item.name;

            const addButton = document.createElement('button');
            addButton.classList.add('button', 'add-to-cart-btn');
            addButton.addEventListener('click', () => handleToggleCartItem(item.id));

            card.appendChild(img);
            card.appendChild(name);
            const download = document.createElement('a');
            download.className = 'download-swf';
            download.href = item.swf_url;
            download.download = item.swf_url.split('/').pop();
            download.textContent = 'Descargar SWF';
            download.setAttribute('aria-label', `Descargar SWF de ${item.name}`);
            card.appendChild(addButton);
            card.appendChild(download);
            galleryContainer.appendChild(card);
        });
        updateAllGalleryButtonVisuals();
    }

    function updateButtonVisualState(button, itemId) {
        if (cart.has(itemId)) {
            button.innerHTML = '<i class="fas fa-check"></i> Quitar';
            button.classList.add('added');
        } else {
            button.innerHTML = '<i class="fas fa-cart-plus"></i> Añadir';
            button.classList.remove('added');
        }
    }
    
    function updateAllGalleryButtonVisuals() {
        galleryContainer.querySelectorAll('.npc-card').forEach(card => {
            const itemId = card.dataset.id;
            const button = card.querySelector('.add-to-cart-btn');
            if (button && itemId) {
                updateButtonVisualState(button, itemId);
            }
        });
    }

    function handleToggleCartItem(itemId) {
        if (cart.has(itemId)) {
            cart.delete(itemId);
        } else {
            cart.add(itemId);
        }
        saveCartToStorage();
        renderCart();
        const toggledCardButton = galleryContainer.querySelector(`.npc-card[data-id="${itemId}"] .add-to-cart-btn`);
        if (toggledCardButton) {
            updateButtonVisualState(toggledCardButton, itemId);
        }
    }

    function renderPaginationControls() {
        paginationControlsContainer.innerHTML = '';
        if (visibleItems.length === 0) return; // No mostrar paginación si no hay items

        const totalPages = Math.ceil(visibleItems.length / ITEMS_PER_PAGE);

        if (totalPages <= 1) return;

        const createPageButton = (page, text, isDisabled = false, isActive = false) => {
            const button = document.createElement('button');
            button.innerHTML = text || page;
            button.disabled = isDisabled;
            if (isActive) button.classList.add('active');
            
            // El listener ahora llama a navigateToPage
            button.addEventListener('click', () => {
                if (!isDisabled && !isActive) { // No hacer nada si está deshabilitado o ya es la activa
                    navigateToPage(page);
                }
            });
            return button;
        };

        // Botón "Anterior"
        paginationControlsContainer.appendChild(createPageButton(currentPage - 1, '« Anterior', currentPage === 1));

        // Lógica de los números de página (con "...")
        const pagesToShow = [];
        if (totalPages <= 7) { // Mostrar todos los números si son 7 o menos
            for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
        } else {
            pagesToShow.push(1); // Siempre mostrar la página 1
            if (currentPage > 4) {
                pagesToShow.push('...');
            }
            let startRange = Math.max(2, currentPage - 1);
            let endRange = Math.min(totalPages - 1, currentPage + 1);

            if (currentPage <= 3) { // Si estamos cerca del inicio
                startRange = 2;
                endRange = Math.min(totalPages - 1, 4); // Mostrar 2, 3, 4
            } else if (currentPage >= totalPages - 2) { // Si estamos cerca del final
                startRange = Math.max(2, totalPages - 3); // Mostrar N-3, N-2, N-1
                endRange = totalPages - 1;
            }
            
            for (let i = startRange; i <= endRange; i++) {
                pagesToShow.push(i);
            }

            if (currentPage < totalPages - 3) {
                pagesToShow.push('...');
            }
            pagesToShow.push(totalPages); // Siempre mostrar la última página
        }
        
        pagesToShow.forEach(p => {
            if (p === '...') {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.margin = "0 10px";
                paginationControlsContainer.appendChild(ellipsis);
            } else {
                paginationControlsContainer.appendChild(createPageButton(p, null, false, p === currentPage));
            }
        });
        
        // Botón "Siguiente"
        paginationControlsContainer.appendChild(createPageButton(currentPage + 1, 'Siguiente »', currentPage === totalPages));
    }

    // --- Funciones del carrito (renderCart, clearCartBtn, downloadSelectedBtn) sin cambios mayores ---
    // ... (copia las funciones renderCart, clearCartBtn listener, downloadSelectedBtn listener de tu versión anterior que funcionaba bien) ...
    // Asegúrate de que estas funciones sigan usando `allItems` correctamente.

function renderCart() {
    cartItemsUl.innerHTML = ''; // Limpiar siempre antes de re-renderizar
    cartCountSpan.textContent = cart.size;
    downloadSelectedBtn.disabled = downloading || cart.size === 0;

    if (cart.size === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = "Tu carrito está vacío.";
        cartItemsUl.appendChild(emptyLi);
    } else {
        if (allItems.length > 0) {
            const sortedCartItemIds = Array.from(cart).sort((a, b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.localeCompare(b);
            });

            sortedCartItemIds.forEach(itemId => {
                const item = allItems.find(i => i.id === itemId);
                if (item) {
                    const li = document.createElement('li');
                    // li.textContent = item.name; // Ya no solo texto

                    // Contenedor para la imagen y el nombre (para mejor alineación con flex)
                    const itemInfo = document.createElement('div');
                    itemInfo.classList.add('cart-item-info');

                    // Crear la imagen miniatura
                    const imgThumbnail = document.createElement('img');
                    imgThumbnail.src = item.png_url; // Usar la URL del PNG
                    imgThumbnail.alt = `Miniatura de ${item.name}`;
                    imgThumbnail.classList.add('cart-item-thumbnail');
                    if (item.category === 'auras') imgThumbnail.classList.add('aura-preview');
                    imgThumbnail.loading = 'lazy'; // Puede ser útil si hay muchas imágenes

                    // Crear el span para el nombre
                    const itemNameSpan = document.createElement('span');
                    itemNameSpan.textContent = `${CATEGORIES[item.category].title} · ${item.name}`; // El nombre del item (ID)

                    // Añadir imagen y nombre al contenedor de información
                    itemInfo.appendChild(imgThumbnail);
                    itemInfo.appendChild(itemNameSpan);
                    
                    li.appendChild(itemInfo); // Añadir el div con img y nombre al li

                    const removeBtn = document.createElement('button');
                    removeBtn.classList.add('remove-item-btn');
                    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    removeBtn.title = "Quitar del carrito";
                    removeBtn.setAttribute('aria-label', `Quitar ${item.name} del carrito`);
                    removeBtn.addEventListener('click', () => {
                        cart.delete(itemId);
                        saveCartToStorage();
                        renderCart(); // Re-renderiza el carrito
                        updateAllGalleryButtonVisuals(); // Actualiza botones de la galería
                    });

                    li.appendChild(removeBtn); // Añadir el botón de quitar
                    cartItemsUl.appendChild(li);
                } else {
                    console.warn(`Item con ID "${itemId}" no encontrado en allItems. Removiendo del carrito.`);
                    cart.delete(itemId);
                    saveCartToStorage();
                    cartCountSpan.textContent = cart.size; // Actualizar contador directamente
                    downloadSelectedBtn.disabled = downloading || cart.size === 0;
                }
            });
        } else {
            if (cart.size > 0) {
                const loadingLi = document.createElement('li');
                loadingLi.textContent = `Tienes ${cart.size} item(s). Cargando detalles...`;
                cartItemsUl.appendChild(loadingLi);
            }
        }
    }
}
    clearCartBtn.addEventListener('click', () => {
        cart.clear();
        saveCartToStorage();
        renderCart();
        updateAllGalleryButtonVisuals();
    });

    downloadSelectedBtn.addEventListener('click', async () => {
        if (cart.size === 0 || allItems.length === 0) {
            alert("El carrito está vacío o los datos de los items aún no han cargado.");
            return;
        }
        const originalButtonText = downloadSelectedBtn.innerHTML;
        downloading = true;
        downloadSelectedBtn.disabled = true;
        downloadSelectedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        const zip = new JSZip();
        const folderName = "Pack MorphNPC";
        const folder = zip.folder(folderName);
        let filesSuccessfullyAddedToZip = 0;
        const downloadTasks = Array.from(cart).map(itemId => {
            const item = allItems.find(i => i.id === itemId);
            if (!item) {
                console.warn(`Item con ID "${itemId}" para descarga no encontrado en allItems.`);
                return Promise.resolve({itemId, status: 'item_not_found_for_download'});
            }
            return Promise.allSettled([
                fetch(item.swf_url).then(res => res.ok ? res.blob() : Promise.reject(new Error(`SWF ${item.id} status: ${res.status}`))),
                fetch(item.png_url).then(res => res.ok ? res.blob() : Promise.reject(new Error(`PNG ${item.id} status: ${res.status}`)))
            ]).then(([swfResult, pngResult]) => {
                let swfBlob, pngBlob;
                if (swfResult.status === 'fulfilled') swfBlob = swfResult.value;
                else console.error(`Fallo al descargar ${item.id}.swf:`, swfResult.reason);
                if (pngResult.status === 'fulfilled') pngBlob = pngResult.value;
                else console.error(`Fallo al descargar ${item.id}.png:`, pngResult.reason);
                if (swfBlob) folder.folder(item.category).file(item.swf_url.split('/').pop(), swfBlob);
                if (pngBlob) folder.folder(item.category).file(item.png_url.split('/').pop(), pngBlob);
                if (swfBlob || pngBlob) filesSuccessfullyAddedToZip++;
                return {itemId, status: (swfBlob || pngBlob) ? 'partial_or_full_success' : 'both_failed'};
            });
        });
        await Promise.all(downloadTasks);
        if (filesSuccessfullyAddedToZip > 0) {
            try {
                const content = await zip.generateAsync({ type: "blob" });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                const dateSuffix = new Date().toISOString().slice(0,10).replace(/-/g,"");
                link.download = `${folderName}_${dateSuffix}.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } catch (err) {
                console.error("Error generando el ZIP:", err);
                alert("Hubo un error al generar el archivo ZIP.");
            }
        } else {
            alert("No se pudieron agregar archivos al ZIP...");
        }
        downloading = false;
        downloadSelectedBtn.disabled = cart.size === 0;
        downloadSelectedBtn.innerHTML = originalButtonText;
    });


    // --- Event Listener para cambios en el Hash de la URL ---
    function restoreLocation() {
        currentCategory = getCategoryFromHash();
        filterItems();
        const totalPages = Math.max(1, Math.ceil(visibleItems.length / ITEMS_PER_PAGE));
        currentPage = Math.min(getCurrentPageFromHash(), totalPages);
        renderPage();
    }

    window.addEventListener('hashchange', restoreLocation);
    categoryButtons.forEach(button => button.addEventListener('click', () => {
        searchInput.value = '';
        currentCategory = button.dataset.category;
        filterItems();
        currentPage = 1;
        updateURLHash(1);
        renderPage();
    }));
    searchInput.addEventListener('input', () => {
        filterItems();
        currentPage = 1;
        updateURLHash(1);
        renderPage();
    });

    // --- Inicialización ---
    loadCartFromStorage();
    fetchData(); // Carga allItems, establece currentPage desde el hash, y luego renderiza.
    // renderCart(); // RenderCart ahora se llama dentro de fetchData y navigateToPage
});
