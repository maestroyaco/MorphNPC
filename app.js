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

    let allItems = [];
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
        downloadSelectedBtn.disabled = cart.size === 0;
    }

    function saveCartToStorage() {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(Array.from(cart)));
    }

    // --- Funciones de Paginación y URL Hash ---
    function getCurrentPageFromHash() {
        const hash = window.location.hash.substring(1); // Quitar el '#'
        if (hash.startsWith('page=')) {
            const pageNum = parseInt(hash.split('=')[1], 10);
            if (!isNaN(pageNum) && pageNum > 0) {
                return pageNum;
            }
        }
        return 1; // Default page
    }

    function updateURLHash(page) {
        // Solo actualiza el hash si es diferente para evitar entradas duplicadas en el historial
        if (getCurrentPageFromHash() !== page) {
            window.location.hash = `#page=${page}`;
        }
    }

    async function fetchData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allItems = await response.json();
            totalItemsCountSpan.textContent = allItems.length;

            // Establecer currentPage desde la URL ANTES del primer render
            currentPage = getCurrentPageFromHash();
            // Asegurarse de que currentPage no exceda el total de páginas
            const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
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
            galleryContainer.innerHTML = "<p>Error al cargar los skins...</p>";
            renderCart();
        }
    }

    function renderPage() { // Esta función ahora solo llama a los renders específicos
        renderGallery();
        renderPaginationControls();
        // El scroll se maneja cuando se cambia de página explícitamente
    }

    function navigateToPage(pageNumber) {
        const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
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
        if (!galleryContainer) return; // Guard clause for tutorial page

        const currentLang = getSavedLanguage();
        const t = TRANSLATIONS[currentLang];

        galleryContainer.innerHTML = '';
        
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const itemsToDisplay = allItems.slice(startIndex, endIndex);

        if (allItems.length === 0 && !galleryContainer.querySelector('p')) {
            const p = document.createElement('p');
            p.dataset.i18n = "no_skins";
            p.textContent = t.no_skins;
            galleryContainer.appendChild(p);
            return;
        }
        if (itemsToDisplay.length === 0 && allItems.length > 0) {
             const p = document.createElement('p');
             p.dataset.i18n = "no_more_skins";
             p.textContent = t.no_more_skins;
             galleryContainer.appendChild(p);
             return;
        }

        itemsToDisplay.forEach(item => {
            const card = document.createElement('div');
            card.classList.add('npc-card');
            card.dataset.id = item.id;

            const img = document.createElement('img');
            img.src = item.png_url;
            img.alt = `Skin ${item.name}`;
            img.loading = 'lazy';

            const name = document.createElement('h3');
            name.textContent = item.name;

            const addButton = document.createElement('button');
            addButton.classList.add('button', 'add-to-cart-btn');
            addButton.addEventListener('click', () => handleToggleCartItem(item.id));

            card.appendChild(img);
            card.appendChild(name);
            card.appendChild(addButton);
            galleryContainer.appendChild(card);
        });
        updateAllGalleryButtonVisuals();
    }

    function updateButtonVisualState(button, itemId) {
        const currentLang = getSavedLanguage();
        const t = TRANSLATIONS[currentLang];
        if (cart.has(itemId)) {
            button.innerHTML = t.btn_remove;
            button.classList.add('added');
        } else {
            button.innerHTML = t.btn_add;
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
        if (!paginationControlsContainer) return;
        const currentLang = getSavedLanguage();
        const t = TRANSLATIONS[currentLang];

        paginationControlsContainer.innerHTML = '';
        if (allItems.length === 0) return; // No mostrar paginación si no hay items

        const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);

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
        paginationControlsContainer.appendChild(createPageButton(currentPage - 1, t.pagination_prev, currentPage === 1));

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
        paginationControlsContainer.appendChild(createPageButton(currentPage + 1, t.pagination_next, currentPage === totalPages));
    }

    // --- Funciones del carrito (renderCart, clearCartBtn, downloadSelectedBtn) sin cambios mayores ---
    // ... (copia las funciones renderCart, clearCartBtn listener, downloadSelectedBtn listener de tu versión anterior que funcionaba bien) ...
    // Asegúrate de que estas funciones sigan usando `allItems` correctamente.

function renderCart() {
    if (!cartItemsUl) return; // Guard clause for tutorial page
    const currentLang = getSavedLanguage();
    const t = TRANSLATIONS[currentLang];

    cartItemsUl.innerHTML = ''; // Limpiar siempre antes de re-renderizar
    if(cartCountSpan) cartCountSpan.textContent = cart.size;
    if(downloadSelectedBtn) downloadSelectedBtn.disabled = cart.size === 0;

    if (cart.size === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = t.cart_empty;
        emptyLi.dataset.i18n = "cart_empty";
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
                    imgThumbnail.loading = 'lazy'; // Puede ser útil si hay muchas imágenes

                    // Crear el span para el nombre
                    const itemNameSpan = document.createElement('span');
                    itemNameSpan.textContent = item.name; // El nombre del item (ID)

                    // Añadir imagen y nombre al contenedor de información
                    itemInfo.appendChild(imgThumbnail);
                    itemInfo.appendChild(itemNameSpan);
                    
                    li.appendChild(itemInfo); // Añadir el div con img y nombre al li

                    const removeBtn = document.createElement('button');
                    removeBtn.classList.add('remove-item-btn');
                    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                    removeBtn.title = "Quitar del carrito";
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
                    downloadSelectedBtn.disabled = cart.size === 0;
                }
            });
        } else {
            if (cart.size > 0) {
                const loadingLi = document.createElement('li');
                loadingLi.textContent = t.cart_loading.replace('{n}', cart.size);
                cartItemsUl.appendChild(loadingLi);
            }
        }
    }
}

    // Add event listener only if element exists (for tutorial page compatibility)
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            cart.clear();
            saveCartToStorage();
            renderCart();
            updateAllGalleryButtonVisuals();
        });
    }

    if (downloadSelectedBtn) {
        downloadSelectedBtn.addEventListener('click', async () => {
            if (cart.size === 0 || allItems.length === 0) {
                // Should use translations for alert too, but keeping simple for now or fetch from t
                // alert("El carrito está vacío o los datos de los items aún no han cargado.");
                return;
            }
            const currentLang = getSavedLanguage();
            const t = TRANSLATIONS[currentLang];

            // Store the original HTML structure (icon + span)
            const originalButtonContent = downloadSelectedBtn.innerHTML;

            downloadSelectedBtn.disabled = true;
            downloadSelectedBtn.innerHTML = t.btn_processing;

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
                if (swfBlob) folder.file(`${item.id}.swf`, swfBlob);
                if (pngBlob) folder.file(`${item.id}.png`, pngBlob);
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
        downloadSelectedBtn.disabled = cart.size === 0;

        // Restore button state with potentially new language text
        const t_latest = TRANSLATIONS[getSavedLanguage()];
        downloadSelectedBtn.innerHTML = `<i class="fas fa-download"></i> <span data-i18n="download_selected">${t_latest.download_selected}</span>`;
    });
    } // End if (downloadSelectedBtn)


    // --- Event Listener para cambios en el Hash de la URL ---
    window.addEventListener('hashchange', () => {
        const pageFromHash = getCurrentPageFromHash();
        if (pageFromHash !== currentPage) { // Solo actuar si la página realmente cambió
            // Validar que pageFromHash esté dentro de los límites una vez que allItems esté cargado
            if (allItems.length > 0) {
                const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
                if (pageFromHash > totalPages || pageFromHash < 1) {
                    // Si está fuera de rango, podría redirigir a la página 1 o la última
                    // o simplemente no hacer nada si ya se manejó en fetchData.
                    // Por ahora, dejamos que navigateToPage maneje la validación.
                }
            }
            navigateToPage(pageFromHash);
        }
    });

    // Listen for language changes to update dynamic JS content
    document.addEventListener('languageChanged', () => {
        renderGallery(); // Re-render gallery cards with new button text and empty state text
        renderPaginationControls(); // Update prev/next buttons
        renderCart(); // Update cart text
    });

    // --- Inicialización ---
    loadCartFromStorage();
    // Only fetch data if we are on the main page (gallery present)
    if (galleryContainer) {
        fetchData();
    }
});