// ================= MOBILE MENU TOGGLE =================
// (Removed conflicting toggleMenu - using the one from HTML)

// Initialize mobile menu functionality
document.addEventListener('DOMContentLoaded', function () {
    // Close menu when clicking on a link
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
        link.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            const hamburger = document.querySelector('.hamburger');
            const overlay = document.querySelector('.mobile-menu-overlay');

            navLinks.classList.remove('active');
            hamburger.classList.remove('active');
            overlay.style.display = 'none';
        });
    });
});

// ================= NAVBAR SMOOTH SCROLL + ACTIVE TAB =================

const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll(".nav-links a");

// Smooth scroll (already added but making it cleaner)
navLinks.forEach(link => {
    link.addEventListener("click", function (e) {
        const targetId = this.getAttribute("href");

        if (targetId.startsWith("#")) {
            e.preventDefault();

            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: "smooth"
                });
            }
        }
    });
});

// Active tab while scrolling (PREMIUM FEATURE 🔥)
window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;

        if (scrollY >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        link.classList.remove("active");

        if (link.getAttribute("href") === "#" + current) {
            link.classList.add("active");
        }
    });
});

// ================= SITE-WIDE HELPERS: wire Select buttons =================
document.addEventListener('DOMContentLoaded', function () {

    // Wire Select buttons on any .card elements
    function wireSelectButtons() {
        document.querySelectorAll('.card').forEach(card => {
            if (card.dataset.selectWired) return;
            const btn = card.querySelector('button');
            const titleEl = card.querySelector('h3');
            const name = (titleEl && titleEl.innerText) ? titleEl.innerText.trim() : (card.dataset.name || 'Service');
            if (!btn) return;
            btn.addEventListener('click', function (e) {
                // Use global API if available, otherwise fall back to addCart(name)
                if (window.addServiceToCart) {
                    window.addServiceToCart({
                        name: name,
                        category: window.pageCategory || 'Service',
                        displayPrice: card.dataset.price || card.querySelector('.price')?.innerText || 'Custom',
                        price: card.dataset.price || 0
                    });
                } else if (window.addCart) {
                    try { window.addCart(name); } catch (err) { console.warn('addCart failed', err); }
                } else {
                    // Ensure cart script loads then try again
                    ensureCartScriptLoaded(function () {
                        if (window.addServiceToCart) {
                            window.addServiceToCart({ name: name, category: window.pageCategory || 'Service', displayPrice: 'Custom', price: 0 });
                        } else if (window.addCart) {
                            try { window.addCart(name); } catch (e) { console.warn(e); }
                        }
                    });
                }
            });
            card.dataset.selectWired = '1';
        });
    }

    // initial wiring
    wireSelectButtons();

    // Re-wire if DOM changes (for pages that load content dynamically)
    const mo = new MutationObserver(() => wireSelectButtons());
    mo.observe(document.body, { childList: true, subtree: true });
});

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
