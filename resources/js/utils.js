/**
 * utils.js — Utilities
 * PDF generation (html2pdf.js), WhatsApp integration, and image upload.
 */

const Utils = (() => {
    const _neutralinoAvailable = () =>
        typeof Runtime !== 'undefined' &&
        Runtime.hasNeutralinoFS() &&
        Runtime.hasNeutralinoOS();

    /**
     * Generate a PDF receipt for a player's payment.
     */
    async function generateReceipt(player, monthIndex, settings) {
        const receiptHTML = buildReceiptHTML(player, monthIndex, settings);

        // Create a temporary container
        const container = document.createElement('div');
        container.innerHTML = receiptHTML;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);

        try {
            if (typeof html2pdf === 'undefined') {
                _fallbackPrintReceipt(receiptHTML);
                UI.showToast(UI.currentLang === 'ar' ? 'تم فتح نافذة الطباعة لحفظ PDF' : 'Fenêtre d’impression ouverte');
                return;
            }

            const monthName = UI.getMonthName(monthIndex);
            const opt = {
                margin: 10,
                filename: `receipt_${player.name}_${monthName}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
            };

            // Most stable flow across browser + Neutralino: direct file download.
            await html2pdf().set(opt).from(container.firstElementChild).save();
            UI.showToast(UI.currentLang === 'ar' ? 'تم تنزيل الوصل بنجاح' : 'Reçu téléchargé');

        } catch(e) {
            console.error('[Utils] PDF generation error:', e);
            UI.showToast(UI.currentLang === 'ar' ? 'خطأ في إنشاء الوصل' : 'Erreur de génération', 'error');
        } finally {
            document.body.removeChild(container);
        }
    }

    function openReceiptPreview(player, monthIndex, settings) {
        const previewWin = window.open('', '_blank', 'width=520,height=760');
        if (!previewWin) {
            UI.showToast(UI.currentLang === 'ar' ? 'تعذر فتح نافذة المعاينة' : 'Impossible d’ouvrir la fenêtre', 'error');
            return;
        }

        const safePlayerId = Number(player.id) || 0;
        const safeMonth = Number(monthIndex) || 0;
        const receiptHTML = buildReceiptHTML(player, monthIndex, settings);
        const monthName = UI.getMonthName(safeMonth);
        const pdfFileName = `receipt_${safePlayerId}_${monthName}.pdf`;
        const html2pdfSrc = `${window.location.origin}/resources/vendor/html2pdf.bundle.min.js`;

        previewWin.document.write(`
            <html>
                <head>
                    <meta charset="utf-8">
                    <title>معاينة الوصل</title>
                    <style>
                        body {
                            margin: 0;
                            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
                            background: linear-gradient(135deg, #0a0a0f, #161625);
                            padding: 14px;
                        }
                        .toolbar {
                            display: flex;
                            gap: 10px;
                            margin-bottom: 12px;
                            justify-content: flex-end;
                        }
                        button {
                            border: 0;
                            border-radius: 10px;
                            padding: 10px 14px;
                            font-weight: 700;
                            cursor: pointer;
                        }
                        .btn-download { background: #007bff; color: #fff; }
                        .btn-close { background: #2f3348; color: #fff; }
                        .receipt-box {
                            background: #fff;
                            border: 1px solid #2f3348;
                            border-radius: 14px;
                            padding: 10px;
                            box-shadow: 0 12px 35px rgba(0,0,0,0.35);
                        }
                    </style>
                    <script src="${html2pdfSrc}"></script>
                </head>
                <body>
                    <div class="toolbar">
                        <button class="btn-download" onclick="downloadReceiptPdf();">تحميل PDF</button>
                        <button class="btn-close" onclick="window.close();">إغلاق</button>
                    </div>
                    <div id="receipt-content" class="receipt-box">${receiptHTML}</div>
                    <script>
                        async function downloadReceiptPdf() {
                            const el = document.getElementById('receipt-content');
                            if (!el) return;
                            if (typeof html2pdf === 'undefined') {
                                window.print();
                                return;
                            }
                            const options = {
                                margin: 10,
                                filename: '${pdfFileName}',
                                image: { type: 'jpeg', quality: 0.98 },
                                html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
                                jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }
                            };
                            try {
                                await html2pdf().set(options).from(el).save();
                            } catch (e) {
                                window.print();
                            }
                        }
                    </script>
                </body>
            </html>
        `);
        previewWin.document.close();
    }

    function buildReceiptHTML(player, monthIndex, settings) {
        const monthName = UI.getMonthName(monthIndex);
        const fee = parseFloat(player.monthly_amount) || settings.subscription_fee || 200;
        const currency = settings.currency || 'د.ج';
        const clubName = settings.club_name || ((typeof AppMeta !== 'undefined' && AppMeta.defaultClubName) || 'RH GESTION');
        const clubLogo = settings.club_logo || '';
        const systemName = (typeof AppMeta !== 'undefined' && AppMeta.appName) || 'RH GESTION';

        return `
        <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; padding: 30px; max-width: 500px; margin: 0 auto; background: #fff; color: #333;">
            <div style="text-align: center; margin-bottom: 20px;">
                ${clubLogo ? `<img src="${clubLogo}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;">` : ''}
                <h2 style="margin: 0; color: #007bff;">${clubName}</h2>
                <p style="color: #666; font-size: 14px;">وصل دفع الاشتراك الشهري</p>
            </div>
            <hr style="border: 1px solid #eee;">
            <table style="width: 100%; margin-top: 15px; font-size: 14px;">
                <tr><td style="padding: 8px; font-weight: bold;">الاسم:</td><td style="padding: 8px;">${player.name}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">الهاتف:</td><td style="padding: 8px;">${player.phone}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">الشهر:</td><td style="padding: 8px;">${monthName}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">المبلغ:</td><td style="padding: 8px; color: #28a745; font-weight: bold;">${fee} ${currency}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">التاريخ:</td><td style="padding: 8px;">${new Date().toLocaleDateString('ar-DZ')}</td></tr>
            </table>
            <hr style="border: 1px solid #eee; margin-top: 15px;">
            <p style="text-align: center; font-size: 12px; color: #999; margin-top: 15px;">
                © ${new Date().getFullYear()} ${clubName} - Generated by ${systemName}
            </p>
        </div>
        `;
    }

    function _fallbackPrintReceipt(receiptHTML) {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
                <head><meta charset="utf-8"><title>Receipt</title></head>
                <body>${receiptHTML}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 400);
    }

    /**
     * Open WhatsApp with pre-filled message for a player.
     */
    async function sendWhatsApp(player, settings) {
        const clubName = settings.club_name || ((typeof AppMeta !== 'undefined' && AppMeta.defaultClubName) || 'RH GESTION');
        const fee = settings.subscription_fee || 200;
        const currency = settings.currency || 'د.ج';
        const currentMonth = UI.getMonthName(new Date().getMonth());

        const message = encodeURIComponent(
            `*تذكير دفع الاشتراك الشهري* 🥋\n\n` +
            `مرحباً ${player.name}،\n` +
            `يرجى العلم أن اشتراك شهر *${currentMonth}* لم يتم تسويته بعد.\n` +
            `المبلغ المطلوب: *${player.monthly_amount || fee} ${currency}*\n\n` +
            `شكراً لتفهمكم — *${clubName}*`
        );

        const phone = _normalizeWhatsAppNumber(player.phone, settings.whatsapp_prefix);
        if (!phone || phone.length < 8) {
            UI.showToast(UI.currentLang === 'ar' ? 'رقم الهاتف غير صالح' : 'Numéro invalide', 'error');
            return;
        }

        const appUrl = `whatsapp://send?phone=${phone}&text=${message}`;
        const webUrl = `https://wa.me/${phone}?text=${message}`;

        if (_neutralinoAvailable()) {
            const hasNativeWhatsApp = await _hasNativeWhatsAppDesktop();
            if (hasNativeWhatsApp) {
                try {
                    await Neutralino.os.open(appUrl);
                    return;
                } catch (e) {
                    console.warn('[Utils] Native WhatsApp launch failed, falling back to web.', e);
                }
            }

            try {
                await Neutralino.os.open(webUrl);
            } catch (e) {
                window.open(webUrl, '_blank');
            }
            return;
        }
        // Browser mode fallback
        window.open(webUrl, '_blank');
    }

    async function _hasNativeWhatsAppDesktop() {
        if (!_neutralinoAvailable() || typeof Neutralino.os.execCommand !== 'function') {
            return false;
        }

        if (typeof NL_OS !== 'undefined' && NL_OS === 'Windows') {
            try {
                const result = await Neutralino.os.execCommand(
                    'powershell -NoProfile -Command "$exists = Test-Path ''Registry::HKEY_CLASSES_ROOT\\whatsapp''; if ($exists) { Write-Output YES } else { Write-Output NO }"'
                );
                return /YES/i.test((result.stdOut || '').trim());
            } catch (e) {
                console.warn('[Utils] Unable to probe WhatsApp protocol registration.', e);
            }
        }

        return false;
    }

    function _normalizeWhatsAppNumber(playerPhone, prefixValue) {
        const rawPhone = _normalizeArabicDigits((playerPhone || '').trim());
        const rawPrefix = (prefixValue || '').trim();
        if (!rawPhone) return '';

        const phoneStartsIntl = rawPhone.startsWith('+') || rawPhone.startsWith('00');
        let phoneDigits = rawPhone.replace(/\D/g, '');

        // If number already contains country code (+ / 00), keep it directly.
        if (phoneStartsIntl) {
            return phoneDigits.replace(/^00/, '');
        }

        // Extract only country code from prefix input (first 1-4 digits).
        const prefixMatch = _normalizeArabicDigits(rawPrefix).replace(/\D/g, '').match(/^\d{1,4}/);
        const cleanPrefix = prefixMatch ? prefixMatch[0] : '';

        if (cleanPrefix && phoneDigits.startsWith(cleanPrefix)) {
            return phoneDigits;
        }
        if (cleanPrefix && phoneDigits.startsWith('0')) {
            return cleanPrefix + phoneDigits.substring(1);
        }
        if (cleanPrefix) {
            return cleanPrefix + phoneDigits;
        }
        return phoneDigits;
    }

    function _normalizeArabicDigits(value) {
        const arabic = '٠١٢٣٤٥٦٧٨٩';
        const eastern = '۰۱۲۳۴۵۶۷۸۹';
        return value.replace(/[٠-٩]/g, d => String(arabic.indexOf(d)))
                    .replace(/[۰-۹]/g, d => String(eastern.indexOf(d)));
    }

    /**
     * Upload image and return base64 string.
     */
    async function pickImage() {
        const isNeutralino = typeof Runtime !== 'undefined' && Runtime.isNeutralinoRuntime();
        if (!isNeutralino) {
            return _pickImageFromBrowser();
        }

        if (_neutralinoAvailable()) {
            try {
                const entries = await Neutralino.os.showOpenDialog('Select Image', {
                    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
                });
                if (entries && entries.length > 0) {
                    const binaryResult = await Neutralino.filesystem.readBinaryFile(entries[0]);
                    const ext = entries[0].split('.').pop().toLowerCase();
                    const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
                    const base64 = _normalizeBinaryToBase64(binaryResult);
                    return base64 ? `data:${mime};base64,${base64}` : null;
                }
            } catch(e) {
                console.error('[Utils] Image pick error:', e);
            }
        }

        return _pickImageFromBrowser();
    }

    function _pickImageFromBrowser() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = () => {
                const file = input.files && input.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            };
            input.click();
        });
    }

    function _normalizeBinaryToBase64(binaryResult) {
        if (!binaryResult) return '';
        if (typeof binaryResult === 'string') {
            // Some Neutralino builds already return base64 text.
            return binaryResult;
        }
        if (binaryResult instanceof ArrayBuffer) {
            const bytes = new Uint8Array(binaryResult);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }
        if (binaryResult && binaryResult.buffer instanceof ArrayBuffer) {
            const bytes = new Uint8Array(binaryResult.buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }
        return '';
    }

    return {
        generateReceipt,
        openReceiptPreview,
        sendWhatsApp,
        pickImage,
        buildReceiptHTML
    };
})();
