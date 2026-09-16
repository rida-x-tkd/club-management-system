/**
 * db.js — Database Engine (JSON-based persistent storage)
 * Uses Neutralino filesystem API for portable data persistence.
 * All paths use NL_PATH for USB portability.
 */

const DB = (() => {
    const DATA_DIR = () => Runtime.getDataPath('data');
    const DB_FILE = () => Runtime.getDataPath('data/club.json');
    const BACKUP_DIR = () => Runtime.getDataPath('backups');
    const LOCAL_KEY = 'club_management_db';

    // Default database structure
    const DEFAULT_DB = {
        settings: {
            club_name: "جمعية أبطال بوكايسي للتايكوندو",
            club_subtitle: "نظام إدارة اشتراكات النادي المتميز",
            club_logo: "",
            subscription_fee: 200,
            currency: "د.ج",
            whatsapp_prefix: "213"
        },
        players: [],
        expenses: [],
        nextPlayerId: 1,
        nextExpenseId: 1
    };

    let _db = null;
    const _hasNeutralinoFS = () =>
        typeof Runtime !== 'undefined' && Runtime.hasNeutralinoFS();
    const _isBrowserStorageAvailable = () => {
        try {
            return typeof localStorage !== 'undefined';
        } catch (e) {
            return false;
        }
    };

    /** Initialize database — load from disk or create default */
    async function init() {
        if (!_hasNeutralinoFS()) {
            _initFromLocalStorage();
            return;
        }

        try {
            // Ensure data directory exists
            try {
                await Neutralino.filesystem.getStats(DATA_DIR());
            } catch {
                await Neutralino.filesystem.createDirectory(DATA_DIR());
            }

            // Try to load existing DB
            try {
                const raw = await Neutralino.filesystem.readFile(DB_FILE());
                _db = JSON.parse(raw);
                // Merge any missing defaults
                _db.settings = { ...DEFAULT_DB.settings, ..._db.settings };
                if (!_db.expenses) _db.expenses = [];
                if (!_db.nextExpenseId) _db.nextExpenseId = 1;
                console.log("[DB] Loaded existing database.");
            } catch {
                _db = JSON.parse(JSON.stringify(DEFAULT_DB));
                await _save();
                console.log("[DB] Created new database.");
            }
        } catch (e) {
            console.error("[DB] Init failed:", e);
            _db = JSON.parse(JSON.stringify(DEFAULT_DB));
        }
    }

    /** Persist DB to disk */
    async function _save() {
        if (!_hasNeutralinoFS()) {
            _saveToLocalStorage();
            return;
        }

        try {
            await Neutralino.filesystem.writeFile(DB_FILE(), JSON.stringify(_db, null, 2));
        } catch (e) {
            console.error("[DB] Save failed:", e);
        }
    }

    function _initFromLocalStorage() {
        if (!_isBrowserStorageAvailable()) {
            _db = JSON.parse(JSON.stringify(DEFAULT_DB));
            return;
        }

        try {
            const raw = localStorage.getItem(LOCAL_KEY);
            if (!raw) {
                _db = JSON.parse(JSON.stringify(DEFAULT_DB));
                _saveToLocalStorage();
                return;
            }
            _db = JSON.parse(raw);
            _db.settings = { ...DEFAULT_DB.settings, ..._db.settings };
            if (!_db.players) _db.players = [];
            if (!_db.expenses) _db.expenses = [];
            if (!_db.nextPlayerId) _db.nextPlayerId = 1;
            if (!_db.nextExpenseId) _db.nextExpenseId = 1;
        } catch (e) {
            console.error("[DB] LocalStorage init failed:", e);
            _db = JSON.parse(JSON.stringify(DEFAULT_DB));
            _saveToLocalStorage();
        }
    }

    function _saveToLocalStorage() {
        if (!_isBrowserStorageAvailable()) return;
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(_db));
        } catch (e) {
            console.error("[DB] LocalStorage save failed:", e);
        }
    }

    // ───────── SETTINGS ─────────
    function getSettings() {
        return { ..._db.settings };
    }

    async function updateSetting(key, value) {
        _db.settings[key] = value;
        await _save();
    }

    async function updateSettings(obj) {
        _db.settings = { ..._db.settings, ...obj };
        await _save();
    }

    // ───────── PLAYERS ─────────
    function getPlayers(search = "") {
        let list = _db.players;
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || p.phone.includes(q));
        }
        return list.map(p => ({ ...p }));
    }

    function getPlayerById(id) {
        const p = _db.players.find(x => x.id === id);
        return p ? { ...p } : null;
    }

    async function addPlayer(data) {
        const player = {
            id: _db.nextPlayerId++,
            name: data.name || "",
            phone: data.phone || "",
            reg_date: data.reg_date || new Date().toISOString().split('T')[0],
            monthly_amount: parseFloat(data.monthly_amount) || _db.settings.subscription_fee || 200,
            image: data.image || "",
            months: data.months || Array(12).fill(false),
            created_at: new Date().toISOString()
        };
        _db.players.push(player);
        await _save();
        return player;
    }

    async function updatePlayer(id, data) {
        const idx = _db.players.findIndex(x => x.id === id);
        if (idx === -1) return null;
        _db.players[idx] = { ..._db.players[idx], ...data };
        await _save();
        return _db.players[idx];
    }

    async function updatePlayerMonths(id, months) {
        const idx = _db.players.findIndex(x => x.id === id);
        if (idx === -1) return;
        _db.players[idx].months = [...months];
        await _save();
    }

    async function deletePlayer(id) {
        _db.players = _db.players.filter(x => x.id !== id);
        await _save();
    }

    // ───────── EXPENSES ─────────
    function getExpenses() {
        return _db.expenses.map(e => ({ ...e }));
    }

    async function addExpense(data) {
        const expense = {
            id: _db.nextExpenseId++,
            description: data.description || "",
            amount: parseFloat(data.amount) || 0,
            date: data.date || new Date().toISOString().split('T')[0],
            category: data.category || "عام",
            created_at: new Date().toISOString()
        };
        _db.expenses.push(expense);
        await _save();
        return expense;
    }

    async function deleteExpense(id) {
        _db.expenses = _db.expenses.filter(x => x.id !== id);
        await _save();
    }

    // ───────── BACKUP & RESTORE ─────────
    async function createBackup() {
        if (!_hasNeutralinoFS()) {
            throw new Error('Backup requires Neutralino runtime.');
        }
        try {
            try {
                await Neutralino.filesystem.getStats(BACKUP_DIR());
            } catch {
                await Neutralino.filesystem.createDirectory(BACKUP_DIR());
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `${BACKUP_DIR()}/backup_${timestamp}.json`;
            await Neutralino.filesystem.writeFile(backupPath, JSON.stringify(_db, null, 2));
            console.log("[DB] Backup created:", backupPath);
            return backupPath;
        } catch (e) {
            console.error("[DB] Backup failed:", e);
            throw e;
        }
    }

    async function factoryReset() {
        _db = JSON.parse(JSON.stringify(DEFAULT_DB));
        await _save();
        console.log("[DB] Factory reset complete.");
    }

    return {
        init,
        getSettings,
        updateSetting,
        updateSettings,
        getPlayers,
        getPlayerById,
        addPlayer,
        updatePlayer,
        updatePlayerMonths,
        deletePlayer,
        getExpenses,
        addExpense,
        deleteExpense,
        createBackup,
        factoryReset
    };
})();
