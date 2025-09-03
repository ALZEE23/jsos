(function () {
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
  echo <text>     - Print text
  clear           - Clear the terminal
  run <editor-id> - Run code from a specific editor window
                   (e.g., run window-0)
  ls              - List directory contents
  cd <dir>        - Change directory
  pwd             - Print working directory
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

                        // Get the code from the editor using the getCode method
                        const code = editorWindow.querySelector('.code-textarea').value;

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

                        break;

                    case 'ls':
                        // Simple directory simulation
                        const directories = {
                            '/home/user': ['Documents', 'Projects', '.bashrc', 'readme.txt'],
                            '/home/user/Documents': ['notes.txt', 'report.pdf'],
                            '/home/user/Projects': ['web-os', 'javascript-examples']
                        };

                        const path = args[0] || terminalState.currentDirectory;
                        const contents = directories[path] || ['(empty directory)'];

                        addOutput(contents.join('  '));
                        break;

                    case 'cd':
                        // Simulate directory change
                        if (!args[0]) {
                            terminalState.currentDirectory = terminalState.env.HOME;
                        } else if (args[0] === '..') {
                            // Go up one directory
                            const pathParts = terminalState.currentDirectory.split('/');
                            if (pathParts.length > 2) { // Don't go above root
                                pathParts.pop();
                                terminalState.currentDirectory = pathParts.join('/');
                            }
                        } else {
                            // Simulate changing into a directory
                            const newPath = args[0].startsWith('/')
                                ? args[0]
                                : `${terminalState.currentDirectory}/${args[0]}`;

                            // In a real implementation, check if directory exists
                            terminalState.currentDirectory = newPath;
                        }
                        updatePrompt();
                        break;

                    case 'pwd':
                        addOutput(terminalState.currentDirectory);
                        break;

                    case 'date':
                        addOutput(new Date().toString());
                        break;

                    default:
                        addOutput(`Command not found: ${cmd}. Type 'help' to see available commands.`, 'error');
                }
            }
        }
    });
})();