/* =============================================
   HEARTZ LINK – imageUtils.js
   Shared image compression utility.

   All image storage in Heartz Link goes through
   compressImage() so that base-64 strings stored
   in localStorage stay within a safe size budget.

   Target:  ≤ 200 KB per image (≈ 266 KB base-64)
   Method:  Draw onto an off-screen <canvas> that
            is capped at MAX_SIDE × MAX_SIDE pixels,
            then export as JPEG at QUALITY.

   The result is always a data-URL string, compatible
   with the existing JSON export / import system.
   ============================================= */

(function (root) {
    'use strict';

    /* ── Tuning constants ─────────────────────
       MAX_SIDE   : longest edge in pixels after resize.
                   400 px gives a clear card thumbnail
                   while keeping the file small.
       QUALITY    : JPEG quality 0–1.  0.72 is a good
                   balance between clarity and size.
       MAX_BYTES  : hard ceiling on the resulting
                   data-URL byte length.  250 000 ≈
                   187 KB decoded ≈ 250 KB base-64.
                   Anything larger is rejected and the
                   caller receives null.
    ────────────────────────────────────────── */
    var MAX_SIDE  = 400;
    var QUALITY   = 0.72;
    var MAX_BYTES = 250000;   /* characters in the data-URL string */

    /* ── Public API ───────────────────────────
       compressImage(source, callback)

       source   : anything accepted by <img>.src –
                  a data-URL, blob-URL, or http URL.
       callback : function(result)
                    result is a compressed data-URL
                    string, or null if the image could
                    not be processed or was too large
                    even at minimum quality.
    ────────────────────────────────────────── */
    function compressImage(source, callback) {
        if (!source || typeof source !== 'string') {
            callback(null);
            return;
        }

        var img = new Image();

        img.onload = function () {
            try {
                var dataUrl = drawCompressed(img, QUALITY);

                /* If still over budget, try progressively lower quality */
                if (dataUrl && dataUrl.length > MAX_BYTES) {
                    dataUrl = tryLowerQuality(img);
                }

                /* Final guard – if still too large, reject */
                if (!dataUrl || dataUrl.length > MAX_BYTES) {
                    console.warn(
                        '[imageUtils] Image exceeds ' + MAX_BYTES +
                        ' chars even at minimum quality. Storing without image.'
                    );
                    callback(null);
                    return;
                }

                callback(dataUrl);
            } catch (e) {
                console.error('[imageUtils] Canvas draw failed:', e);
                callback(null);
            }
        };

        img.onerror = function () {
            console.warn('[imageUtils] Could not load image source.');
            callback(null);
        };

        /* Avoid tainted-canvas errors for same-origin data-URLs */
        img.crossOrigin = 'anonymous';
        img.src = source;
    }

    /* ── Draw onto a size-capped canvas ─────── */
    function drawCompressed(img, quality) {
        var w = img.naturalWidth  || img.width;
        var h = img.naturalHeight || img.height;

        if (!w || !h) return null;

        /* Scale down proportionally so longest edge ≤ MAX_SIDE */
        if (w > MAX_SIDE || h > MAX_SIDE) {
            if (w >= h) {
                h = Math.round(h * MAX_SIDE / w);
                w = MAX_SIDE;
            } else {
                w = Math.round(w * MAX_SIDE / h);
                h = MAX_SIDE;
            }
        }

        var canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;

        var ctx = canvas.getContext('2d');

        /* Fill with a neutral parchment colour so transparent PNGs
           don't produce a black background when converted to JPEG */
        ctx.fillStyle = '#c8bea5';
        ctx.fillRect(0, 0, w, h);

        ctx.drawImage(img, 0, 0, w, h);

        return canvas.toDataURL('image/jpeg', quality);
    }

    /* ── Retry at lower quality steps ─────────
       Steps: 0.60 → 0.48 → 0.36 → 0.24
       Stop as soon as the result fits in budget.
    ────────────────────────────────────────── */
    function tryLowerQuality(img) {
        var steps = [0.60, 0.48, 0.36, 0.24];
        for (var i = 0; i < steps.length; i++) {
            var result = drawCompressed(img, steps[i]);
            if (result && result.length <= MAX_BYTES) return result;
        }
        return null;
    }

    /* ── compressFile
         Convenience wrapper: reads a File / Blob
         with FileReader and then compresses it.

         compressFile(file, callback)
           callback(dataUrl | null)
    ────────────────────────────────────────── */
    function compressFile(file, callback) {
        if (!file || !file.type.startsWith('image/')) {
            callback(null);
            return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
            compressImage(e.target.result, callback);
        };
        reader.onerror = function () {
            console.warn('[imageUtils] FileReader failed.');
            callback(null);
        };
        reader.readAsDataURL(file);
    }

    /* ── migrateStoredImages
         Call once at startup to recompress any
         oversized images already in localStorage.

         migrateStoredImages(storageKey, callback)
           storageKey : e.g. 'heartzlink_monsters'
           callback   : function() called when done
                        (may be async if migration ran)
    ────────────────────────────────────────── */
    function migrateStoredImages(storageKey, callback) {
        var raw;
        try {
            raw = localStorage.getItem(storageKey);
        } catch (e) {
            if (callback) callback();
            return;
        }

        if (!raw) { if (callback) callback(); return; }

        var items;
        try { items = JSON.parse(raw); } catch (e) { if (callback) callback(); return; }

        if (!Array.isArray(items) || !items.length) { if (callback) callback(); return; }

        /* Find items whose image is over budget */
        var oversized = items.filter(function (item) {
            return item.image &&
                   typeof item.image === 'string' &&
                   item.image.length > MAX_BYTES;
        });

        if (!oversized.length) { if (callback) callback(); return; }

        console.info(
            '[imageUtils] Migrating ' + oversized.length +
            ' oversized image(s) in "' + storageKey + '"…'
        );

        var pending = oversized.length;

        oversized.forEach(function (item) {
            compressImage(item.image, function (compressed) {
                /*
                 * If compression succeeds replace the stored image.
                 * If it fails (e.g. still too large) clear the image
                 * rather than leaving the oversized blob in storage.
                 */
                item.image = compressed || null;

                pending--;
                if (pending === 0) {
                    try {
                        localStorage.setItem(storageKey, JSON.stringify(items));
                        console.info('[imageUtils] Migration complete.');
                    } catch (e) {
                        console.error('[imageUtils] Could not save migrated data:', e);
                    }
                    if (callback) callback();
                }
            });
        });
    }

    /* ── Expose on window.HeartzImageUtils ─── */
    root.HeartzImageUtils = {
        compressImage:       compressImage,
        compressFile:        compressFile,
        migrateStoredImages: migrateStoredImages,
        MAX_BYTES:           MAX_BYTES
    };

}(window));