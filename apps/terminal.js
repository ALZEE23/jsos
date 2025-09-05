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
                        <span class="terminal-foreshadow"></span>
                    </div>
                </div>
            `;

            // Get references to UI elements
            const terminalOutput = innerContent.querySelector('.terminal-output');
            const terminalInput = innerContent.querySelector('.terminal-input');
            const terminalPrompt = innerContent.querySelector('.terminal-prompt');
            const terminalForeshadow = innerContent.querySelector('.terminal-foreshadow');

            // Add CSS for foreshadow
            const style = document.createElement('style');
            style.textContent = `
                .terminal-input-line {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .terminal-prompt {
                    white-space: nowrap;
                }
                .terminal-input {
                    background: transparent;
                    border: none;
                    color: inherit;
                    font-family: inherit;
                    font-size: inherit;
                    outline: none;
                    flex-grow: 1;
                    position: relative;
                    z-index: 2;
                }
                .terminal-foreshadow {
                    position: absolute;
                    left: 0;
                    top: 0;
                    color: #666;
                    pointer-events: none;
                    white-space: pre;
                    z-index: 1;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                }
            `;
            document.head.appendChild(style);

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

                // Handle special formatting
                if (className === 'error') {
                    outputElement.style.color = '#f55';
                } else if (className === 'preformatted' || text.startsWith('Available commands:')) {
                    // Untuk teks preformatted seperti output help, gunakan elemen <pre>
                    const preElement = document.createElement('pre');
                    preElement.style.margin = '0';
                    preElement.style.fontFamily = 'inherit'; // Gunakan font yang sama dengan terminal
                    preElement.textContent = text;
                    outputElement.appendChild(preElement);
                    terminalOutput.appendChild(outputElement);
                    terminalOutput.scrollTop = terminalOutput.scrollHeight;
                    return; // Keluar dari fungsi lebih awal
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

            // Fungsi untuk mengupdate command foreshadow
            function updateCommandForeshadow(input) {
                // Jika input kosong, hapus foreshadow
                if (!input || !input.trim()) {
                    terminalForeshadow.innerHTML = '';
                    return;
                }

                // Split command dan argumen
                const parts = input.trim().split(' ');
                const cmd = parts[0].toLowerCase();

                // 1. Foreshadow untuk command
                if (parts.length === 1) {
                    // Prediksi command berdasarkan input
                    const commands = [
                        'help', 'echo', 'clear', 'run', 'ls', 'cd', 'pwd', 'date', 'neofetch',
                        'cat', 'touch', 'mkdir', 'rm', 'edit', 'mv', 'cp', 'chmod', 'reset-fs',
                        'windows', 'system-files', 'system-edit', 'system-reset', 'refresh'
                    ];

                    // Tambahkan commands dari history
                    terminalState.history.forEach(historyCmd => {
                        const cmdName = historyCmd.split(' ')[0];
                        if (!commands.includes(cmdName) && cmdName) {
                            commands.push(cmdName);
                        }
                    });

                    // Cari suggestion yang cocok
                    const suggestion = commands.find(command =>
                        command.toLowerCase().startsWith(cmd.toLowerCase()) &&
                        command.toLowerCase() !== cmd.toLowerCase()
                    );

                    if (suggestion) {
                        // Hitung posisi dengan benar
                        const promptWidth = terminalPrompt.getBoundingClientRect().width;

                        // Bersihkan dan atur ulang konten foreshadow
                        terminalForeshadow.innerHTML = '';

                        // Buat span untuk padding yang sesuai dengan prompt
                        const paddingSpan = document.createElement('span');
                        paddingSpan.style.visibility = 'hidden';
                        paddingSpan.textContent = terminalPrompt.textContent;
                        terminalForeshadow.appendChild(paddingSpan);

                        // Tambahkan input yang sudah diketik (hidden)
                        const inputSpan = document.createElement('span');
                        inputSpan.style.visibility = 'hidden';
                        inputSpan.textContent = input;
                        terminalForeshadow.appendChild(inputSpan);

                        // Tambahkan suggestion yang terlihat
                        const suggestionSpan = document.createElement('span');
                        suggestionSpan.textContent = suggestion.substring(cmd.length);
                        terminalForeshadow.appendChild(suggestionSpan);

                        console.log("Foreshadow updated with suggestion:", suggestion);
                    } else {
                        terminalForeshadow.innerHTML = '';
                    }
                }

            }

            // Tambahkan event listener untuk input
            terminalInput.addEventListener('input', function () {
                console.log("Input changed:", this.value);
                requestAnimationFrame(() => {
                    updateCommandForeshadow(this.value);
                });
            });

            // Tambahkan tombol Tab untuk menerima suggestion
            terminalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && terminalForeshadow.textContent) {
                    e.preventDefault();
                    terminalInput.value = terminalForeshadow.textContent.trim();
                    terminalForeshadow.textContent = '';

                    // Posisikan kursor di akhir input
                    setTimeout(() => {
                        terminalInput.selectionStart =
                            terminalInput.selectionEnd = terminalInput.value.length;
                    }, 0);
                }
                // Untuk tombol panah kanan, juga terima suggestion
                else if (e.key === 'ArrowRight' && terminalForeshadow.textContent &&
                    terminalInput.selectionStart === terminalInput.value.length) {
                    e.preventDefault();

                    // Dapatkan hanya suggestion span yang terlihat
                    const suggestionSpan = terminalForeshadow.querySelector('span:last-child');

                    if (suggestionSpan) {
                        // Tambahkan HANYA suggestion ke input
                        terminalInput.value += suggestionSpan.textContent;
                        terminalForeshadow.textContent = '';
                    }
                }
            });

            // Update foreshadow juga saat navigasi history
            const originalKeyDownHandler = terminalInput.onkeydown;
            terminalInput.addEventListener('keydown', (e) => {
                // Setelah up/down arrow, update foreshadow
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    // Tunggu sedikit agar nilai input terupdate dahulu
                    setTimeout(() => {
                        updateCommandForeshadow(terminalInput.value);
                    }, 10);
                }
            });

            // Perbaiki dan perluas fungsi autoCompleteCommand untuk mendukung fitur seperti ZSH
            function autoCompleteCommand(partial) {
                // Jika input kosong, tampilkan semua perintah yang tersedia
                if (!partial.trim()) {
                    const commonCommands = [
                        'help', 'echo', 'clear', 'run', 'ls', 'cd', 'pwd', 'date', 'neofetch',
                        'cat', 'touch', 'mkdir', 'rm', 'edit', 'mv', 'cp', 'chmod'
                    ];
                    addOutput('Available commands:');
                    addOutput(`  ${commonCommands.join('  ')}`);
                    return;
                }

                // Split command line untuk mendapatkan command dan arguments
                const parts = partial.trim().split(' ');
                const cmd = parts[0].toLowerCase();
                const args = parts.slice(1);
                const isCompletingArg = parts.length > 1 && !partial.endsWith(' ');

                // Jika sedang mengetik argumen dan bukan command
                if (isCompletingArg) {
                    // Auto-complete argument berdasarkan konteks command
                    switch (cmd) {
                        case 'cd':
                        case 'ls':
                        case 'cat':
                        case 'edit':
                        case 'rm':
                        case 'touch':
                        case 'mkdir':
                            // Path completion untuk command yang bekerja dengan file/directory
                            const currentArg = args[args.length - 1];
                            completeFilePath(currentArg, cmd).then(matches => {
                                if (matches.length === 1) {
                                    // Single match - replace current argument with full path
                                    const commandParts = parts.slice(0, -1);
                                    const isDir = matches[0].endsWith('/');
                                    terminalInput.value = [...commandParts, matches[0]].join(' ') + (isDir ? ' ' : '');
                                } else if (matches.length > 1) {
                                    // Multiple matches - show options
                                    addOutput(`Possible completions for '${currentArg}':`);
                                    // Format with colors based on type
                                    const formattedMatches = matches.map(match => {
                                        if (match.endsWith('/')) {
                                            return `<span style="color:#4a9df8">${match}</span>`;
                                        } else if (match.endsWith('*')) {
                                            return `<span style="color:#41d55b">${match}</span>`;
                                        }
                                        return match;
                                    });

                                    // Organize in columns
                                    addOutput(organizeInColumns(formattedMatches));

                                    // Find common prefix for partial completion
                                    const commonPrefix = findCommonPrefix(matches);
                                    if (commonPrefix.length > currentArg.length) {
                                        const commandParts = parts.slice(0, -1);
                                        terminalInput.value = [...commandParts, commonPrefix].join(' ');
                                    }
                                }
                            });
                            return;

                        case 'system-edit':
                            // Complete system file names
                            if (typeof window.SystemFiles !== 'undefined') {
                                const files = SystemFiles.listFiles();
                                const currentArg = args[args.length - 1];
                                const matches = files.filter(file => file.startsWith(currentArg));

                                if (matches.length === 1) {
                                    const commandParts = parts.slice(0, -1);
                                    terminalInput.value = [...commandParts, matches[0]].join(' ');
                                } else if (matches.length > 1) {
                                    addOutput(`Possible system files:`);
                                    addOutput(`  ${matches.join('  ')}`);

                                    // Find common prefix for partial completion
                                    const commonPrefix = findCommonPrefix(matches);
                                    if (commonPrefix.length > currentArg.length) {
                                        const commandParts = parts.slice(0, -1);
                                        terminalInput.value = [...commandParts, commonPrefix].join(' ');
                                    }
                                }
                            }
                            return;
                    }
                }

                // Command completion
                const commands = [
                    'help', 'echo', 'clear', 'run', 'ls', 'cd', 'pwd', 'date', 'neofetch',
                    'cat', 'touch', 'mkdir', 'rm', 'edit', 'mv', 'cp', 'chmod', 'reset-fs',
                    'windows', 'system-files', 'system-edit', 'system-reset', 'refresh'
                ];

                // Tambahkan command dari history yang belum ada dalam daftar commands
                terminalState.history.forEach(historyCmd => {
                    const cmdName = historyCmd.split(' ')[0];
                    if (!commands.includes(cmdName) && cmdName) {
                        commands.push(cmdName);
                    }
                });

                // Filter command yang cocok dengan input
                const matches = commands.filter(command => command.startsWith(cmd));

                if (matches.length === 1) {
                    // Single match - complete the command with space
                    if (parts.length === 1) {
                        terminalInput.value = matches[0] + ' ';
                    } else {
                        // Keep arguments, just replace the command
                        const args = parts.slice(1).join(' ');
                        terminalInput.value = `${matches[0]} ${args}`;
                    }
                } else if (matches.length > 1) {
                    // Multiple matches - show options dengan highlight
                    addOutput('Possible commands:');

                    // Highlight matches dengan bold dan warna
                    const formattedMatches = matches.map(match => {
                        return `<span style="color:#f7df1e; font-weight:bold">${match}</span>`;
                    });

                    // Organize in columns
                    addOutput(organizeInColumns(formattedMatches));

                    // Partial completion sampai karakter yang sama
                    const commonPrefix = findCommonPrefix(matches);
                    if (commonPrefix.length > cmd.length) {
                        if (parts.length === 1) {
                            terminalInput.value = commonPrefix;
                        } else {
                            const args = parts.slice(1).join(' ');
                            terminalInput.value = `${commonPrefix} ${args}`;
                        }
                    }
                }
            }

            // Helper function untuk mencari prefix umum dari array of strings
            function findCommonPrefix(strings) {
                if (!strings.length) return '';
                if (strings.length === 1) return strings[0];

                let prefix = '';
                const firstString = strings[0];

                for (let i = 0; i < firstString.length; i++) {
                    const char = firstString[i];
                    if (strings.every(str => str[i] === char)) {
                        prefix += char;
                    } else {
                        break;
                    }
                }

                return prefix;
            }

            // Helper function untuk format output dalam kolom
            function organizeInColumns(items) {
                // Estimasi lebar terminal dan item
                const terminalWidth = Math.floor(terminalOutput.offsetWidth / 10); // Perkiraan karakter per baris
                const maxItemLength = Math.max(...items.map(item => {
                    // Strip HTML tags untuk menghitung panjang teks sebenarnya
                    return item.replace(/<[^>]*>/g, '').length;
                }));

                const colWidth = maxItemLength + 2; // Extra space between columns
                const numCols = Math.max(1, Math.floor(terminalWidth / colWidth));

                let result = '';
                let currentCol = 0;

                items.forEach((item, index) => {
                    // Strip HTML untuk mengukur panjang teks asli
                    const strippedItem = item.replace(/<[^>]*>/g, '');
                    const padding = ' '.repeat(colWidth - strippedItem.length);

                    result += item + padding;
                    currentCol++;

                    if (currentCol >= numCols && index < items.length - 1) {
                        result += '<br>';
                        currentCol = 0;
                    }
                });

                return result;
            }

            // Function untuk melengkapi path file
            async function completeFilePath(partial, command) {
                try {
                    // Handle path relatif dan absolute
                    let basePath = terminalState.currentDirectory;
                    let searchPath = partial;

                    // Check jika partial berisi path dengan directory
                    const lastSlashIndex = partial.lastIndexOf('/');
                    if (lastSlashIndex !== -1) {
                        // Ada subdirectory dalam path
                        const pathPrefix = partial.substring(0, lastSlashIndex + 1);
                        searchPath = partial.substring(lastSlashIndex + 1);

                        // Resolve base path
                        try {
                            basePath = fs.resolvePath(pathPrefix, terminalState.currentDirectory);
                        } catch (e) {
                            // Invalid path, no completions
                            return [];
                        }
                    }

                    // Dapatkan file dan directory di path yang ditentukan
                    const contents = fs.listDir(basePath);

                    // Filter berdasarkan searchPath
                    const matches = contents
                        .filter(item => item.name.startsWith(searchPath))
                        .map(item => {
                            // Format path dengan prefix jika ada
                            let result = item.name;
                            if (lastSlashIndex !== -1) {
                                result = partial.substring(0, lastSlashIndex + 1) + result;
                            }

                            // Add trailing slash untuk directory atau bintang untuk executable
                            if (item.type === 'directory') {
                                result += '/';
                            } else if (item.executable) {
                                result += '*';
                            }

                            return result;
                        });

                    return matches;
                } catch (error) {
                    console.error("Path completion error:", error);
                    return [];
                }
            }

            function processCommand(command) {
                // Original command processing
                addCommandOutput(command);

                // Add to history only if it's not the same as the previous command
                if (command &&
                    (terminalState.history.length === 0 ||
                        command !== terminalState.history[terminalState.history.length - 1])) {
                    terminalState.history.push(command);
                }

                terminalState.historyIndex = terminalState.history.length;

                // Lanjutkan dengan parsing dan eksekusi command seperti sebelumnya
                const parts = command.split(' ');
                const cmd = parts[0].toLowerCase();
                const args = parts.slice(1);

                // Process based on command
                switch (cmd) {
                    case 'help':
                        // Menggunakan elemen <pre> untuk mempertahankan format
                        addOutput(`<pre>Available commands:
  help            - Show this help message
  echo &lt;text&gt;     - Print text to the terminal
  clear           - Clear the terminal screen
  
  # File System Commands
  ls [-l]         - List directory contents (use -l for detailed view)
  cat &lt;file&gt;      - Display file contents
  touch &lt;file&gt;    - Create an empty file or update timestamp
  mkdir &lt;dir&gt;     - Create a new directory
  rm [-r] &lt;path&gt;  - Remove a file or directory (-r for recursive)
  cd &lt;dir&gt;        - Change directory
  pwd             - Print working directory
  edit &lt;file&gt;     - Open file in code editor (creates if doesn't exist)
  mv &lt;src&gt; &lt;dst&gt;  - Move/rename file or directory
  cp &lt;src&gt; &lt;dst&gt;  - Copy file or directory
  chmod +x|-x &lt;f&gt; - Make file executable (+x) or not (-x)
  reset-fs        - Reset file system to default state (CAUTION!)
  
  # Execution Commands
  run &lt;file.js&gt;   - Run a JavaScript file from the filesystem
  run &lt;window-id&gt; - Run code from a specific editor window
  windows         - List all open windows with IDs
  date            - Show current date and time
  
  # System Commands
  system-files    - List all system files
  system-edit &lt;f&gt; - Edit a system file
  system-reset    - Reset all system modifications
  refresh         - Reload the page</pre>`);
                        break;

                    case 'echo':
                        addOutput(args.join(' '));
                        break;

                    case 'clear':
                        terminalOutput.innerHTML = '';
                        break;

                    case 'run':
                        if (args.length === 0) {
                            addOutput('Usage: run <file.js> or run <editor-id>', 'error');
                            addOutput('Examples:\n  run script.js    - Run a JavaScript file from the filesystem\n  run window-0     - Run code from an editor window', 'system-message');
                            break;
                        }

                        const target = args[0];

                        // Check if running a file from filesystem
                        if (target.endsWith('.js') || !target.startsWith('window-')) {
                            try {
                                // Resolve the file path
                                const resolvedPath = fs.resolvePath(target, terminalState.currentDirectory);

                                if (!fs.exists(resolvedPath)) {
                                    addOutput(`run: ${target}: No such file`, 'error');
                                    break;
                                }

                                // Check if it's a file
                                const stat = fs.stat(resolvedPath);
                                if (stat.type !== 'file') {
                                    addOutput(`run: ${target}: Not a file`, 'error');
                                    break;
                                }

                                // Read the file content
                                const code = fs.readFile(resolvedPath);

                                if (!code || code.trim() === '') {
                                    addOutput(`run: ${target}: Empty file`, 'error');
                                    break;
                                }

                                // Check if it's a JavaScript file
                                if (!resolvedPath.endsWith('.js') && !confirm(`File '${target}' doesn't have a .js extension. Try to run as JavaScript anyway?`)) {
                                    addOutput(`run: Canceled`, 'error');
                                    break;
                                }

                                // Run the JavaScript code
                                addOutput(`[${new Date().toLocaleTimeString()}] Running ${target}...`);

                                try {
                                    // Simple fix specifically for standalone function calls

                                    try {
                                        // Capture console.log outputs
                                        const originalConsoleLog = console.log;
                                        let logs = [];

                                        console.log = (...args) => {
                                            const logMessage = args.join(' ');
                                            logs.push(logMessage);
                                            originalConsoleLog(...args);
                                        };

                                        // Get the raw result by running the code directly
                                        let rawResult = eval(code);

                                        // Restore console.log
                                        console.log = originalConsoleLog;

                                        // Output the logs
                                        logs.forEach(log => {
                                            addOutput(log);
                                        });

                                        // If there was a return value, show it
                                        if (rawResult !== undefined) {
                                            addOutput(`${rawResult}`);
                                        }

                                        addOutput(`[${new Date().toLocaleTimeString()}] Finished running ${target}`);
                                    } catch (error) {
                                        addOutput(`Error running ${target}: ${error.message}`, 'error');
                                        if (error.lineNumber) {
                                            addOutput(`  at line ${error.lineNumber}`, 'error');
                                        }
                                    }
                                } catch (error) {
                                    addOutput(`run: ${error.message}`, 'error');
                                }
                            } catch (error) {
                                addOutput(`run: ${error.message}`, 'error');
                            }
                        } else {
                            // Original window-based run functionality
                            const editorId = target;
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

                            // Get the code directly from the textarea
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
                                addOutput(`[${new Date().toLocaleTimeString()}] Running code from ${editorId}...`);

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

                                    addOutput(`[${new Date().toLocaleTimeString()}] Finished running code from ${editorId}`);
                                } catch (error) {
                                    addOutput(`Error: ${error.message}`, 'error');
                                }
                            } catch (err) {
                                addOutput(`Error: ${err.message}`, 'error');
                            }
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

                    case 'system-files':
                        // Ensure SystemFiles is available
                        if (typeof window.SystemFiles === 'undefined') {
                            addOutput('SystemFiles module not found. Attempting to initialize...', 'system-message');

                            // Dynamically load SystemFiles if it's not already loaded
                            const script = document.createElement('script');
                            script.src = 'js/SystemFiles.js';
                            script.onload = () => {
                                addOutput('SystemFiles module loaded successfully!', 'system-message');
                            };
                            script.onerror = () => {
                                addOutput('Failed to load SystemFiles module.', 'error');
                            };
                            document.body.appendChild(script);
                            break;
                        }

                        const files = SystemFiles.listFiles();
                        if (files.length === 0) {
                            addOutput('No system files loaded yet. They may still be loading...', 'system-message');
                            addOutput('Use system-reload to force loading of all files.', 'system-message');
                        } else {
                            addOutput('System Files:');
                            files.forEach(file => {
                                addOutput(`  ${file}`);
                            });
                            addOutput('\nUse system-edit <file> to edit a system file.');
                        }
                        break;

                    case 'system-edit':
                        if (typeof window.SystemFiles === 'undefined') {
                            addOutput('SystemFiles module not loaded.', 'error');
                            break;
                        }

                        if (args.length === 0) {
                            addOutput('Usage: system-edit <file>', 'error');
                            break;
                        }

                        // Handle path with or without leading slash
                        let filePath = args[0];
                        if (filePath.startsWith('/')) {
                            filePath = filePath.substring(1);
                        }

                        const content = SystemFiles.getFile(filePath);

                        if (content === null) {
                            addOutput(`File not found: ${filePath}`, 'error');
                            addOutput('Use system-files to list available files.', 'system-message');
                            break;
                        }

                        // Open in code editor with special save handler
                        WindowManager.createWindow('code-editor', {
                            code: content,
                            filePath: filePath,
                            title: `System Edit: ${filePath}`,
                            onSave: (newContent) => {
                                try {
                                    const success = SystemFiles.saveFile(filePath, newContent);
                                    if (success) {
                                        addOutput(`System file updated: ${filePath}`);
                                        addOutput('Changes have been applied. For full effect, you may need to refresh the page.', 'system-message');
                                    } else {
                                        addOutput(`Failed to apply changes to ${filePath}`, 'error');
                                    }
                                } catch (e) {
                                    addOutput(`Error saving system file: ${e.message}`, 'error');
                                }
                            }
                        });
                        break;

                    case 'system-reset':
                        if (typeof window.SystemFiles === 'undefined') {
                            addOutput('SystemFiles module not loaded.', 'error');
                            break;
                        }

                        if (confirm('WARNING: This will reset all system file modifications. Continue?')) {
                            SystemFiles.reset();
                            addOutput('System files have been reset to their original versions.');
                            addOutput('Type refresh to reload the page and apply changes.', 'system-message');
                        } else {
                            addOutput('System reset cancelled.');
                        }
                        break;

                    case 'system-reload':
                        if (typeof window.SystemFiles === 'undefined') {
                            addOutput('SystemFiles module not loaded. Trying to load it...', 'system-message');

                            const script = document.createElement('script');
                            script.src = 'js/SystemFiles.js';
                            script.onload = () => {
                                addOutput('SystemFiles module loaded successfully!', 'system-message');
                                SystemFiles.reload().then(success => {
                                    if (success) {
                                        addOutput('All system files reloaded successfully.', 'system-message');
                                    } else {
                                        addOutput('Failed to reload some system files.', 'error');
                                    }
                                });
                            };
                            document.body.appendChild(script);
                        } else {
                            addOutput('Reloading all system files...');
                            SystemFiles.reload().then(success => {
                                if (success) {
                                    addOutput('All system files reloaded successfully.', 'system-message');
                                } else {
                                    addOutput('Failed to reload some system files.', 'error');
                                }
                            });
                        }
                        break;

                    case 'refresh':
                        addOutput('Reloading page...');
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                        break;

                    case 'neofetch':
                        // ASCII art untuk JS OS dengan logo JavaScript
                        const hostname = 'jsterm';
                        const username = terminalState.env.USER;
                        const osVersion = 'v1.0.0';
                        const kernel = 'WebKit 2.0';
                        const uptime = Math.floor(performance.now() / 60000) + ' minutes';
                        const packages = '42';
                        const shell = 'JSBash';
                        const resolution = `${window.innerWidth}x${window.innerHeight}`;
                        const theme = 'Dark+';
                        const cpu = navigator.hardwareConcurrency + ' cores';
                        const memory = Math.round(performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0) + ' MB / '
                            + Math.round(performance.memory ? performance.memory.jsHeapSizeLimit / 1048576 : 0) + ' MB';

                        // Membuat array dengan warna JS yang khas - kuning dan hitam
                        const colorBlocks = Array(8).fill(`<span style="color:#f7df1e">■</span><span style="color:#323330">■</span>`).join('');

                        // Logo JS dalam ASCII art
                        const jsLogo = [
                            `<span style="color:#f7df1e">                   </span>`,
                            `<span style="color:#f7df1e">    ████████████   </span>`,
                            `<span style="color:#f7df1e">   ██████████████  </span>`,
                            `<span style="color:#f7df1e">   ██        ████  </span>`,
                            `<span style="color:#f7df1e">            ████   </span>`,
                            `<span style="color:#f7df1e">           ████    </span>`,
                            `<span style="color:#f7df1e">          ████     </span>`,
                            `<span style="color:#f7df1e">         ████      </span>`,
                            `<span style="color:#f7df1e">        ████       </span>`,
                            `<span style="color:#f7df1e">  ██    ████       </span>`,
                            `<span style="color:#f7df1e">  ██████████       </span>`,
                            `<span style="color:#f7df1e">   ████████        </span>`,
                            `<span style="color:#f7df1e">                   </span>`
                        ];

                        // Membangun informasi sistem dengan logo
                        const systemInfo = [
                            `<span style="color:#f7df1e">${username}@${hostname}</span>`,
                            `<span style="color:#f7df1e">-----------------</span>`,
                            `<span style="color:#f7df1e">OS:</span> JavaScript OS ${osVersion}`,
                            `<span style="color:#f7df1e">Kernel:</span> ${kernel}`,
                            `<span style="color:#f7df1e">Uptime:</span> ${uptime}`,
                            `<span style="color:#f7df1e">Packages:</span> ${packages}`,
                            `<span style="color:#f7df1e">Shell:</span> ${shell}`,
                            `<span style="color:#f7df1e">Resolution:</span> ${resolution}`,
                            `<span style="color:#f7df1e">Theme:</span> ${theme}`,
                            `<span style="color:#f7df1e">CPU:</span> ${cpu}`,
                            `<span style="color:#f7df1e">Memory:</span> ${memory}`,
                            ``,
                            `${colorBlocks}`
                        ];

                        // Menggabungkan logo dan info sistem dalam format yang rapi
                        let output = '';
                        for (let i = 0; i < Math.max(jsLogo.length, systemInfo.length); i++) {
                            const logoLine = i < jsLogo.length ? jsLogo[i] : '';
                            const infoLine = i < systemInfo.length ? systemInfo[i] : '';
                            output += `${logoLine}   ${infoLine}<br>`;
                        }

                        addOutput(output);
                        break;

                    default:
                        addOutput(`Command not found: ${cmd}. Type 'help' to see available commands.`, 'error');
                }
            }

            function fixForeshadowPosition() {
                if (terminalForeshadow) {
                    const promptWidth = terminalPrompt.getBoundingClientRect().width;
                    terminalForeshadow.style.paddingLeft = promptWidth + 'px';
                }
            }

            setTimeout(fixForeshadowPosition, 100);
            window.addEventListener('resize', fixForeshadowPosition);
        }
    });
})();