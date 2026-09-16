/**
 * ui.js — UI Engine
 * Handles navigation, dynamic branding, stats rendering, and DOM updates.
 */

const UI = (() => {
    let currentLang = 'ar';
    let currentSection = 'section-dashboard';
    let startupCompleted = false;
    const APP_WINDOW_TITLE = (typeof AppMeta !== 'undefined' && AppMeta.windowTitle) || 'RH GESTION';
    const DEFAULT_CLUB_NAME = (typeof AppMeta !== 'undefined' && AppMeta.defaultClubName) || APP_WINDOW_TITLE;
    const STARTUP_MESSAGES = (typeof AppMeta !== 'undefined' && AppMeta.startup) || {};

    const MONTH_NAMES_AR = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];
    const MONTH_NAMES_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

    const i18n = {
        ar: {
            dashboard: 'لوحة التحكم',
            players: 'اللاعبين',
            finance: 'المالية',
            settings: 'الإعدادات',
            totalPlayers: 'إجمالي اللاعبين',
            paidThisMonth: 'خالصين هذا الشهر',
            duePlayers: 'متأخرين',
            totalIncome: 'إجمالي المداخيل',
            addPlayer: 'إضافة لاعب جديد',
            fullName: 'الاسم بالكامل',
            phone: 'رقم الهاتف',
            regDate: 'تاريخ التسجيل',
            belt: 'الحزام',
            save: 'حفظ اللاعب',
            playersList: 'قائمة المنخرطين',
            search: 'بحث باسم اللاعب...',
            photo: 'الصورة',
            name: 'الاسم',
            phoneCol: 'الهاتف',
            currentMonth: 'الشهر الحالي',
            actions: 'إجراءات',
            paid: 'خالص',
            due: 'مطلوب',
            confirmDelete: 'هل تؤكد الحذف؟',
            fillDetails: 'الرجاء ملء التفاصيل',
            identitySettings: 'إعدادات الهوية البصرية',
            clubName: 'اسم النادي',
            subtitle: 'الوصف الفرعي',
            logoUrl: 'شعار النادي (Base64 or URL)',
            updateIdentity: 'تحديث الهوية فورياً',
            identityUpdated: 'تم تحديث الهوية بنجاح!',
            incomeOverview: 'نظرة عامة على المداخيل',
            expenseTracker: 'متتبع المصاريف',
            description: 'الوصف',
            amount: 'المبلغ',
            date: 'التاريخ',
            category: 'الفئة',
            addExpense: 'إضافة مصروف',
            netProfit: 'صافي الأرباح',
            backup: 'نسخ احتياطي',
            factoryReset: 'إعادة ضبط المصنع',
            backupCreated: 'تم إنشاء نسخة احتياطية بنجاح!',
            confirmReset: 'هل تؤكد إعادة ضبط المصنع؟ سيتم حذف جميع البيانات!',
            resetDone: 'تم إعادة ضبط المصنع بنجاح!',
            subscriptionFee: 'مبلغ الاشتراك الشهري الأساسي',
            currency: 'العملة',
            months: 'الشهور',
            monthlyAmount: 'المبلغ الشهري',
            listPaid: 'قائمة الخالصين هذا الشهر',
            listDue: 'قائمة المتأخرين هذا الشهر',
            editPlayer: 'تعديل بيانات اللاعب',
            update: 'تحديث البيانات',
            uploadPhoto: 'رفع صورة',
            yearlyOverview: 'نظرة عامة سنوية',
            whatsappPrefix: 'رمز البلد (واتساب)',
            profit: 'الربح',
            loss: 'الخسارة',
            monthlyPerformance: 'أداء الشهر الحالي'
        },
        fr: {
            dashboard: 'Tableau de bord',
            players: 'Membres',
            finance: 'Finance',
            settings: 'Paramètres',
            totalPlayers: 'Membres Totaux',
            paidThisMonth: 'Payés (Mois)',
            unpaidThisMonth: 'Retardataires',
            monthlyIncome: 'Revenus Mensuels',
            yearlyOverview: 'Vue Annuelle',
            monthlyAnalysis: 'Analyse Mensuelle',
            addPlayer: 'Ajouter Membre',
            addExpense: 'Ajouter Dépense',
            saveSettings: 'Enregistrer',
            searchPlaceholder: 'Rechercher un membre...',
            confirmDelete: 'Êtes-vous sûr?',
            confirmReset: 'Voulez-vous tout réinitialiser?',
            resetDone: 'Réinitialisation terminée',
            fillDetails: 'Veuillez remplir les détails',
            amount: 'Montant',
            date: 'Date',
            category: 'Catégorie',
            addExpense: 'Ajouter dépense',
            netProfit: 'Bénéfice net',
            backup: 'Sauvegarde',
            factoryReset: 'Réinitialisation',
            backupCreated: 'Sauvegarde créée avec succès!',
            confirmReset: 'Confirmer la réinitialisation? Toutes les données seront supprimées!',
            resetDone: 'Réinitialisation terminée!',
            subscriptionFee: 'Frais de base',
            currency: 'Devise',
            months: 'Mois',
            monthlyAmount: 'Montant mensuel',
            listPaid: 'Liste des payés ce mois',
            listDue: 'Liste des retardataires',
            editPlayer: 'Modifier le joueur',
            update: 'Mettre à jour',
            uploadPhoto: 'Charger photo',
            yearlyOverview: 'Aperçu annuel',
            monthlyPerformance: 'Performance mensuelle'
        }
    };

    function t(key) {
        return (i18n[currentLang] && i18n[currentLang][key]) || key;
    }

    function getMonthName(index) {
        return currentLang === 'ar' ? MONTH_NAMES_AR[index] : MONTH_NAMES_FR[index];
    }

    function setStartupStatus(message, progress = null) {
        const statusEl = document.getElementById('startup-status');
        const progressEl = document.getElementById('startup-progress-bar');

        if (statusEl && message) {
            statusEl.textContent = message;
        }
        if (progressEl && typeof progress === 'number') {
            const safeProgress = Math.max(0.06, Math.min(1, progress));
            progressEl.style.width = `${Math.round(safeProgress * 100)}%`;
        }
    }

    function finishStartup() {
        if (startupCompleted) return;
        startupCompleted = true;
        setStartupStatus(STARTUP_MESSAGES.ready || 'Application ready.', 1);

        window.setTimeout(() => {
            document.body.classList.remove('app-booting', 'app-failed');
            document.body.classList.add('app-ready');
        }, 220);
    }

    function failStartup(message) {
        const screen = document.getElementById('startup-screen');
        setStartupStatus(message || STARTUP_MESSAGES.error || 'Unable to start the app.', 1);
        document.body.classList.remove('app-ready');
        document.body.classList.add('app-booting', 'app-failed');
        if (screen) {
            screen.classList.add('failed');
        }
    }

    /** Navigate between sections */
    function navigateTo(sectionId) {
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.add('active');
            currentSection = sectionId;
        }

        // Update nav active state
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        const link = document.querySelector(`.nav-links a[data-section="${sectionId}"]`);
        if (link) link.classList.add('active');
    }

    /** Update branding across UI */
    function updateBranding(settings) {
        const logo = (settings.club_logo || '').trim();
        const validLogo = logo.startsWith('data:image/') || /^https?:\/\//i.test(logo);

        document.querySelectorAll('.dynamic-club-name').forEach(el => {
            el.textContent = settings.club_name || DEFAULT_CLUB_NAME;
        });
        document.querySelectorAll('.dynamic-club-subtitle').forEach(el => {
            el.textContent = settings.club_subtitle || '';
        });
        document.querySelectorAll('.dynamic-club-logo').forEach(el => {
            const wrapper = el.closest('.club-logo-wrapper');
            const placeholder = wrapper ? wrapper.querySelector('.club-logo-placeholder') : null;
            if (validLogo && !logo.includes('[object ArrayBuffer]')) {
                el.style.display = 'block';
                el.src = logo;
                if (placeholder) placeholder.style.display = 'none';
                el.onerror = () => {
                    el.style.display = 'none';
                    if (placeholder) placeholder.style.display = 'block';
                };
                el.onload = () => {
                    if (placeholder) placeholder.style.display = 'none';
                };
            } else {
                el.style.display = 'none';
                el.removeAttribute('src');
                if (placeholder) placeholder.style.display = 'block';
            }
        });
        // Update window title
        try {
            const title = settings.club_name
                ? `${APP_WINDOW_TITLE} | ${settings.club_name}`
                : APP_WINDOW_TITLE;
            if (typeof Runtime !== 'undefined' && Runtime.isNeutralinoRuntime()) {
                Neutralino.window.setTitle(title);
            } else {
                document.title = title;
            }
        } catch(e) {}
    }

    /** Refresh dashboard stats */
    function refreshStats(players) {
        const currentMonth = new Date().getMonth();
        const total = players.length;
        const paid = players.filter(p => p.months && p.months[currentMonth]).length;
        const due = total - paid;

        _animateNumber('stat-total-players', total);
        _animateNumber('stat-paid-this-month', paid);
        _animateNumber('stat-due-players', due);
    }

    /** Animate number counting */
    function _animateNumber(elementId, targetValue) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const current = parseInt(el.textContent) || 0;
        if (current === targetValue) return;

        const duration = 500;
        const steps = 20;
        const increment = (targetValue - current) / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            if (step >= steps) {
                el.textContent = targetValue;
                clearInterval(timer);
            } else {
                el.textContent = Math.round(current + increment * step);
            }
        }, duration / steps);
    }

    /** Set language */
    function setLanguage(lang) {
        currentLang = lang;
        const htmlEl = document.documentElement;
        htmlEl.lang = lang;
        htmlEl.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Update lang button text
        const btnText = document.getElementById('lang-btn-text');
        if (btnText) btnText.textContent = lang === 'ar' ? 'FR' : 'AR';

        // Update all i18n elements
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = t(key);
        });

        // Trigger a refresh of all tables
        if (typeof refreshApp === 'function') refreshApp();
    }

    /** Show toast notification */
    function showToast(message, type = 'success') {
        // Remove existing toasts
        document.querySelectorAll('.toast-notification').forEach(t => t.remove());

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /** Show dashboard status modal (Paid/Due list) */
    function showStatusModal(type) {
        const players = (typeof APP !== 'undefined' && APP.getPlayers()) || [];
        const currentMonth = new Date().getMonth();
        const filtered = players.filter(p => {
            const isPaid = p.months && p.months[currentMonth];
            return type === 'paid' ? isPaid : !isPaid;
        });

        const titleEl = document.getElementById('statusModalTitle');
        const bodyEl = document.getElementById('statusModalBody');
        const modal = document.getElementById('statusModal');

        if (titleEl) titleEl.textContent = type === 'paid' ? t('listPaid') : t('listDue');
        if (bodyEl) {
            if (filtered.length === 0) {
                bodyEl.innerHTML = `<p style="color: var(--text-dim); text-align: center; padding: 20px;">${type === 'paid' ? 'لا يوجد خالصون حالياً' : 'الكل خالص!'}</p>`;
            } else {
                bodyEl.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${filtered.map(p => `
                            <div style="background: rgba(255,255,255,0.05); padding: 12px 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--glass-border);">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div class="avatar-placeholder" style="width: 32px; height: 32px; border-radius: 50%; font-size: 0.8em;">
                                        ${p.name.charAt(0)}
                                    </div>
                                    <span style="font-weight: 600;">${p.name}</span>
                                </div>
                                <div style="color: var(--text-dim); font-size: 0.85em;">
                                    ${p.monthly_amount || 0} ${DB.getSettings().currency}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        if (modal) modal.style.display = 'flex';
    }

    /** Show edit player modal */
    function showEditPlayerModal(player) {
        const modal = document.getElementById('editPlayerModal');
        if (!modal) return;

        // Populate fields
        document.getElementById('edit-player-id').value = player.id;
        document.getElementById('edit-player-name').value = player.name;
        document.getElementById('edit-player-phone').value = player.phone;
        document.getElementById('edit-player-date').value = player.reg_date;
        document.getElementById('edit-player-amount').value = player.monthly_amount;
        
        // Preview image
        const preview = document.getElementById('edit-player-preview');
        if (preview) {
            preview.innerHTML = player.image 
                ? `<img src="${player.image}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
                : `<i class="fas fa-user" style="font-size: 2em; color: var(--primary);"></i>`;
        }

        modal.style.display = 'flex';
    }

    return {
        navigateTo,
        showStatusModal,
        showEditPlayerModal,
        setStartupStatus,
        finishStartup,
        failStartup,
        updateBranding,
        refreshStats,
        setLanguage,
        showToast,
        t,
        getMonthName,
        get currentLang() { return currentLang; },
        get currentSection() { return currentSection; }
    };
})();
