class BannerManager {
    constructor() {
        this.init();
    }
    init() {
        if (!localStorage.getItem('bannerImage')) {
            localStorage.setItem('bannerImage', '');
        }
        if (!localStorage.getItem('bannerTexts')) {
            localStorage.setItem('bannerTexts', JSON.stringify({
                logoText: 'POLÍCIA MILITAR',
                rumoText: 'RUMO AOS',
                numberText: '200',
                anosText: 'ANOS',
                sloganText: 'VAMOS TODOS JUNTOS. NINGUÉM FICA PARA TRÁS.'
            }));
        }
    }
    getBannerImage() {
        return localStorage.getItem('bannerImage') || '';
    }
    getBannerTexts() {
        const texts = localStorage.getItem('bannerTexts');
        if (texts) {
            return JSON.parse(texts);
        }
        return {
            logoText: 'POLÍCIA MILITAR',
            rumoText: 'RUMO AOS',
            numberText: '200',
            anosText: 'ANOS',
            sloganText: 'VAMOS TODOS JUNTOS. NINGUÉM FICA PARA TRÁS.'
        };
    }
    updateBannerImage(imageUrl) {
        localStorage.setItem('bannerImage', imageUrl || '');
        this.applyBannerImage();
        return { success: true };
    }
    updateBannerTexts(texts) {
        localStorage.setItem('bannerTexts', JSON.stringify(texts));
        this.applyBannerTexts();
        return { success: true };
    }
    applyBannerImage() {
        const banner = document.querySelector('.main-banner');
        const imageUrl = this.getBannerImage();
        if (banner) {
            if (imageUrl && imageUrl.trim() !== '') {
                banner.style.backgroundImage = `url(${imageUrl})`;
                banner.style.backgroundSize = 'cover';
                banner.style.backgroundPosition = 'center';
                banner.style.backgroundRepeat = 'no-repeat';
                banner.style.backgroundBlendMode = 'overlay';
            } else {
                banner.style.backgroundImage = '';
                banner.style.backgroundSize = '';
                banner.style.backgroundPosition = '';
                banner.style.backgroundRepeat = '';
                banner.style.backgroundBlendMode = '';
            }
        }
    }
    applyBannerTexts() {
        const texts = this.getBannerTexts();
        const logoTextEl = document.querySelector('.banner-logo-text');
        const rumoTextEl = document.querySelector('.banner-200 .rumo');
        const numberTextEl = document.querySelector('.banner-200 .number-200');
        const anosTextEl = document.querySelector('.banner-200 .anos');
        const sloganTextEl = document.querySelector('.banner-slogan');
        if (logoTextEl) logoTextEl.textContent = texts.logoText || 'POLÍCIA MILITAR';
        if (rumoTextEl) rumoTextEl.textContent = texts.rumoText || 'RUMO AOS';
        if (numberTextEl) numberTextEl.textContent = texts.numberText || '200';
        if (anosTextEl) anosTextEl.textContent = texts.anosText || 'ANOS';
        if (sloganTextEl) sloganTextEl.textContent = texts.sloganText || 'VAMOS TODOS JUNTOS. NINGUÉM FICA PARA TRÁS.';
    }
}
const bannerManager = new BannerManager();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        bannerManager.applyBannerImage();
        bannerManager.applyBannerTexts();
    });
} else {
    bannerManager.applyBannerImage();
    bannerManager.applyBannerTexts();
}
