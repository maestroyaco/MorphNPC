const LANG_STORAGE_KEY = 'morphNPCLang';
const DEFAULT_LANG = 'es';

function setLanguage(lang) {
    if (!TRANSLATIONS[lang]) {
        console.warn(`Language ${lang} not found, falling back to ${DEFAULT_LANG}`);
        lang = DEFAULT_LANG;
    }
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    updateDOMText(lang);
    updateLanguageSelectorState(lang);
}

function getSavedLanguage() {
    return localStorage.getItem(LANG_STORAGE_KEY) || DEFAULT_LANG;
}

function updateDOMText(lang) {
    const t = TRANSLATIONS[lang];

    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) {
            if (el.dataset.i18nTarget === 'innerHTML') {
                el.innerHTML = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });

    // Update placeholders if any (not used yet but good practice)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (t[key]) {
            el.placeholder = t[key];
        }
    });

    // Special case for buttons in gallery if they exist and haven't been re-rendered
    // Ideally, app.js logic should handle re-render or update visuals, but for static text changes:
    // We trigger a custom event that app.js can listen to if needed, or app.js functions can check current lang.
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
}

function updateLanguageSelectorState(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function initLanguageSelector() {
    const selectorContainer = document.querySelector('.lang-selector');
    if (!selectorContainer) return;

    selectorContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.lang-btn');
        if (btn) {
            const lang = btn.dataset.lang;
            setLanguage(lang);
        }
    });

    const savedLang = getSavedLanguage();
    setLanguage(savedLang);
}

// Auto-init if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguageSelector);
} else {
    initLanguageSelector();
}
