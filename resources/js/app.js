/**
 * app.js — Application Orchestrator
 * Initializes Neutralino, loads DB, binds all event handlers, and manages state.
 */

// ═══════════════════════════════════════════
// GLOBAL APP STATE & HANDLERS
// ═══════════════════════════════════════════

async function initApp() {
    try {
        if (typeof UI !== 'undefined' && typeof UI.setStartupStatus === 'function') {
            UI.setStartupStatus((AppMeta && AppMeta.startup && AppMeta.startup.boot) || 'Starting...', 0.12);
        }

        const hasNeutralino = typeof Runtime !== 'undefined' && Runtime.isNeutralinoRuntime();
        if (hasNeutralino) {
            Neutralino.init();
            console.log("[App] Neutralino initialized.");
        } else {
            console.log("[App] Running in browser mode.");
        }

        // 1. Initialize Database
        if (typeof UI !== 'undefined' && typeof UI.setStartupStatus === 'function') {
            UI.setStartupStatus((AppMeta && AppMeta.startup && AppMeta.startup.data) || 'Loading local data...', 0.38);
        }
        await DB.init();
        console.log("[App] Database ready.");

        // 2. Load Branding
        const settings = DB.getSettings();
        if (typeof UI !== 'undefined' && typeof UI.setStartupStatus === 'function') {
            UI.setStartupStatus((AppMeta && AppMeta.startup && AppMeta.startup.render) || 'Preparing interface...', 0.72);
        }
        UI.updateBranding(settings);

        // 3. Populate Settings Form
        _populateSettingsForm(settings);

        // 4. Initial data render
        refreshApp();

        // 5. Handle window close
        if (hasNeutralino && Neutralino.events && Neutralino.app) {
            Neutralino.events.on('windowClose', () => {
                Neutralino.app.exit();
            });
        }

        console.log("[App] ✅ Application fully initialized.");
        if (typeof UI !== 'undefined' && typeof UI.finishStartup === 'function') {
            requestAnimationFrame(() => UI.finishStartup());
        }
    } catch (e) {
        console.error("[App] Init error:", e);
        if (typeof UI !== 'undefined' && typeof UI.failStartup === 'function') {
            UI.failStartup((AppMeta && AppMeta.startup && AppMeta.startup.error) || 'Unable to start the desktop app.');
        }
    }
}

/** Refresh all dynamic content */
function refreshApp(search) {
    const settings = DB.getSettings();
    const players = DB.getPlayers(search || '');
    const expenses = DB.getExpenses();
    const fee = settings.subscription_fee || 200;
    const currency = settings.currency || 'د.ج';

    // Update global state for UI access
    window.APP_PLAYERS = players;

    // Stats
    UI.refreshStats(players);

    // Players table
    _renderPlayersTable(players, settings);

    // Finance
    const monthlyCanvas = document.getElementById('financeChart');
    if (monthlyCanvas) {
        Finance.renderMonthlyChart(monthlyCanvas.getContext('2d'), players, expenses, fee);
    }

    const yearlyCanvas = document.getElementById('yearlyProfitChart');
    if (yearlyCanvas) {
        Finance.renderYearlyChart(yearlyCanvas.getContext('2d'), players, expenses, fee);
    }

    Finance.updateSummary(players, expenses, fee, currency);
    Finance.renderExpensesTable(expenses, currency);
}

// ═══════════════════════════════════════════
// PLAYERS
// ═══════════════════════════════════════════

function _renderPlayersTable(players, settings) {
    const tbody = document.getElementById('players-list-body');
    if (!tbody) return;

    const currentMonth = new Date().getMonth();
    const currency = settings.currency || 'د.ج';
    const monthLetters = ['J','F','M','A','M','J','J','A','S','O','N','D'];

    tbody.innerHTML = '';
    players.forEach(p => {
        const tr = document.createElement('tr');
        
        // Build months grid
        let monthsHtml = `<div class="month-grid">`;
        monthLetters.forEach((letter, idx) => {
            const isPaid = p.months && p.months[idx];
            monthsHtml += `
                <div class="month-btn ${isPaid ? 'paid' : ''} ${idx === currentMonth ? 'current' : ''}" 
                     onclick="handleToggleMonth(${p.id}, ${idx})" 
                     title="${UI.getMonthName(idx)}">
                    ${letter}
                </div>
            `;
        });
        monthsHtml += `</div>`;

        tr.innerHTML = `
            <td>
                <div class="player-avatar">
                    ${p.image
                        ? `<img src="${p.image}" alt="${p.name}">`
                        : `<div class="avatar-placeholder"><i class="fas fa-user" style="opacity: 0.5;"></i></div>`
                    }
                </div>
            </td>
            <td><span class="player-name">${p.name}</span></td>
            <td><span style="font-weight:700; color:var(--primary);">${p.monthly_amount || 0}</span> <small>${currency}</small></td>
            <td>${monthsHtml}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-action btn-whatsapp" onclick="handleWhatsApp(${p.id})" title="WhatsApp">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                    <button class="btn btn-action btn-receipt" onclick="handleReceipt(${p.id})" title="وصل PDF">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                    <button class="btn btn-action btn-edit" onclick="handleEditPlayer(${p.id})" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-action btn-delete" onclick="handleDeletePlayer(${p.id})" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleAddPlayer() {
    const name = document.getElementById('player-name-input').value.trim();
    const phone = document.getElementById('player-phone-input').value.trim();
    const date = document.getElementById('player-date-input').value;
    const amount = document.getElementById('player-amount-input').value;
    const image = document.getElementById('player-photo-input').value;

    if (!name || !amount) {
        UI.showToast(UI.t('fillDetails'), 'error');
        return;
    }

    await DB.addPlayer({ 
        name, 
        phone, 
        reg_date: date, 
        monthly_amount: amount,
        image
    });

    // Clear form
    document.getElementById('player-name-input').value = '';
    document.getElementById('player-phone-input').value = '';
    document.getElementById('player-date-input').value = '';
    document.getElementById('player-amount-input').value = '';
    document.getElementById('player-photo-input').value = '';
    document.getElementById('player-photo-preview').innerHTML = '<i class="fas fa-user"></i>';

    refreshApp();
    UI.showToast(UI.currentLang === 'ar' ? 'تمت إضافة اللاعب بنجاح' : 'Joueur ajouté avec succès');
}

async function handlePickPlayerImage(type) {
    const base64 = await Utils.pickImage();
    if (base64) {
        if (type === 'add') {
            document.getElementById('player-photo-input').value = base64;
            document.getElementById('player-photo-preview').innerHTML = `<img src="${base64}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            document.getElementById('edit-player-photo').value = base64;
            document.getElementById('edit-player-preview').innerHTML = `<img src="${base64}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        }
    }
}

function handleEditPlayer(id) {
    const player = DB.getPlayerById(id);
    if (player) {
        UI.showEditPlayerModal(player);
    }
}

async function handleUpdatePlayer() {
    const id = parseInt(document.getElementById('edit-player-id').value);
    const name = document.getElementById('edit-player-name').value.trim();
    const phone = document.getElementById('edit-player-phone').value.trim();
    const date = document.getElementById('edit-player-date').value;
    const amount = document.getElementById('edit-player-amount').value;
    const image = document.getElementById('edit-player-photo').value;

    if (!name || !amount) {
        UI.showToast(UI.t('fillDetails'), 'error');
        return;
    }

    await DB.updatePlayer(id, {
        name,
        phone,
        reg_date: date,
        monthly_amount: amount,
        image
    });

    document.getElementById('editPlayerModal').style.display = 'none';
    refreshApp();
    UI.showToast(UI.currentLang === 'ar' ? 'تم تحديث البيانات' : 'Données mises à jour');
}

async function handleToggleMonth(id, monthIndex) {
    const player = DB.getPlayerById(id);
    if (!player) return;
    const months = [...player.months];
    months[monthIndex] = !months[monthIndex];
    await DB.updatePlayerMonths(id, months);
    refreshApp();
}

async function handleDeletePlayer(id) {
    if (confirm(UI.t('confirmDelete'))) {
        await DB.deletePlayer(id);
        refreshApp();
        UI.showToast(UI.currentLang === 'ar' ? 'تم حذف اللاعب' : 'Joueur supprimé');
    }
}

async function handleWhatsApp(id) {
    const player = DB.getPlayerById(id);
    const settings = DB.getSettings();
    if (player) await Utils.sendWhatsApp(player, settings);
}

function handleReceipt(id) {
    const player = DB.getPlayerById(id);
    const settings = DB.getSettings();
    const currentMonth = new Date().getMonth();
    if (player) Utils.openReceiptPreview(player, currentMonth, settings);
}

function handlePlayerSearch(value) {
    refreshApp(value);
}

// ═══════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════

async function handleAddExpense() {
    const desc = document.getElementById('expense-desc-input').value.trim();
    const amount = document.getElementById('expense-amount-input').value;
    const date = document.getElementById('expense-date-input').value;
    const category = document.getElementById('expense-category-input') ? document.getElementById('expense-category-input').value : 'عام';

    if (!desc || !amount) {
        UI.showToast(UI.t('fillDetails'), 'error');
        return;
    }

    await DB.addExpense({ description: desc, amount: parseFloat(amount), date, category });

    document.getElementById('expense-desc-input').value = '';
    document.getElementById('expense-amount-input').value = '';
    document.getElementById('expense-date-input').value = '';

    refreshApp();
    UI.showToast(UI.currentLang === 'ar' ? 'تمت إضافة المصروف' : 'Dépense ajoutée');
}

async function handleDeleteExpense(id) {
    await DB.deleteExpense(id);
    refreshApp();
}

// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════

function _populateSettingsForm(settings) {
    const fields = {
        'settings-club-name': settings.club_name,
        'settings-club-subtitle': settings.club_subtitle,
        'settings-club-logo': settings.club_logo,
        'settings-sub-fee': settings.subscription_fee,
        'settings-currency': settings.currency,
        'settings-whatsapp-prefix': settings.whatsapp_prefix
    };
    for (const [id, val] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    }
    _renderLogoPreview(settings.club_logo || '');
}

function _renderLogoPreview(logoValue) {
    const img = document.getElementById('settings-logo-preview');
    const placeholder = document.getElementById('settings-logo-placeholder');
    if (!img || !placeholder) return;

    const logo = (logoValue || '').trim();
    const isLikelyValidLogo = logo.startsWith('data:image/') || /^https?:\/\//i.test(logo);

    if (!isLikelyValidLogo || logo.includes('[object ArrayBuffer]')) {
        img.style.display = 'none';
        placeholder.style.display = 'inline-block';
        return;
    }

    placeholder.style.display = 'none';
    img.style.display = 'block';
    img.src = logo;
}

async function handleSaveSettings() {
    const name = document.getElementById('settings-club-name').value.trim();
    const sub = document.getElementById('settings-club-subtitle').value.trim();
    const logo = document.getElementById('settings-club-logo').value.trim();
    const fee = parseFloat(document.getElementById('settings-sub-fee').value) || 200;
    const currency = document.getElementById('settings-currency').value.trim() || 'د.ج';
    const prefix = document.getElementById('settings-whatsapp-prefix').value.trim() || '213';

    await DB.updateSettings({
        club_name: name,
        club_subtitle: sub,
        club_logo: logo,
        subscription_fee: fee,
        currency: currency,
        whatsapp_prefix: prefix
    });

    const settings = DB.getSettings();
    UI.updateBranding(settings);
    _renderLogoPreview(settings.club_logo || '');
    refreshApp();
    UI.showToast(UI.t('identityUpdated'));
}

async function handlePickLogo() {
    const base64 = await Utils.pickImage();
    if (base64) {
        document.getElementById('settings-club-logo').value = base64;
        _renderLogoPreview(base64);
        const currentSettings = DB.getSettings();
        UI.updateBranding({ ...currentSettings, club_logo: base64 });
    }
}

async function handleBackup() {
    try {
        const path = await DB.createBackup();
        UI.showToast(UI.t('backupCreated'));
    } catch(e) {
        UI.showToast('Backup failed', 'error');
    }
}

async function handleFactoryReset() {
    if (confirm(UI.t('confirmReset'))) {
        await DB.factoryReset();
        const settings = DB.getSettings();
        UI.updateBranding(settings);
        _populateSettingsForm(settings);
        refreshApp();
        UI.showToast(UI.t('resetDone'));
    }
}

// ═══════════════════════════════════════════
// EXPORTS & BOOTSTRAP
// ═══════════════════════════════════════════

const APP = {
    getPlayers: () => window.APP_PLAYERS || []
};

initApp();
