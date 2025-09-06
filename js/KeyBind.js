// Window Keybinding System
(function () {
    // Fungsi untuk memastikan WindowManager tersedia sebelum digunakan
    function ensureWindowManager(callback) {
        if (typeof WindowManager !== 'undefined' && WindowManager.createWindow) {
            // WindowManager tersedia langsung
            callback(WindowManager);
            return;
        }

        // Coba akses melalui window
        if (window.WindowManager && window.WindowManager.createWindow) {
            callback(window.WindowManager);
            return;
        }

        console.log("[KeyBind] WindowManager belum tersedia, menunggu...");

        // Tunggu sebentar dan coba lagi
        setTimeout(() => {
            if (typeof WindowManager !== 'undefined' && WindowManager.createWindow) {
                callback(WindowManager);
                return;
            }

            if (window.WindowManager && window.WindowManager.createWindow) {
                callback(window.WindowManager);
                return;
            }

            console.error("[KeyBind] WindowManager tidak tersedia setelah beberapa saat");
        }, 1000);
    }

    // Inisialisasi saat dokumen siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initKeyBindings);
    } else {
        initKeyBindings();
    }

    function initKeyBindings() {
        console.log("[KeyBind] Initializing key bindings...");

        // Pastikan WindowManager sudah tersedia dahulu
        ensureWindowManager(WM => {
            console.log("[KeyBind] WindowManager tersedia, menambahkan keyboard shortcuts");

            document.addEventListener('keydown', function (event) {
                console.log("[KeyBind] Key pressed:", event.key,
                    "Ctrl:", event.ctrlKey,
                    "Alt:", event.altKey);

                // Abaikan jika sedang ketik di input fields
                if (event.target.tagName === 'INPUT' ||
                    event.target.tagName === 'TEXTAREA' ||
                    event.target.contentEditable === 'true' ||
                    event.target.closest('.CodeMirror')) {
                    return;
                }

                // // Tangani Ctrl+Alt+K khusus untuk memaksa blur pada semua fokus
                // if (event.ctrlKey && event.altKey && (event.key === 'k' || event.key === 'K')) {
                //     console.log("[KeyBind] Ctrl+Alt+K detected - forcing blur on all elements");
                //     event.preventDefault();
                //     event.stopPropagation();
                //     return window.KeyBindManager.blurAllFocus();
                // }

                if (event.ctrlKey && event.altKey && event.key === 'k') {
                    event.preventDefault();
                    console.log("[KeyBind] Ctrl+Tab detected");
                    if (WM.cycleWindows) {
                        WM.cycleWindows();
                    } else {
                        console.error("[KeyBind] WindowManager.cycleWindows is not available");
                    }
                } else if (event.ctrlKey && !event.altKey && (event.key === 'e' || event.key === 'E')) {
                    event.preventDefault();
                    console.log("[KeyBind] Ctrl+E detected");
                    WM.createWindow("code-editor");
                } else if (event.ctrlKey && event.altKey && (event.key === 't' || event.key === 'T')) {
                    event.preventDefault();
                    console.log("[KeyBind] Ctrl+Alt+T detected");
                    WM.createWindow('terminal');
                }
            }, true);

            // Tampilkan notifikasi tentang keybindings yang tersedia
            showKeybindingNotification();
        });

        console.log("[KeyBind] Key bindings initialization started");
    }

    // Fungsi untuk menampilkan notifikasi tentang keybindings yang tersedia
    function showKeybindingNotification() {
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = '#333';
        notification.style.color = 'white';
        notification.style.padding = '10px 15px';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.zIndex = '10000';
        notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        notification.innerHTML = `
            <div style="margin-bottom: 8px; font-weight: bold;">Keyboard Shortcuts:</div>
            <div>Ctrl+Tab: Switch window</div>
            <div>Ctrl+E: Open editor</div>
            <div>Ctrl+Alt+T: Open terminal</div>
            <div style="position: absolute; top: 5px; right: 10px; cursor: pointer;" 
                 onclick="this.parentNode.remove()">✕</div>
        `;

        document.body.appendChild(notification);

        // Auto-hide setelah 8 detik
        setTimeout(function () {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s';

            setTimeout(function () {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 500);
        }, 8000);
    }

    // Tambahkan cycleWindows jika tidak tersedia di WindowManager
    function addCycleWindowsFunction(windowManager) {
        if (!windowManager.cycleWindows) {
            console.log("[KeyBind] Adding cycleWindows function to WindowManager");

            windowManager.cycleWindows = function () {
                console.log("[KeyBind] Cycling windows");

                // Dapatkan semua window
                const windows = document.querySelectorAll('.window');
                if (windows.length <= 1) return;

                // Temukan window yang aktif sekarang
                const focusedWindow = document.querySelector('.window-focused') ||
                    document.querySelector('.window');

                if (!focusedWindow) return;

                // Temukan index window aktif
                const windowArray = Array.from(windows);
                const currentIndex = windowArray.indexOf(focusedWindow);

                // Tentukan window berikutnya (dengan wrap-around)
                const nextIndex = (currentIndex + 1) % windows.length;
                const nextWindow = windowArray[nextIndex];

                // Fokuskan ke window berikutnya
                if (nextWindow && windowManager.focusWindow) {
                    windowManager.focusWindow(nextWindow);
                } else if (nextWindow) {
                    // Alternatif jika focusWindow tidak tersedia
                    windowManager.bringToFront(nextWindow);
                }
            };
        }
    }

    // Tambahkan fungsi untuk menangani Ctrl+Alt+K pada setiap app
    window.KeyBindManager = {
        // Fungsi untuk menghapus fokus dari semua element
        blurAllFocus: function () {
            console.log("[KeyBind] Removing focus from all elements");

            // Hapus fokus dari element aktif manapun
            if (document.activeElement && document.activeElement !== document.body) {
                document.activeElement.blur();
            }

            // Fokus ke body untuk memastikan tidak ada element yang memiliki fokus
            document.body.focus();

            // Panggil blurFocus pada setiap app yang aktif
            const activeWindow = document.querySelector('.window-focused');
            if (activeWindow) {
                const appType = activeWindow.getAttribute('data-app-type');
                const windowId = activeWindow.id;

                // Panggil fungsi blurFocus khusus untuk tiap jenis app
                if (appType === 'terminal' && window.TerminalApp && window.TerminalApp.blurFocus) {
                    window.TerminalApp.blurFocus(windowId);
                }
                else if (appType === 'code-editor' && window.CodeEditorApp && window.CodeEditorApp.blurFocus) {
                    window.CodeEditorApp.blurFocus(windowId);
                }

                // Untuk app lain yang mungkin punya fungsi blurFocus
                const appName = appType.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)).join('') + 'App';

                if (window[appName] && typeof window[appName].blurFocus === 'function') {
                    window[appName].blurFocus(windowId);
                }
            }

            return true;
        }
    };
})();
