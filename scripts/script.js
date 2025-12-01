document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            const icon = this.querySelector('i');
            if (mainNav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
    document.addEventListener('click', function(e) {
        if (mobileMenuToggle && mainNav && 
            !mainNav.contains(e.target) && 
            !mobileMenuToggle.contains(e.target) &&
            mainNav.classList.contains('active')) {
            mainNav.classList.remove('active');
            const icon = mobileMenuToggle.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
    const dropdowns = document.querySelectorAll('.nav-dropdown');
    dropdowns.forEach(dropdown => {
        const dropdownLink = dropdown.querySelector('.nav-link-dropdown');
        const dropdownMenu = dropdown.querySelector('.dropdown-menu');
        if (dropdownLink && dropdownMenu) {
            dropdownLink.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                dropdowns.forEach(otherDropdown => {
                    if (otherDropdown !== dropdown) {
                        otherDropdown.classList.remove('active');
                    }
                });
                dropdown.classList.toggle('active');
            });
            dropdown.addEventListener('mouseenter', function() {
                dropdown.classList.add('active');
            });
            dropdown.addEventListener('mouseleave', function() {
                if (window.innerWidth > 768) {
                    dropdown.classList.remove('active');
                }
            });
        }
    });
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
    const fontIncrease = document.getElementById('font-increase');
    const fontDecrease = document.getElementById('font-decrease');
    const alertBtn = document.getElementById('alert');
    let currentFontSize = 100; 
    if (fontIncrease) {
        fontIncrease.addEventListener('click', function() {
            currentFontSize = Math.min(currentFontSize + 10, 150);
            document.body.style.fontSize = currentFontSize + '%';
            localStorage.setItem('fontSize', currentFontSize);
        });
    }
    if (fontDecrease) {
        fontDecrease.addEventListener('click', function() {
            currentFontSize = Math.max(currentFontSize - 10, 80);
            document.body.style.fontSize = currentFontSize + '%';
            localStorage.setItem('fontSize', currentFontSize);
        });
    }
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) {
        currentFontSize = parseInt(savedFontSize);
        document.body.style.fontSize = currentFontSize + '%';
    }
    if (alertBtn) {
        alertBtn.addEventListener('click', function() {
            alert('Sistema de alertas da Polícia Militar de São Paulo.\n\nFique atento às informações de segurança pública.');
        });
    }
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    indicators.forEach((indicator, index) => {
        indicator.addEventListener('click', function() {
            indicators.forEach(ind => ind.classList.remove('active'));
            this.classList.add('active');
            currentSlide = index;
        });
    });
    setInterval(function() {
        currentSlide = (currentSlide + 1) % indicators.length;
        indicators.forEach((ind, index) => {
            if (index === currentSlide) {
                ind.classList.add('active');
            } else {
                ind.classList.remove('active');
            }
        });
    }, 5000);
    const serviceItems = document.querySelectorAll('.service-item');
    serviceItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transition = 'transform 0.3s ease';
        });
    });
    const navLinks = document.querySelectorAll('.main-nav a:not(.nav-link-dropdown)');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    const animatedElements = document.querySelectorAll('.service-item, .news-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});
const style = document.createElement('style');
style.textContent = `
    .dark-mode {
        background-color: #1a1a1a !important;
        color: #e0e0e0 !important;
    }
    .dark-mode .top-header {
        background-color: #2d2d2d !important;
        color: #e0e0e0 !important;
    }
    .dark-mode .main-header {
        background-color: #2d2d2d !important;
        color: #e0e0e0 !important;
    }
    .dark-mode .main-header-content {
        background-color: #2d2d2d !important;
    }
    .dark-mode .main-nav a {
        color: #e0e0e0 !important;
    }
    .dark-mode .main-nav a:hover {
        color: #ff0000 !important;
    }
    .dark-mode .page-content {
        background-color: #1a1a1a !important;
        color: #e0e0e0 !important;
    }
    .dark-mode .news-item {
        background-color: #2d2d2d !important;
        color: #e0e0e0 !important;
        border: 1px solid #444 !important;
    }
    .dark-mode .news-item:hover {
        border-left-color: #ff0000 !important;
    }
    .dark-mode .service-item {
        background-color: #2d2d2d !important;
        color: #e0e0e0 !important;
    }
    .dark-mode .admin-container {
        background-color: #1a1a1a !important;
    }
    .dark-mode .admin-header {
        background-color: #2d2d2d !important;
        color: #e0e0e0 !important;
    }
    .dark-mode .admin-panel {
        background-color: #2d2d2d !important;
        color: #e0e0e0 !important;
    }
    .dark-mode .modal {
        background-color: rgba(0, 0, 0, 0.9) !important;
    }
    .dark-mode .modal-content {
        background-color: #2d2d2d !important;
        color: #e0e0e0 !important;
    }
    .dark-mode input,
    .dark-mode textarea,
    .dark-mode select {
        background-color: #1a1a1a !important;
        color: #e0e0e0 !important;
        border: 1px solid #444 !important;
    }
    .dark-mode .btn {
        background-color: #1e3a8a !important;
        color: #e0e0e0 !important;
    }
    .dark-mode .btn:hover {
        background-color: #1e40af !important;
    }
`;
document.head.appendChild(style);
