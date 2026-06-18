const CART_STORAGE_KEY = 'planoraCart';
const EVENT_STORAGE_KEY = 'planoraSelectedEvent';
const BOOKING_STORAGE_KEY = 'planoraBookingDraft';
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzAQHa8LinuKXOE-QiXejFiJPkzd7Px645pmQgeC32uY_8pLpMnpoLdhHTPjt5WEHVGTQ/exec';
const ADMIN_WHATSAPP = '9243108170';

function isSheetsConfigured() {
    return typeof SHEETS_URL === 'string' && SHEETS_URL.length > 0 && !SHEETS_URL.includes('REPLACE_WITH_YOUR_SCRIPT') && SHEETS_URL.startsWith('https://');
}

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    } catch (err) {
        return [];
    
    }
}

function saveCart(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    renderCartCount();
    renderPageCart();
}

function getCurrentEvent() {
    return localStorage.getItem(EVENT_STORAGE_KEY) || '';
}

function setCurrentEvent(eventName) {
    if (!eventName) return;
    localStorage.setItem(EVENT_STORAGE_KEY, eventName);
    renderCartCount();
}

function parsePrice(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;

    const normalized = String(value).replace(/,/g, '').trim();
    const found = normalized.match(/\d+(?:\.\d+)?/g);
    if (!found || found.length === 0) return 0;
    return Number(found[0]);
}

function buildCartItem(item) {
    return {
        id: item.id || `${item.category || 'service'}-${item.vendor || item.name}`.replace(/\s+/g, '-').toLowerCase(),
        event: getCurrentEvent() || item.event || 'General Event',
        service: item.service || item.category || 'Service',
        vendor: item.vendor || item.name || 'Vendor',
        category: item.category || item.service || 'General',
        price: parsePrice(item.price || item.charges || item.priceText || item.rate || 0),
        displayPrice: item.displayPrice || item.price || item.charges || item.priceText || 'Custom',
        qty: item.qty || 1,
        notes: item.notes || ''
    };
}

function findPageItem(name) {
    if (!window.pageItems || !Array.isArray(window.pageItems)) return null;
    return window.pageItems.find(it => String(it.name).trim() === String(name).trim());
}

function addCart(name) {
    let item = findPageItem(name);
    if (!item) {
        item = {
            name,
            category: window.pageCategory || 'Service',
            vendor: name,
            service: window.pageCategory || 'Service',
            displayPrice: 'Custom',
            price: 0,
            qty: 1
        };
    }
    const cart = getCart();
    const id = `${window.pageCategory || item.category || 'service'}-${item.name}`.replace(/\s+/g, '-').toLowerCase();
    const existing = cart.find(entry => entry.id === id);
    if (existing) {
        existing.qty += 1;
    } else {
        const newItem = buildCartItem({
            id,
            name: item.name,
            category: window.pageCategory || item.category || 'Service',
            vendor: item.vendor || item.name,
            service: item.service || item.category || window.pageCategory || 'Service',
            price: parsePrice(item.price || item.charges || item.priceText || item.rate || 0),
            displayPrice: item.displayPrice || item.price || item.charges || item.priceText || 'Custom',
            qty: 1
        });
        cart.push(newItem);
    }
    saveCart(cart);
    showToast(`Added to cart: ${item.name}`);
}

function addServiceToCart(item) {
    const cart = getCart();
    const normalizedItem = buildCartItem(item);
    const existing = cart.find(entry => entry.id === normalizedItem.id);
    if (existing) {
        existing.qty += normalizedItem.qty;
    } else {
        cart.push(normalizedItem);
    }
    saveCart(cart);
    showToast(`Added to cart: ${normalizedItem.vendor}`);
}

function removeCartItem(itemId) {
    const cart = getCart().filter(item => item.id !== itemId);
    saveCart(cart);
}

function updateCartQuantity(itemId, qty) {
    const cart = getCart();
    const entry = cart.find(item => item.id === itemId);
    if (!entry) return;
    entry.qty = Math.max(1, Number(qty) || 1);
    saveCart(cart);
}

function clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
    saveCart([]);
}

function getCartTotal() {
    return getCart().reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
}

function renderCartCount() {
    const count = getCart().reduce((sum, item) => sum + item.qty, 0);
    const badge = document.querySelector('.cart-badge');
    if (badge) badge.textContent = count;
    const label = document.querySelector('.cart-label');
    if (label) label.textContent = `Cart (${count})`;
}

function renderPageCart() {
    renderCartCount();
    renderMiniCart();
    renderCartPage();
    renderBookingSummary();
}

function renderMiniCart() {
    const mini = document.getElementById('cartList');
    if (!mini) return;
    const cart = getCart();
    mini.innerHTML = '';
    if (cart.length === 0) {
        mini.innerHTML = '<li>Your cart is empty.</li>';
        return;
    }
    cart.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.qty}x ${item.vendor}`;
        mini.appendChild(li);
    });
}

function renderCartPage() {
    const tableBody = document.getElementById('cartTableBody');
    if (!tableBody) return;
    const cart = getCart();
    tableBody.innerHTML = '';
    if (cart.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">Your cart is empty. Continue shopping to add services.</td></tr>';
        const summaryEl = document.getElementById('cartSummaryText');
        if (summaryEl) summaryEl.textContent = 'Cart is empty';
        const totalEl = document.getElementById('cartTotalValue');
        if (totalEl) totalEl.textContent = '₹0';
        return;
    }
    cart.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
<td>${item.category}</td>
<td>${item.vendor}</td>
<td>${item.displayPrice || 'Custom'}</td>
<td><input type="number" min="1" value="${item.qty}" onchange="updateCartQuantity('${item.id}', this.value)"></td>
<td>₹${(item.price || 0) * item.qty}</td>
<td class="cart-actions">
<button class="btn-secondary" onclick="removeCartItem('${item.id}')">Remove</button>
<button class="btn-secondary" onclick="replaceService('${item.category}')">Replace</button>
</td>
`;
        tableBody.appendChild(row);
    });
    document.getElementById('cartTotalValue').textContent = `₹${getCartTotal()}`;
    const summaryTextEl = document.getElementById('cartSummaryText');
    if (summaryTextEl) summaryTextEl.textContent = `${cart.length} item(s) ready for booking.`;
}

function renderBookingSummary() {
    const summary = document.getElementById('bookingSummary');
    const eventName = getCurrentEvent() || 'No event selected';
    if (!summary) return;
    const cart = getCart();
    const total = getCartTotal();
    let html = `<div class="summary-card"><h3>Selected Event</h3><p>${eventName}</p></div>`;
    if (cart.length === 0) {
        html += '<div class="summary-card"><p>Your cart is empty. Please add services before booking.</p></div>';
        summary.innerHTML = html;
        document.getElementById('estimatedTotal').textContent = '₹0';
        return;
    }
    html += '<div class="summary-card"><h3>Selected Services</h3><ul class="summary-list">';
    cart.forEach(item => {
        html += `<li>${item.qty} × ${item.vendor} (${item.category}) — ${item.displayPrice || 'Custom'}</li>`;
    });
    html += '</ul></div>';
    summary.innerHTML = html;
    const est = document.getElementById('estimatedTotal');
    if (est) est.textContent = `₹${total}`;
}

function replaceService(category) {
    const mapping = {
        Decoration: 'decoration.html',
        DJ: 'dj sound.html',
        Catering: 'catrers.html',
        Photography: 'photographers.html',
        Anchors: 'anchors.html',
        Invitations: 'invation card.html',
        Mehndi: 'mahandi.html',
        Hotels: 'hotel.html',
        Gardens: 'garden.html'
    };
    const target = mapping[category] || 'index.html';
    window.location.href = target;
}

function showToast(message) {
    const existing = document.getElementById('globalToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'globalToast';
    toast.className = 'toast-notice';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function createStickyCart() {
    if (document.querySelector('.cart-widget')) return;
    const widget = document.createElement('a');
    widget.className = 'cart-widget';
    widget.href = 'cart.html';
    widget.innerHTML = `
<span class="cart-icon">🛒</span>
<span class="cart-label">Cart (0)</span>
<span class="cart-badge">0</span>
`;
    document.body.appendChild(widget);
}

function formatWhatsAppNumber(number) {
    const digits = String(number || '').replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    if (digits.length > 10) return digits;
    return digits;
}

function buildWhatsAppMessage(data) {
    const items = (data.cart || []).map(item => `${item.qty}× ${item.vendor} (${item.category}) - ${item.displayPrice || '₹' + item.price}`).join('\n');
    return `Hello Planora Team,\n\nI want to book the following services:\n\nName: ${data.customerName}\nPhone: ${data.customerPhone}\nWhatsApp: ${data.customerWhatsApp}\nEmail: ${data.customerEmail || 'N/A'}\nDate: ${data.eventDate}\nGuests: ${data.guestCount}\nCity: ${data.city}\nAddress: ${data.address}\nRating: ${data.customerRating || 'N/A'}\nComments: ${data.customerFeedback || 'None'}\nNotes: ${data.specialInstructions || 'None'}\nEvent: ${data.eventName}\n\nServices:\n${items}\n\nEstimated Total: ₹${data.total}`;
}

function postBookingToSheet(payload) {
    return fetch(SHEETS_URL, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(res => res.text().then(text => ({ ok: res.ok, status: res.status, text })));
}
function confirmBooking() {
    const form = document.getElementById('bookingForm');
    if (!form) return;

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const cart = getCart();
    if (!cart || cart.length === 0) {
        showToast('Please add at least one service to the cart before booking.');
        return;
    }

    const payload = {
        customerName: document.getElementById('custName').value.trim(),
        customerPhone: document.getElementById('custPhone').value.trim(),
        customerWhatsApp: document.getElementById('custWhatsApp').value.trim(),
        customerEmail: document.getElementById('custEmail').value.trim(),
        eventDate: document.getElementById('custDate').value,
        guestCount: document.getElementById('custGuests').value,
        city: document.getElementById('custCity').value.trim(),
        address: document.getElementById('custAddress').value.trim(),
        specialInstructions: document.getElementById('custNotes').value.trim(),
        customerRating: document.getElementById('custRating') ? document.getElementById('custRating').value : '',
        customerFeedback: document.getElementById('custFeedback') ? document.getElementById('custFeedback').value.trim() : '',
        eventName: getCurrentEvent() || 'General Booking',
        cart: cart,
        total: getCartTotal(),
        submittedAt: new Date().toISOString()
    };

    const whatsappNumber = formatWhatsAppNumber(ADMIN_WHATSAPP);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildWhatsAppMessage(payload))}`;
    const notice = document.getElementById('integrationNotice');

    if (notice) {
        notice.style.display = 'none';
    }

    window.open(whatsappUrl, '_blank');

    if (isSheetsConfigured()) {
        postBookingToSheet(payload)
            .then(result => {
                if (result && result.ok) {
                    showToast('Booking saved to spreadsheet. WhatsApp opened.');
                } else {
                    showToast('Booking spreadsheet submission failed. WhatsApp opened.');
                }
            })
            .catch(error => {
                console.error('Sheet submission error:', error);
                showToast('Sheet save failed. WhatsApp opened.');
            });
    } else {
        showToast('Opening WhatsApp. Spreadsheet saving is not configured.');
    }
}

function initCartUI() {
    createStickyCart();
    renderCartCount();
    renderMiniCart();
    if (window.pageEventName) {
        setCurrentEvent(window.pageEventName);
    }
    const integrationNotice = document.getElementById('integrationNotice');
    if (integrationNotice) {
        integrationNotice.style.display = 'block';
        if (isSheetsConfigured()) {
            integrationNotice.style.background = '#e8f8f0';
            integrationNotice.style.color = '#155724';
            integrationNotice.textContent = 'Google Sheets booking integration is enabled.';
        } else {
            integrationNotice.style.background = '#fff4e5';
            integrationNotice.style.color = '#7a4f01';
            integrationNotice.textContent = 'Google Sheets integration is not configured. Update js/cart.js SHEETS_URL with your Apps Script URL.';
        }
    }

    // Ensure every page nav shows a View Cart link (for vendor pages without header edits)
    try {
        const nav = document.querySelector('.nav-links-pc');
        if (nav && !nav.querySelector('a[href="cart.html"]')) {
            const a = document.createElement('a');
            a.href = 'cart.html';
            a.textContent = 'View Cart';
            a.style.marginLeft = '8px';
            nav.appendChild(a);
        }
    } catch (e) {
        // ignore
    }

    // Auto-add service items to cart when user clicks service links (so they are pre-selected)
    try {
        const serviceItems = document.querySelectorAll('.service-item');
        serviceItems.forEach(el => {
            el.addEventListener('click', (ev) => {
                try {
                    const titleEl = el.querySelector('h3') || el.querySelector('h2') || el;
                    let vendorName = titleEl ? titleEl.textContent.trim() : el.textContent.trim();
                    // clean emoji if present
                    vendorName = vendorName.replace(/^\s*[^a-zA-Z0-9]+\s*/, '').trim();
                    addServiceToCart({vendor: vendorName, category: document.title || 'Service', price: 0, displayPrice: 'Custom'});
                    showToast(`Added to cart: ${vendorName}`);
                } catch (e) {
                    // ignore
                }
            }, {passive: true});
        });
    } catch (e) {
        // ignore
    }
}

window.addEventListener('DOMContentLoaded', initCartUI);
window.addServiceToCart = addServiceToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeCartItem = removeCartItem;
window.clearCart = clearCart;
window.replaceService = replaceService;
window.setCurrentEvent = setCurrentEvent;
window.getCurrentEvent = getCurrentEvent;
window.getCartTotal = getCartTotal;
window.renderCartPage = renderCartPage;
window.renderBookingSummary = renderBookingSummary;
window.confirmBooking = confirmBooking;
window.addCart = addCart;

function ensureTranslateElement() {
    if (!document.getElementById('google_translate_element')) {
        const translateRoot = document.createElement('div');
        translateRoot.id = 'google_translate_element';
        translateRoot.style.display = 'none';
        document.body.appendChild(translateRoot);
    }
}

function setActiveLangButton(lang) {
    const normalized = String(lang).toLowerCase();
    document.querySelectorAll('.lang-btn').forEach(btn => {
        const text = btn.textContent.trim().toLowerCase();
        btn.classList.toggle('active', text === normalized);
    });
}

function loadGoogleTranslate() {
    if (window.googleTranslateInitialized) return;
    window.googleTranslateInitialized = true;
    ensureTranslateElement();
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.id = 'google-translate-script';
    document.head.appendChild(script);
}

window.googleTranslateElementInit = function () {
    if (!window.google || !window.google.translate) return;
    new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'en,hi',
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
    }, 'google_translate_element');
    window.googleTranslateReady = true;
    if (window.pendingTranslateLang) {
        setTimeout(() => translatePage(window.pendingTranslateLang), 800);
    }
};

function translatePage(lang) {
    setActiveLangButton(lang);
    
    // Map language display names to language codes
    const langMap = { 'en': 'English', 'hi': 'Hindi' };
    
    // Try multiple ways to trigger translation
    const tryTranslate = (attempts = 0) => {
        if (attempts > 10) {
            console.warn('Google Translate not ready after 10 attempts');
            return;
        }
        
        // Method 1: Direct API call if available
        if (window.google && window.google.translate && window.google.translate.translatePage) {
            try {
                window.google.translate.translatePage('en', lang);
                console.log('Translated using direct API to:', lang);
                return;
            } catch (e) {
                console.log('Direct API not available, trying select method');
            }
        }
        
        // Method 2: Use the select dropdown
        const select = document.querySelector('#google_translate_element select');
        if (select && select.options) {
            let found = false;
            for (let i = 0; i < select.options.length; i++) {
                const opt = select.options[i];
                if (opt.value === lang || opt.textContent.toLowerCase().includes(lang.toLowerCase())) {
                    select.value = opt.value;
                    found = true;
                    break;
                }
            }
            if (found) {
                select.dispatchEvent(new Event('change'));
                console.log('Translated using select to:', lang);
                return;
            }
        }
        
        // Retry after delay
        setTimeout(() => tryTranslate(attempts + 1), 300);
    };
    
    if (window.googleTranslateReady) {
        tryTranslate();
    } else {
        window.pendingTranslateLang = lang;
        loadGoogleTranslate();
    }
}

window.translatePage = translatePage;

// Expose configuration and helpers to pages
window.SHEETS_URL = SHEETS_URL;
window.ADMIN_WHATSAPP = ADMIN_WHATSAPP;
window.isSheetsConfigured = isSheetsConfigured;
