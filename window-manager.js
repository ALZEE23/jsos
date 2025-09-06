/**
 * Window Manager - Core functionality for window management
 */

const WindowManager = {
    // Window state
    currentMaxZIndex: 100,
    originalDimensions: new Map(),
    windowTemplates: {},
    nextWindowId: 0,

    // Initialize the window manager
    init() {
        console.log('WindowManager initializing...');

        // Set up app launcher
        document.querySelectorAll('#app-dock .app-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const appType = icon.getAttribute('data-app');
                console.log('App icon clicked:', appType);
                this.createWindow(appType);
            });
        });

        // Register keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Close focused window with Escape
            if (e.key === 'Escape') {
                const focusedWindow = document.querySelector('.window-focused');
                if (focusedWindow) {
                    this.closeWindow(focusedWindow);
                }
            }

            // Tambahkan handler untuk Ctrl+Alt+K di level window manager
            if (e.ctrlKey && e.altKey && (e.key === 'k' || e.key === 'K')) {
                console.log("[WindowManager] Ctrl+Alt+K detected - releasing focus");

                // Coba panggil fungsi global blurAllFocus jika tersedia
                if (window.KeyBindManager && window.KeyBindManager.blurAllFocus) {
                    window.KeyBindManager.blurAllFocus();
                } else {
                    // Fallback manual jika tidak tersedia
                    if (document.activeElement && document.activeElement !== document.body) {
                        document.activeElement.blur();
                    }
                    document.body.focus();
                }

                // Hindari propagasi event lebih jauh
                e.preventDefault();
                e.stopPropagation();
            }
        });
    },

    // Register a window template for a specific app
    registerWindowType(appType, template) {
        console.log(`Registering window type: ${appType}`);
        this.windowTemplates[appType] = template;
    },

    // Create a new window
    createWindow(appType, options = {}) {
        console.log(`Creating window: ${appType}`);

        const template = this.windowTemplates[appType];
        if (!template) {
            console.error(`Window template not found for app type: ${appType}`);
            return null;
        }

        // Generate window HTML using the template
        const windowId = `window-${this.nextWindowId++}`;
        console.log(`New window ID: ${windowId}`);
        const windowElement = document.createElement('div');
        windowElement.className = 'window';
        windowElement.id = windowId;
        windowElement.setAttribute('data-app-type', appType);

        // Set initial window position and size
        const defaultOptions = {
            top: Math.max(50, Math.floor(Math.random() * 150)),
            left: Math.max(50, Math.floor(Math.random() * 300)),
            width: template.defaultWidth || 300,
            height: template.defaultHeight || 200,
            title: template.title || 'Window'
        };

        const mergedOptions = { ...defaultOptions, ...options };

        windowElement.style.top = `${mergedOptions.top}px`;
        windowElement.style.left = `${mergedOptions.left}px`;
        windowElement.style.width = `${mergedOptions.width}px`;
        windowElement.style.height = `${mergedOptions.height}px`;

        // Generate window structure
        windowElement.innerHTML = `
          <div class="nine-slice-box"></div>
          <div class="title-bar" id="drag-handle-${windowId}">
            <div class="title-text">${mergedOptions.title}</div>
          </div>
          <div class="window-content" id="content-${windowId}">
            <div class="window-controls">
              <button class="control-button" id="create-${windowId}">+</button>
              <button class="control-button" id="close-${windowId}">×</button>
            </div>
            <div class="content-inner" id="inner-content-${windowId}"></div>
          </div>
          <div class="resize-handle resize-handle-n" id="resize-n-${windowId}"></div>
          <div class="resize-handle resize-handle-e" id="resize-e-${windowId}"></div>
          <div class="resize-handle resize-handle-s" id="resize-s-${windowId}"></div>
          <div class="resize-handle resize-handle-w" id="resize-w-${windowId}"></div>
          <div class="resize-handle resize-handle-ne" id="resize-ne-${windowId}"></div>
          <div class="resize-handle resize-handle-se" id="resize-se-${windowId}"></div>
          <div class="resize-handle resize-handle-sw" id="resize-sw-${windowId}"></div>
          <div class="resize-handle resize-handle-nw" id="resize-nw-${windowId}"></div>
        `;

        // Add to the desktop
        document.getElementById('desktop').appendChild(windowElement);
        console.log('Window added to desktop');

        // Set opacity to 0 initially for appear animation
        windowElement.style.opacity = '0';

        // Add event listeners
        this.setupWindowEvents(windowElement);

        // Bring to front
        this.bringToFront(windowElement);

        // Add appear animation class
        setTimeout(() => {
            windowElement.style.opacity = '';
            windowElement.classList.add('window-appear');
        }, 10);

        // Call the app's content initializer
        const contentElement = windowElement.querySelector('.window-content');
        if (template.initContent) {
            try {
                template.initContent(contentElement, mergedOptions);
                console.log('Content initialized');
            } catch (error) {
                console.error('Error initializing content:', error);
            }
        } else {
            console.warn('No initContent method found for app type:', appType);
        }

        return windowElement;
    },

    // Set up event handlers for a window
    setupWindowEvents(windowElement) {
        const windowId = windowElement.id;

        // Close button
        const closeBtn = windowElement.querySelector(`#close-${windowId}`);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeWindow(windowElement));
        }

        // Create button (might be app-specific)
        const createBtn = windowElement.querySelector(`#create-${windowId}`);
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                const appType = windowElement.getAttribute('data-app-type');
                this.createWindow(appType);
            });
        }

        // Maximize button
        const maximizeBtn = windowElement.querySelector(`#maximize-${windowId}`);
        if (maximizeBtn) {
            maximizeBtn.addEventListener('click', () => this.toggleMaximize(windowElement));
        }

        // Minimize button (optional implementation)
        const minimizeBtn = windowElement.querySelector(`#minimize-${windowId}`);
        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => this.minimizeWindow(windowElement));
        }

        // Set up drag functionality
        this.setupDrag(windowElement);

        // Set up resize functionality
        this.setupResize(windowElement);

        // Double-click title bar to maximize
        const titleBar = windowElement.querySelector(`#drag-handle-${windowId}`);
        if (titleBar) {
            titleBar.addEventListener('dblclick', () => this.toggleMaximize(windowElement));
        }

        // Focus window on click
        windowElement.addEventListener('mousedown', (e) => {
            // Don't change focus if clicking on a button
            if (!e.target.classList.contains('control-button')) {
                this.focusWindow(windowElement);
            }
        });
    },

    // Bring a window to the front
    bringToFront(windowElement) {
        // Remove focused class from all windows
        document.querySelectorAll('.window-focused').forEach(win => {
            win.classList.remove('window-focused');
        });

        // Add focused class to this window
        windowElement.classList.add('window-focused');

        // Increment z-index counter
        this.currentMaxZIndex += 1;
        windowElement.style.zIndex = this.currentMaxZIndex;
    },

    // Focus a window
    focusWindow(windowElement) {
        this.bringToFront(windowElement);
    },

    // Toggle maximize/restore
    toggleMaximize(windowElement) {
        const windowId = windowElement.id;

        // Bring to front when maximizing/restoring
        this.bringToFront(windowElement);

        // Add transition class before making changes
        windowElement.classList.add("transitioning");

        if (this.originalDimensions.has(windowId)) {
            // Restore to original size
            const { width, height, top, left } = this.originalDimensions.get(windowId);

            windowElement.style.width = width;
            windowElement.style.height = height;
            windowElement.style.top = top;
            windowElement.style.left = left;

            // Remove from storage
            this.originalDimensions.delete(windowId);
            windowElement.classList.remove('window-maximized');
        } else {
            // Save current dimensions
            this.originalDimensions.set(windowId, {
                width: windowElement.style.width,
                height: windowElement.style.height,
                top: windowElement.style.top,
                left: windowElement.style.left,
            });

            // Set to maximized size with margins
            const margin = 20;
            windowElement.style.width = `${window.innerWidth - margin * 2}px`;
            windowElement.style.height = `${window.innerHeight - margin * 2}px`;
            windowElement.style.top = `${margin}px`;
            windowElement.style.left = `${margin}px`;

            windowElement.classList.add('window-maximized');
        }

        // Add visual feedback
        windowElement.classList.add('maximizing');

        // Remove transition classes after animation completes
        setTimeout(() => {
            windowElement.classList.remove('maximizing');
            windowElement.classList.remove('transitioning');
        }, 300);
    },

    // Minimize window
    minimizeWindow(windowElement) {
        // Simple implementation - could be enhanced with taskbar integration
        windowElement.classList.add('window-minimized');
    },

    // Close window
    closeWindow(windowElement) {
        windowElement.classList.add('window-close');

        // Wait for animation to finish before removing
        setTimeout(() => {
            windowElement.remove();
        }, 200);
    },

    // Set up window drag functionality
    setupDrag(windowElement) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const windowId = windowElement.id;
        const dragHandle = windowElement.querySelector(`#drag-handle-${windowId}`);

        if (dragHandle) {
            dragHandle.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            // Don't start drag if clicking on buttons
            if (e.target.closest('.control-button')) {
                return;
            }

            e.preventDefault();

            // Temporarily disable transitions during drag
            windowElement.classList.remove('transitioning');

            // Get initial mouse position
            pos3 = e.clientX;
            pos4 = e.clientY;

            // Add document-level event handlers
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();

            // Calculate new position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            // Calculate new coordinates
            let newTop = windowElement.offsetTop - pos2;
            let newLeft = windowElement.offsetLeft - pos1;

            // Apply boundary constraints
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const elementWidth = windowElement.offsetWidth;
            const elementHeight = windowElement.offsetHeight;

            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;

            const visibleWidth = Math.min(100, elementWidth / 2);
            if (newLeft > windowWidth - visibleWidth) {
                newLeft = windowWidth - visibleWidth;
            }

            const visibleHeight = Math.min(100, elementHeight / 2);
            if (newTop > windowHeight - visibleHeight) {
                newTop = windowHeight - visibleHeight;
            }

            // Update position
            windowElement.style.top = `${Math.round(newTop)}px`;
            windowElement.style.left = `${Math.round(newLeft)}px`;
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    },

    // Set up window resize functionality
    setupResize(windowElement) {
        const directions = ["n", "e", "s", "w", "ne", "se", "sw", "nw"];
        const windowId = windowElement.id;

        directions.forEach(dir => {
            const handle = windowElement.querySelector(`#resize-${dir}-${windowId}`);
            if (handle) {
                handle.onmousedown = (e) => resizeStart(e, dir);
            }
        });

        let startX, startY, startWidth, startHeight, startLeft, startTop;

        function resizeStart(e, direction) {
            e.preventDefault();

            // Disable transitions during resize
            windowElement.classList.remove('transitioning');

            // Store initial values
            startX = e.clientX;
            startY = e.clientY;
            startWidth = windowElement.offsetWidth;
            startHeight = windowElement.offsetHeight;
            startLeft = windowElement.offsetLeft;
            startTop = windowElement.offsetTop;

            // Add document-level handlers
            document.onmousemove = (e) => resizeMove(e, direction);
            document.onmouseup = resizeEnd;
        }

        function resizeMove(e, direction) {
            e.preventDefault();

            // Calculate size changes
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            // Apply changes based on direction
            if (direction.includes("e")) {
                newWidth = Math.max(200, startWidth + dx);
            }

            if (direction.includes("s")) {
                newHeight = Math.max(150, startHeight + dy);
            }

            if (direction.includes("w")) {
                newWidth = Math.max(200, startWidth - dx);
                newLeft = startLeft + startWidth - newWidth;
            }

            if (direction.includes("n")) {
                newHeight = Math.max(150, startHeight - dy);
                newTop = startTop + startHeight - newHeight;
            }

            // Apply new dimensions
            windowElement.style.width = `${newWidth}px`;
            windowElement.style.height = `${newHeight}px`;
            windowElement.style.left = `${newLeft}px`;
            windowElement.style.top = `${newTop}px`;
        }

        function resizeEnd() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    },

    // Cycle through windows (for Ctrl+Tab support)
    cycleWindows() {
        console.log("Cycling through windows...");

        // Get all windows
        const windows = document.querySelectorAll('.window');
        if (windows.length <= 1) {
            console.log("Less than 2 windows found, nothing to cycle");
            return;
        }

        // Find the current focused window
        const currentFocused = document.querySelector('.window-focused');
        if (!currentFocused) {
            // If no window is focused, focus the first one
            console.log("No focused window found, focusing the first window");
            this.focusWindow(windows[0]);
            return;
        }

        // PERBAIKAN: Panggil blurFocus pada window aktif sebelum berpindah
        const appType = currentFocused.getAttribute('data-app-type');
        const windowId = currentFocused.id;

        // Panggil fungsi blurFocus berdasarkan jenis aplikasi
        if (appType === 'terminal') {
            if (typeof window.TerminalApp !== 'undefined' &&
                typeof window.TerminalApp.blurFocus === 'function') {
                window.TerminalApp.blurFocus(windowId);
            }
        }
        else if (appType === 'code-editor') {
            if (typeof window.CodeEditorApp !== 'undefined' &&
                typeof window.CodeEditorApp.blurFocus === 'function') {
                window.CodeEditorApp.blurFocus(windowId);
            }
        }

        // Untuk aplikasi lain yang mungkin memiliki blurFocus
        const appName = appType.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)).join('') + 'App';

        if (typeof window[appName] !== 'undefined' &&
            typeof window[appName].blurFocus === 'function') {
            window[appName].blurFocus(windowId);
        }

        // Find index of currently focused window
        const windowArray = Array.from(windows);
        const currentIndex = windowArray.indexOf(currentFocused);

        // Calculate next window index (with wrap-around)
        const nextIndex = (currentIndex + 1) % windowArray.length;
        const nextWindow = windowArray[nextIndex];

        // Focus the next window
        console.log(`Cycling from window ${currentIndex} to window ${nextIndex}`);
        this.focusWindow(nextWindow);
        this.focusCursorInWindow(nextWindow);
    },

    // New function to focus cursor in interactive windows
    focusCursorInWindow(windowElement) {
        if (!windowElement) return;

        // Get window type
        const appType = windowElement.getAttribute('data-app-type');
        console.log(`Focusing cursor in ${appType} window`);

        // PERBAIKAN: Tambahkan delay yang lebih panjang dan coba beberapa kali
        const attemptFocus = (attempt = 0) => {
            try {
                console.log(`Focus attempt ${attempt + 1} for ${appType}`);

                // PERBAIKAN: Aktifkan windowElement dahulu untuk memastikan fokus
                windowElement.click();

                let focused = false;

                // For terminal windows
                if (appType === 'terminal') {
                    // Try to find terminal input
                    const terminalInput = windowElement.querySelector('.terminal-input');
                    if (terminalInput) {
                        terminalInput.focus();
                        terminalInput.click(); // Tambahan untuk memastikan fokus
                        console.log('Terminal input focused');
                        focused = true;
                    }

                    // Alternative: try contenteditable element
                    if (!focused) {
                        const editableElem = windowElement.querySelector('[contenteditable="true"]');
                        if (editableElem) {
                            editableElem.focus();
                            editableElem.click(); // Tambahan untuk memastikan fokus
                            console.log('Terminal editable element focused');
                            focused = true;
                        }
                    }

                    // Alternative: try any input field in the terminal
                    if (!focused) {
                        const anyInput = windowElement.querySelector('input[type="text"], textarea');
                        if (anyInput) {
                            anyInput.focus();
                            anyInput.click(); // Tambahan untuk memastikan fokus
                            console.log('Terminal input field focused');
                            focused = true;
                        }
                    }
                }

                // For code editor windows
                else if (appType === 'code-editor') {
                    // Try to find CodeMirror editor
                    const cmEditor = windowElement.querySelector('.CodeMirror');
                    if (cmEditor && cmEditor.CodeMirror) {
                        cmEditor.CodeMirror.focus();
                        console.log('CodeMirror editor focused');
                        focused = true;
                    }

                    // Alternative: monaco editor
                    if (!focused) {
                        const monacoEditor = windowElement.querySelector('.monaco-editor');
                        if (monacoEditor && window.monaco) {
                            // Find the editor instance for this DOM element
                            for (const editorInstance of window.monaco.editor.getEditors()) {
                                if (monacoEditor.contains(editorInstance.getDomNode())) {
                                    editorInstance.focus();
                                    console.log('Monaco editor focused');
                                    focused = true;
                                    break;
                                }
                            }
                        }
                    }

                    // Alternative: textarea editor
                    if (!focused) {
                        const editorTextarea = windowElement.querySelector('textarea.editor');
                        if (editorTextarea) {
                            editorTextarea.focus();
                            editorTextarea.click(); // Tambahan untuk memastikan fokus
                            console.log('Editor textarea focused');
                            focused = true;
                        }
                    }

                    // Alternative: any editable element
                    if (!focused) {
                        const editableArea = windowElement.querySelector('[contenteditable="true"], textarea');
                        if (editableArea) {
                            editableArea.focus();
                            editableArea.click(); // Tambahan untuk memastikan fokus
                            console.log('Editor area focused');
                            focused = true;
                        }
                    }
                }

                // For other apps with text input capability
                else if (!focused) {
                    // Try to find primary input in the window
                    const primaryInput = windowElement.querySelector('input:not([type="hidden"]), textarea, [contenteditable="true"]');
                    if (primaryInput) {
                        primaryInput.focus();
                        primaryInput.click(); // Tambahan untuk memastikan fokus
                        console.log('Input focused in window');
                        focused = true;
                    }
                }

                // PERBAIKAN: Jika masih belum berhasil dan masih ada percobaan tersisa, coba lagi
                if (!focused && attempt < 2) {
                    setTimeout(() => attemptFocus(attempt + 1), 100);
                }
            } catch (err) {
                console.error('Error focusing cursor in window:', err);
            }
        };

        // Mulai percobaan fokus dengan delay
        setTimeout(() => attemptFocus(), 100);
    },
};

// Pastikan WindowManager tersedia secara global
window.WindowManager = WindowManager;