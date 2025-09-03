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
    }
};