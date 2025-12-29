const LANG_STORAGE_KEY = 'morphNPCLang';
const DEFAULT_LANG = 'es';

const LANG_CODES = {
    'es': 'ES',
    'fr': 'FR',
    'pt': 'PT'
};

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
    document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: lang } }));
}

function updateLanguageSelectorState(lang) {
    const currentLangTextSpan = document.getElementById('current-lang-text');
    if (currentLangTextSpan && LANG_CODES[lang]) {
        currentLangTextSpan.textContent = `LANG: ${LANG_CODES[lang]}`;
    }
}

function initLanguageSelector() {
    const langOptions = document.querySelectorAll('.lang-option');
    langOptions.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            setLanguage(lang);
        });
    });

    // Mobile/Click toggle support if hover isn't enough or for better a11y
    const dropBtn = document.querySelector('.lang-dropbtn');
    const dropdownContent = document.querySelector('.lang-dropdown-content');

    if (dropBtn && dropdownContent) {
        dropBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdownContent.style.display === 'block';
            dropdownContent.style.display = isVisible ? '' : 'block'; // '' reverts to css hover state or none
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
             dropdownContent.style.display = '';
        });
    }

    const savedLang = getSavedLanguage();
    setLanguage(savedLang);
}

// Auto-init if DOM is ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguageSelector);
} else {
    initLanguageSelector();
}
