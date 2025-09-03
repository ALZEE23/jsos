/**
 * Virtual File System implementation with localStorage persistence
 */
const FileSystem = (function () {
    // Default file system structure
    const defaultFS = {
        "/": {
            type: "directory",
            content: {
                "home": {
                    type: "directory",
                    content: {
                        "user": {
                            type: "directory",
                            content: {
                                "Documents": {
                                    type: "directory",
                                    content: {
                                        "welcome.txt": {
                                            type: "file",
                                            content: "Welcome to the virtual file system!\nThis is a text file you can edit.",
                                            created: Date.now(),
                                            modified: Date.now()
                                        },
                                        "notes.md": {
                                            type: "file",
                                            content: "# Notes\n\n- Create files with 'touch' command\n- Edit files with 'edit' command\n- Remove files with 'rm' command",
                                            created: Date.now(),
                                            modified: Date.now()
                                        }
                                    },
                                    created: Date.now(),
                                    modified: Date.now()
                                },
                                "Projects": {
                                    type: "directory",
                                    content: {
                                        "hello.js": {
                                            type: "file",
                                            content: "// JavaScript example\nconsole.log('Hello, world!');\n\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\ngreet('User');",
                                            created: Date.now(),
                                            modified: Date.now()
                                        }
                                    },
                                    created: Date.now(),
                                    modified: Date.now()
                                },
                                ".bashrc": {
                                    type: "file",
                                    content: "# This is a simulated .bashrc file\n# In a real system, this would contain shell configuration",
                                    created: Date.now(),
                                    modified: Date.now()
                                }
                            },
                            created: Date.now(),
                            modified: Date.now()
                        }
                    },
                    created: Date.now(),
                    modified: Date.now()
                },
                "bin": {
                    type: "directory",
                    content: {
                        "hello": {
                            type: "file",
                            content: "#!/bin/bash\necho 'Hello World!'",
                            created: Date.now(),
                            modified: Date.now(),
                            executable: true
                        }
                    },
                    created: Date.now(),
                    modified: Date.now()
                },
                "tmp": {
                    type: "directory",
                    content: {},
                    created: Date.now(),
                    modified: Date.now()
                }
            },
            created: Date.now(),
            modified: Date.now()
        }
    };

    // Load file system from localStorage or use default
    let fs;
    try {
        const savedFS = localStorage.getItem('virtualFS');
        fs = savedFS ? JSON.parse(savedFS) : defaultFS;
    } catch (e) {
        console.error('Error loading file system:', e);
        fs = defaultFS;
    }

    // Save file system to localStorage
    function saveFS() {
        try {
            localStorage.setItem('virtualFS', JSON.stringify(fs));
        } catch (e) {
            console.error('Error saving file system:', e);
        }
    }

    // Path normalization
    function normalizePath(path, currentPath = '/') {
        // Convert path to absolute
        if (!path.startsWith('/')) {
            path = `${currentPath}/${path}`;
        }

        // Handle . and ..
        const parts = path.split('/').filter(p => p !== '');
        const result = [];

        for (const part of parts) {
            if (part === '.') {
                continue;
            } else if (part === '..') {
                result.pop();
            } else {
                result.push(part);
            }
        }

        return '/' + result.join('/');
    }

    // Get the node at a specific path
    function getNode(path, currentPath = '/') {
        const normalizedPath = normalizePath(path, currentPath);
        const parts = normalizedPath.split('/').filter(p => p !== '');

        let current = fs['/'];

        // Handle root directory
        if (parts.length === 0) {
            return current;
        }

        // Navigate through path
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (!current || current.type !== 'directory') {
                return null;
            }

            if (!current.content[part]) {
                return null;
            }

            current = current.content[part];
        }

        return current;
    }

    // Get the parent directory and name of a node
    function getParentAndName(path, currentPath = '/') {
        const normalizedPath = normalizePath(path, currentPath);
        const parts = normalizedPath.split('/').filter(p => p !== '');

        if (parts.length === 0) {
            return { parent: null, name: '/' };
        }

        const name = parts.pop();
        const parentPath = '/' + parts.join('/');

        return {
            parent: getNode(parentPath),
            name: name,
            parentPath: parentPath
        };
    }

    // Public API
    return {
        // List contents of a directory
        listDir: function (path, currentPath = '/') {
            const node = getNode(path, currentPath);

            if (!node) {
                throw new Error(`Directory not found: ${path}`);
            }

            if (node.type !== 'directory') {
                throw new Error(`Not a directory: ${path}`);
            }

            return Object.entries(node.content).map(([name, info]) => {
                return {
                    name,
                    type: info.type,
                    size: info.type === 'file' ? info.content.length : null,
                    modified: new Date(info.modified),
                    executable: info.type === 'file' && info.executable === true
                };
            });
        },

        // Read a file's content
        readFile: function (path, currentPath = '/') {
            const node = getNode(path, currentPath);

            if (!node) {
                throw new Error(`File not found: ${path}`);
            }

            if (node.type !== 'file') {
                throw new Error(`Not a file: ${path}`);
            }

            return node.content;
        },

        // Write to a file
        writeFile: function (path, content, currentPath = '/') {
            const { parent, name, parentPath } = getParentAndName(path, currentPath);

            if (!parent) {
                throw new Error(`Cannot write to root`);
            }

            if (!parent || parent.type !== 'directory') {
                throw new Error(`Parent directory not found: ${parentPath}`);
            }

            const now = Date.now();

            // Update if file exists
            if (parent.content[name] && parent.content[name].type === 'file') {
                parent.content[name].content = content;
                parent.content[name].modified = now;
            } else {
                // Create new file
                parent.content[name] = {
                    type: 'file',
                    content: content,
                    created: now,
                    modified: now
                };
            }

            parent.modified = now;
            saveFS();
            return true;
        },

        // Create a directory
        mkdir: function (path, currentPath = '/') {
            const { parent, name, parentPath } = getParentAndName(path, currentPath);

            if (!parent) {
                throw new Error(`Cannot create directory at root level`);
            }

            if (parent.type !== 'directory') {
                throw new Error(`Parent is not a directory: ${parentPath}`);
            }

            if (parent.content[name]) {
                throw new Error(`Path already exists: ${path}`);
            }

            const now = Date.now();
            parent.content[name] = {
                type: 'directory',
                content: {},
                created: now,
                modified: now
            };

            parent.modified = now;
            saveFS();
            return true;
        },

        // Remove a file or directory
        remove: function (path, recursive = false, currentPath = '/') {
            const { parent, name, parentPath } = getParentAndName(path, currentPath);

            if (!parent) {
                throw new Error(`Cannot remove root directory`);
            }

            if (!parent.content[name]) {
                throw new Error(`Path not found: ${path}`);
            }

            const node = parent.content[name];

            if (node.type === 'directory' && Object.keys(node.content).length > 0 && !recursive) {
                throw new Error(`Directory not empty: ${path}. Use recursive option to force removal.`);
            }

            delete parent.content[name];
            parent.modified = Date.now();
            saveFS();
            return true;
        },

        // Check if a path exists
        exists: function (path, currentPath = '/') {
            return getNode(path, currentPath) !== null;
        },

        // Get path info
        stat: function (path, currentPath = '/') {
            const node = getNode(path, currentPath);

            if (!node) {
                throw new Error(`Path not found: ${path}`);
            }

            return {
                type: node.type,
                created: new Date(node.created),
                modified: new Date(node.modified),
                size: node.type === 'file' ? node.content.length : null,
                executable: node.type === 'file' && node.executable === true
            };
        },

        // Rename/move a file or directory
        rename: function (oldPath, newPath, currentPath = '/') {
            const oldInfo = getParentAndName(oldPath, currentPath);
            const newInfo = getParentAndName(newPath, currentPath);

            if (!oldInfo.parent || !oldInfo.parent.content[oldInfo.name]) {
                throw new Error(`Source path not found: ${oldPath}`);
            }

            if (!newInfo.parent) {
                throw new Error(`Destination parent directory not found`);
            }

            if (newInfo.parent.content[newInfo.name]) {
                throw new Error(`Destination already exists: ${newPath}`);
            }

            // Get the node to move
            const nodeToMove = oldInfo.parent.content[oldInfo.name];

            // Add to new location
            newInfo.parent.content[newInfo.name] = nodeToMove;

            // Remove from old location
            delete oldInfo.parent.content[oldInfo.name];

            // Update modification times
            const now = Date.now();
            oldInfo.parent.modified = now;
            newInfo.parent.modified = now;

            saveFS();
            return true;
        },

        // Copy a file or directory
        copy: function (sourcePath, destPath, currentPath = '/') {
            const sourceNode = getNode(sourcePath, currentPath);

            if (!sourceNode) {
                throw new Error(`Source path not found: ${sourcePath}`);
            }

            const { parent: destParent, name: destName } = getParentAndName(destPath, currentPath);

            if (!destParent) {
                throw new Error(`Destination parent directory not found`);
            }

            if (destParent.content[destName]) {
                throw new Error(`Destination already exists: ${destPath}`);
            }

            // Helper for deep copying objects
            function deepCopy(obj) {
                return JSON.parse(JSON.stringify(obj));
            }

            // Create copy with new timestamps
            const now = Date.now();
            const nodeCopy = deepCopy(sourceNode);
            nodeCopy.created = now;
            nodeCopy.modified = now;

            // Add to destination
            destParent.content[destName] = nodeCopy;
            destParent.modified = now;

            saveFS();
            return true;
        },

        // Set file as executable
        chmod: function (path, executable, currentPath = '/') {
            const node = getNode(path, currentPath);

            if (!node) {
                throw new Error(`Path not found: ${path}`);
            }

            if (node.type !== 'file') {
                throw new Error(`Not a file: ${path}`);
            }

            node.executable = executable;
            node.modified = Date.now();

            saveFS();
            return true;
        },

        // Reset file system to default
        reset: function () {
            fs = JSON.parse(JSON.stringify(defaultFS));
            saveFS();
            return true;
        },

        // Format path to handle relative references
        resolvePath: normalizePath
    };
})();