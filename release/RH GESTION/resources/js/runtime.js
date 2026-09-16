/**
 * runtime.js — Environment detection helpers
 * Keeps runtime checks consistent across modules.
 */

const AppMeta = Object.freeze({
    appName: 'RH GESTION',
    windowTitle: 'RH GESTION',
    defaultClubName: 'RH GESTION',
    defaultClubSubtitle: 'Gestion locale hors ligne',
    startup: {
        boot: 'جاري تشغيل RH GESTION...',
        data: 'جاري تحميل البيانات المحلية...',
        render: 'جاري تجهيز الواجهة المكتبية...',
        ready: 'تم تجهيز النسخة المكتبية بنجاح.',
        error: 'تعذر تشغيل RH GESTION. تحقق من ملفات التطبيق المحلية.'
    }
});

const Runtime = (() => {
    function isNeutralinoRuntime() {
        return (
            typeof Neutralino !== 'undefined' &&
            typeof NL_PATH === 'string' &&
            typeof NL_PORT !== 'undefined' &&
            typeof NL_TOKEN !== 'undefined' &&
            Neutralino &&
            typeof Neutralino.init === 'function'
        );
    }

    function hasNeutralinoFS() {
        return (
            isNeutralinoRuntime() &&
            Neutralino.filesystem &&
            typeof Neutralino.filesystem.readFile === 'function' &&
            typeof Neutralino.filesystem.writeFile === 'function'
        );
    }

    function hasNeutralinoOS() {
        return (
            isNeutralinoRuntime() &&
            Neutralino.os &&
            typeof Neutralino.os.open === 'function'
        );
    }

    function getDataPath(relativePath) {
        if (!isNeutralinoRuntime()) return '';
        return `${NL_PATH}/${relativePath}`;
    }

    return {
        isNeutralinoRuntime,
        hasNeutralinoFS,
        hasNeutralinoOS,
        getDataPath
    };
})();
