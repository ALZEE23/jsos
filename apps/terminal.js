(function () {
    // Add this line near the top of the file inside the IIFE
    // Make sure to include FileSystem.js in your HTML before terminal.js
    const fs = FileSystem;

    WindowManager.registerWindowType('terminal', {
        title: 'Terminal',
        defaultWidth: 500,
        defaultHeight: 300,

        initContent: function (contentElement, options) {
            const innerContent = contentElement.querySelector('[id^="inner-content"]');
            if (!innerContent) {
                console.error('Inner content element not found');
                return;
            }

            // Create terminal UI
            innerContent.innerHTML = `
                <div class="terminal-container">
                    <div class="terminal-output scrollable"></div>
                    <div class="terminal-input-line">
                        <span class="terminal-prompt">$</span>
                        <input type="text" class="terminal-input" autofocus>
                    </div>
                </div>
            `;

            // Get references to UI elements
            const terminalOutput = innerContent.querySelector('.terminal-output');
            const terminalInput = innerContent.querySelector('.terminal-input');
            const terminalPrompt = innerContent.querySelector('.terminal-prompt');

            // Terminal state
            const terminalState = {
                history: [],
                historyIndex: -1,
                currentDirectory: '/home/user',
                env: {
                    'USER': 'user',
                    'HOME': '/home/user',
                    'PATH': '/bin:/usr/bin',
                    'TERM': 'xterm-256color'
                }
            };

            // Initial welcome message
            addOutput(`Welcome to Terminal\nType 'help' to see available commands.\n`, 'system-message');
            updatePrompt();

            // Event listeners
            terminalInput.addEventListener('keydown', (e) => {
                e.stopPropagation();

                switch (e.key) {
                    case 'Enter':
                        const command = terminalInput.value.trim();
                        if (command) {
                            processCommand(command);
                            terminalState.history.push(command);
                            terminalState.historyIndex = terminalState.history.length;
                            terminalInput.value = '';
                        }
                        break;

                    case 'ArrowUp':
                        // Navigate command history (previous command)
                        if (terminalState.historyIndex > 0) {
                            terminalState.historyIndex--;
                            terminalInput.value = terminalState.history[terminalState.historyIndex];
                            // Move cursor to end of input
                            setTimeout(() => {
                                terminalInput.selectionStart = terminalInput.selectionEnd = terminalInput.value.length;
                            }, 0);
                        }
                        e.preventDefault();
                        break;

                    case 'ArrowDown':
                        // Navigate command history (next command)
                        if (terminalState.historyIndex < terminalState.history.length - 1) {
                            terminalState.historyIndex++;
                            terminalInput.value = terminalState.history[terminalState.historyIndex];
                        } else if (terminalState.historyIndex === terminalState.history.length - 1) {
                            terminalState.historyIndex = terminalState.history.length;
                            terminalInput.value = '';
                        }
                        e.preventDefault();
                        break;

                    case 'Tab':
                        // Command auto-completion
                        e.preventDefault();
                        autoCompleteCommand(terminalInput.value);
                        break;
                }
            });

            terminalInput.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent window drag
            });

            // Keep focus on input when clicking anywhere in the terminal
            innerContent.addEventListener('click', () => {
                terminalInput.focus();
            });

            // Functions
            function addOutput(text, className = '') {
                const outputElement = document.createElement('div');
                outputElement.className = `terminal-line ${className}`;

                // Handle special formatting (for errors, etc)
                if (className === 'error') {
                    outputElement.style.color = '#f55';
                }

                // Support HTML content if needed
                if (text.includes('<') && text.includes('>')) {
                    outputElement.innerHTML = text;
                } else {
                    outputElement.textContent = text;
                }

                terminalOutput.appendChild(outputElement);
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }

            function addCommandOutput(command) {
                const outputElement = document.createElement('div');
                outputElement.className = 'terminal-command';
                outputElement.innerHTML = `<span class="terminal-prompt">${terminalPrompt.textContent}</span> ${command}`;
                terminalOutput.appendChild(outputElement);
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }

            function updatePrompt() {
                const user = terminalState.env.USER;
                const hostname = 'localhost';
                const directory = terminalState.currentDirectory.replace(terminalState.env.HOME, '~');
                terminalPrompt.textContent = `${user}@${hostname}:${directory}$`;
            }

            function autoCompleteCommand(partial) {
                // Simple command auto-completion
                const commands = [
                    'help', 'echo', 'clear', 'run', 'ls', 'cd', 'pwd', 'date'
                ];

                const matches = commands.filter(cmd => cmd.startsWith(partial));

                if (matches.length === 1) {
                    // Single match - complete the command
                    terminalInput.value = matches[0];
                } else if (matches.length > 1) {
                    // Multiple matches - show options
                    addOutput(matches.join('  '));
                }
            }

            function processCommand(command) {
                addCommandOutput(command);

                // Split command and arguments
                const parts = command.split(' ');
                const cmd = parts[0].toLowerCase();
                const args = parts.slice(1);

                // Process based on command
                switch (cmd) {
                    case 'help':
                        addOutput(`Available commands:
  help            - Show this help message
  echo <text>     - Print text to the terminal
  clear           - Clear the terminal screen
  
  # File System Commands
  ls [-l]         - List directory contents (use -l for detailed view)
  cat <file>      - Display file contents
  touch <file>    - Create an empty file or update timestamp
  mkdir <dir>     - Create a new directory
  rm [-r] <path>  - Remove a file or directory (-r for recursive)
  cd <dir>        - Change directory
  pwd             - Print working directory
  edit <file>     - Open file in code editor (creates if doesn't exist)
  mv <src> <dst>  - Move/rename file or directory
  cp <src> <dst>  - Copy file or directory
  chmod +x|-x <f> - Make file executable (+x) or not (-x)
  reset-fs        - Reset file system to default state (CAUTION!)
  
  # Other Commands
  run <editor-id> - Run code from a specific editor window
  windows         - List all open windows with IDs
  date            - Show current date and time`);
                        break;

                    case 'echo':
                        addOutput(args.join(' '));
                        break;

                    case 'clear':
                        terminalOutput.innerHTML = '';
                        break;

                    case 'run':
                        if (args.length === 0) {
                            addOutput('Usage: run <editor-id>\nExample: run window-0', 'error');
                            break;
                        }

                        // Find the editor window
                        const editorId = args[0];
                        const editorWindow = document.getElementById(editorId);

                        if (!editorWindow) {
                            addOutput(`Error: No window found with id ${editorId}`, 'error');
                            break;
                        }

                        // Check if it's a code editor
                        if (editorWindow.getAttribute('data-app-type') !== 'code-editor') {
                            addOutput(`Error: Window ${editorId} is not a code editor`, 'error');
                            break;
                        }

                        // Get the code directly from the textarea - simpler approach that always works
                        try {
                            const textarea = editorWindow.querySelector('.code-textarea');

                            if (!textarea) {
                                addOutput(`Error: Could not find code editor in ${editorId}`, 'error');
                                break;
                            }

                            const code = textarea.value;

                            if (!code || code.trim() === '') {
                                addOutput('Error: No code to run', 'error');
                                break;
                            }

                            // Run the JavaScript code
                            addOutput(`[${new Date().toLocaleTimeString()}] Running javascript code...`);

                            try {
                                // Capture console.log outputs
                                const originalConsoleLog = console.log;
                                let logs = [];

                                console.log = (...args) => {
                                    const logMessage = args.join(' ');
                                    logs.push(logMessage);
                                    originalConsoleLog(...args);
                                };

                                // Run the code
                                const result = eval(code);

                                // Restore console.log
                                console.log = originalConsoleLog;

                                // Output the logs
                                logs.forEach(log => {
                                    addOutput(log);
                                });

                                // If there was a return value and no console.logs, show it
                                if (logs.length === 0 && result !== undefined) {
                                    addOutput(`Result: ${result}`);
                                }
                            } catch (error) {
                                addOutput(`Error: ${error.message}`, 'error');
                            }
                        } catch (err) {
                            addOutput(`Error: ${err.message}`, 'error');
                        }
                        break;

                    case 'ls':
                        try {
                            const path = args[0] || terminalState.currentDirectory;
                            const resolvedPath = fs.resolvePath(path, terminalState.currentDirectory);
                            const contents = fs.listDir(resolvedPath);

                            // Format the output
                            if (args.includes('-l')) {
                                // Detailed listing
                                addOutput('Type  Size      Modified             Name');
                                addOutput('----  --------  -------------------  ---------------');
                                contents.forEach(item => {
                                    const typeChar = item.type === 'directory' ? 'd' : (item.executable ? 'x' : '-');
                                    const size = item.size !== null ? item.size.toString().padStart(8) : '        ';
                                    const modified = item.modified.toISOString().replace('T', ' ').substring(0, 19);
                                    const name = item.type === 'directory' ? `${item.name}/` : item.name;
                                    addOutput(`${typeChar}     ${size}  ${modified}  ${name}`);
                                });
                            } else {
                                // Simple listing
                                const formattedItems = contents.map(item => {
                                    if (item.type === 'directory') {
                                        return `<span class="directory">${item.name}/</span>`;
                                    } else if (item.executable) {
                                        return `<span class="executable">${item.name}*</span>`;
                                    } else {
                                        return item.name;
                                    }
                                });

                                // Output in columns or as list
                                addOutput(formattedItems.join('  '));
                            }
                        } catch (error) {
                            addOutput(`ls: ${error.message}`, 'error');
                        }
                        break;

                    case 'cd':
                        try {
                            if (!args[0]) {
                                // cd with no args goes to home
                                terminalState.currentDirectory = terminalState.env.HOME;
                            } else {
                                const path = args[0];
                                const resolvedPath = fs.resolvePath(path, terminalState.currentDirectory);

                                // Check if directory exists and is a directory
                                if (!fs.exists(resolvedPath)) {
                                    addOutput(`cd: ${path}: No such file or directory`, 'error');
                                    break;
                                }

                                const stat = fs.stat(resolvedPath);
                                if (stat.type !== 'directory') {
                                    addOutput(`cd: ${path}: Not a directory`, 'error');
                                    break;
                                }

                                terminalState.currentDirectory = resolvedPath;
                            }
                            updatePrompt();
                        } catch (error) {
                            addOutput(`cd: ${error.message}`, 'error');
                        }
                        break;

                    case 'pwd':
                        addOutput(terminalState.currentDirectory);
                        break;

                    case 'cat':
                        if (args.length === 0) {
                            addOutput('Usage: cat <file>', 'error');
                            break;
                        }

                        try {
                            const path = args[0];
                            const resolvedPath = fs.resolvePath(path, terminalState.currentDirectory);

                            if (!fs.exists(resolvedPath)) {
                                addOutput(`cat: ${path}: No such file or directory`, 'error');
                                break;
                            }

                            const content = fs.readFile(resolvedPath);
                            addOutput(content);
                        } catch (error) {
                            addOutput(`cat: ${error.message}`, 'error');
                        }
                        break;

                    case 'touch':
                        if (args.length === 0) {
                            addOutput('Usage: touch <file>', 'error');
                            break;
                        }

                        try {
                            const path = args[0];
                            const resolvedPath = fs.resolvePath(path, terminalState.currentDirectory);

                            // If file doesn't exist, create it with empty content
                            if (!fs.exists(resolvedPath)) {
                                fs.writeFile(resolvedPath, '');
                                addOutput(`Created ${path}`);
                            } else {
                                // If file exists, just update the modification time (real touch behavior)
                                const content = fs.readFile(resolvedPath);
                                fs.writeFile(resolvedPath, content);
                                addOutput(`Updated timestamp for ${path}`);
                            }
                        } catch (error) {
                            addOutput(`touch: ${error.message}`, 'error');
                        }
                        break;

                    case 'mkdir':
                        if (args.length === 0) {
                            addOutput('Usage: mkdir <directory>', 'error');
                            break;
                        }

                        try {
                            const path = args[0];
                            const resolvedPath = fs.resolvePath(path, terminalState.currentDirectory);

                            fs.mkdir(resolvedPath);
                            addOutput(`Created directory ${path}`);
                        } catch (error) {
                            addOutput(`mkdir: ${error.message}`, 'error');
                        }
                        break;

                    case 'rm':
                        if (args.length === 0) {
                            addOutput('Usage: rm [-r] <path>', 'error');
                            break;
                        }

                        try {
                            let recursive = false;
                            let path = args[0];

                            // Check for -r flag
                            if (args[0] === '-r') {
                                recursive = true;
                                path = args[1];

                                if (!path) {
                                    addOutput('Usage: rm -r <path>', 'error');
                                    break;
                                }
                            }

                            const resolvedPath = fs.resolvePath(path, terminalState.currentDirectory);

                            fs.remove(resolvedPath, recursive);
                            addOutput(`Removed ${path}`);
                        } catch (error) {
                            addOutput(`rm: ${error.message}`, 'error');
                        }
                        break;

                    case 'edit':
                        if (args.length === 0) {
                            addOutput('Usage: edit <file>', 'error');
                            break;
                        }

                        try {
                            const path = args[0];
                            const resolvedPath = fs.resolvePath(path, terminalState.currentDirectory);

                            // Check if file exists, if not create it
                            let content = '';
                            if (fs.exists(resolvedPath)) {
                                try {
                                    content = fs.readFile(resolvedPath);
                                } catch (e) {
                                    addOutput(`edit: Cannot read ${path}: ${e.message}`, 'error');
                                    break;
                                }
                            }

                            // Open the code editor with this file
                            WindowManager.createWindow('code-editor', {
                                code: content,
                                filePath: resolvedPath,
                                onSave: (code) => {
                                    try {
                                        fs.writeFile(resolvedPath, code);
                                        addOutput(`File saved: ${path}`);
                                    } catch (e) {
                                        addOutput(`Error saving file: ${e.message}`, 'error');
                                    }
                                }
                            });
                        } catch (error) {
                            addOutput(`edit: ${error.message}`, 'error');
                        }
                        break;

                    case 'mv':
                        if (args.length !== 2) {
                            addOutput('Usage: mv <source> <destination>', 'error');
                            break;
                        }

                        try {
                            const sourcePath = args[0];
                            const destPath = args[1];

                            const resolvedSource = fs.resolvePath(sourcePath, terminalState.currentDirectory);
                            const resolvedDest = fs.resolvePath(destPath, terminalState.currentDirectory);

                            fs.rename(resolvedSource, resolvedDest);
                            addOutput(`Moved ${sourcePath} to ${destPath}`);
                        } catch (error) {
                            addOutput(`mv: ${error.message}`, 'error');
                        }
                        break;

                    case 'cp':
                        if (args.length !== 2) {
                            addOutput('Usage: cp <source> <destination>', 'error');
                            break;
                        }

                        try {
                            const sourcePath = args[0];
                            const destPath = args[1];

                            const resolvedSource = fs.resolvePath(sourcePath, terminalState.currentDirectory);
                            const resolvedDest = fs.resolvePath(destPath, terminalState.currentDirectory);

                            fs.copy(resolvedSource, resolvedDest);
                            addOutput(`Copied ${sourcePath} to ${destPath}`);
                        } catch (error) {
                            addOutput(`cp: ${error.message}`, 'error');
                        }
                        break;

                    case 'chmod':
                        if (args.length !== 2 || (args[0] !== '+x' && args[0] !== '-x')) {
                            addOutput('Usage: chmod +x|-x <file>', 'error');
                            break;
                        }

                        try {
                            const mode = args[0] === '+x';
                            const path = args[1];
                            const resolvedPath = fs.resolvePath(path, terminalState.currentDirectory);

                            fs.chmod(resolvedPath, mode);
                            addOutput(`Changed permissions for ${path}`);
                        } catch (error) {
                            addOutput(`chmod: ${error.message}`, 'error');
                        }
                        break;

                    case 'reset-fs':
                        const confirmReset = confirm('This will reset the file system to default. All your files will be lost. Continue?');
                        if (confirmReset) {
                            fs.reset();
                            terminalState.currentDirectory = terminalState.env.HOME;
                            updatePrompt();
                            addOutput('File system has been reset to default.');
                        } else {
                            addOutput('File system reset cancelled.');
                        }
                        break;

                    case 'windows':
                        // List all open windows - improved selector
                        const windows = document.querySelectorAll('.window');

                        if (windows.length === 0) {
                            addOutput('No windows are currently open.');
                        } else {
                            addOutput('Open windows:');
                            let foundWindows = 0;

                            windows.forEach(window => {
                                const id = window.id;
                                // Only show windows with proper IDs
                                if (id && id.startsWith('window-')) {
                                    const titleElement = window.querySelector('.window-title');
                                    const title = titleElement ? titleElement.textContent : 'Untitled';
                                    const type = window.getAttribute('data-app-type') || 'unknown';

                                    addOutput(`  ${id} (${type}): ${title}`);
                                    foundWindows++;
                                }
                            });

                            if (foundWindows === 0) {
                                addOutput('  No identifiable windows found.');
                            }

                            addOutput('\nTo run code from an editor, use: run window-ID');

                            // Debug info to help understand the DOM structure
                            addOutput('\nDebug Info:', 'system-message');
                            addOutput(`  Total elements with class 'window': ${windows.length}`, 'system-message');

                            // Show DOM structure of first few elements for debugging
                            const maxDebug = Math.min(windows.length, 2);
                            for (let i = 0; i < maxDebug; i++) {
                                const win = windows[i];
                                addOutput(`  Window ${i + 1}: id=${win.id}, class=${win.className}`, 'system-message');

                                // Check if it has essential parts
                                const hasTitle = win.querySelector('.window-title') !== null;
                                const hasAppType = win.hasAttribute('data-app-type');
                                addOutput(`    Has title: ${hasTitle}, Has app-type: ${hasAppType}`, 'system-message');
                            }
                        }
                        break;

                    default:
                        addOutput(`Command not found: ${cmd}. Type 'help' to see available commands.`, 'error');
                }
            }
        }
    });
})();