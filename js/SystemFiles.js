/**
 * SystemFiles - Module for managing and modifying system source files
 * Version 1.0
 */
window.SystemFiles = (function () {
    console.log("SystemFiles initializing...");

    // Storage for file contents
    const fileContents = {};

    // List of core system files (relative to project root)
    const coreFiles = [
        'window-manager.js',
        'main.js',
        'js/FileSystem.js',
        'js/SystemFiles.js',
        'apps/terminal.js',
        'apps/code-editor.js',
        'apps/calculator.js',
        'apps/imageviewer.js',
        'apps/notepad.js',
        'styles.css'
    ];

    /**
     * Load a file via fetch API
     */
    function loadFile(path) {
        // First check localStorage
        const storedContent = localStorage.getItem(`system-file:${path}`);
        if (storedContent) {
            fileContents[path] = storedContent;
            console.log(`Loaded ${path} from localStorage`);
            return Promise.resolve(storedContent);
        }

        // Otherwise fetch from server
        return fetch(path)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to load ${path}`);
                }
                return response.text();
            })
            .then(content => {
                fileContents[path] = content;
                localStorage.setItem(`system-file:${path}`, content);
                console.log(`Loaded ${path} from server`);
                return content;
            })
            .catch(err => {
                console.error(`Error loading ${path}:`, err);
                return null;
            });
    }

    /**
     * Load all core system files
     */
    function loadAllFiles() {
        const promises = coreFiles.map(file => loadFile(file));
        return Promise.all(promises)
            .then(() => {
                console.log("SystemFiles: All files loaded");
                return true;
            })
            .catch(err => {
                console.error("Error loading system files:", err);
                return false;
            });
    }

    /**
     * Apply changes to a system file
     */
    function applyChanges(path, content) {
        // Store the new content
        fileContents[path] = content;
        localStorage.setItem(`system-file:${path}`, content);

        // Apply changes based on file type
        if (path.endsWith('.js')) {
            try {
                // Create a new script element
                const script = document.createElement('script');
                script.textContent = content;
                document.body.appendChild(script);
                console.log(`Applied changes to ${path}`);
                return true;
            } catch (error) {
                console.error(`Error applying changes to ${path}:`, error);
                return false;
            }
        } else if (path.endsWith('.css')) {
            try {
                // Find existing style element or create new one
                const styleId = `system-style-${path.replace(/[^\w]/g, '-')}`;
                let styleElement = document.getElementById(styleId);

                if (!styleElement) {
                    styleElement = document.createElement('style');
                    styleElement.id = styleId;
                    document.head.appendChild(styleElement);
                }

                styleElement.textContent = content;
                console.log(`Applied changes to ${path}`);
                return true;
            } catch (error) {
                console.error(`Error applying changes to ${path}:`, error);
                return false;
            }
        }

        // For other file types, just store them
        return true;
    }

    // Initialize by loading all files
    loadAllFiles();

    // Public API
    return {
        /**
         * Get a system file's content
         */
        getFile: function (path) {
            // Remove leading slash if present
            if (path.startsWith('/')) {
                path = path.substring(1);
            }

            return fileContents[path] || null;
        },

        /**
         * Save changes to a system file
         */
        saveFile: function (path, content) {
            // Remove leading slash if present
            if (path.startsWith('/')) {
                path = path.substring(1);
            }

            return applyChanges(path, content);
        },

        /**
         * List all available system files
         */
        listFiles: function () {
            return Object.keys(fileContents);
        },

        /**
         * Reset all system files
         */
        reset: function () {
            coreFiles.forEach(file => {
                localStorage.removeItem(`system-file:${file}`);
            });

            // Clear in-memory cache
            for (const key in fileContents) {
                delete fileContents[key];
            }

            return true;
        },

        /**
         * Force reload all files
         */
        reload: function () {
            return loadAllFiles();
        }
    };
})();

// This makes sure the SystemFiles module is globally accessible
console.log("SystemFiles module registered globally");