(function () {
    WindowManager.registerWindowType('code-editor', {
        title: function (options) {
            // Use the file path for the title if available
            return options && options.filePath ? options.filePath.split('/').pop() : 'Untitled';
        },
        defaultWidth: 500,
        defaultHeight: 400,

        initContent: function (contentElement, options) {
            const innerContent = contentElement.querySelector('[id^="inner-content"]');
            if (!innerContent) {
                console.error('Inner content element not found');
                return;
            }

            // Ubah implementasi code editor untuk menggunakan CodeMirror tanpa mengubah tampilan

            // Tetap menggunakan layout HTML yang sama
            innerContent.innerHTML = `
                <div class="code-editor-container">
                    <div class="line-numbers"></div>
                    <div class="code-mirror-wrapper"></div>
                    <div class="suggestions-container" style="display: none;"></div>
                    <div class="editor-controls">
                        <div class="save-status"></div>
                    </div>
                </div>
            `;

            // Get references to UI elements
            const editorWrapper = innerContent.querySelector('.code-mirror-wrapper');
            const lineNumbers = innerContent.querySelector('.line-numbers');
            const suggestionsContainer = innerContent.querySelector('.suggestions-container');
            const saveStatus = innerContent.querySelector('.save-status');

            // Siapkan konten awal
            const initialContent = options.code || '// JavaScript code example\nconsole.log("Hello, world!");\n\n// Define a function\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\ngreet("User");';

            // Perbaiki definisi extraKeys
            const cmExtraKeys = {
                "Ctrl-S": function (cm) {
                    // Save on Ctrl+S / Cmd+S
                    if (options.filePath) {
                        saveFile(options.filePath, cm.getValue());
                    } else {
                        showSaveDialog(cm.getValue());
                    }
                },
                "Ctrl-/": function (cm) {
                    console.log("Toggle comment triggered");
                    try {
                        cm.toggleComment({ lineComment: "//" });
                        console.log("Toggle comment executed successfully");
                    } catch (error) {
                        console.error("Error toggling comment:", error);
                    }
                }
            };

            // Setel extraKeys di awal inisialisasi CodeMirror
            const codeEditor = CodeMirror(editorWrapper, {
                value: initialContent,
                mode: "javascript",
                theme: 'default',
                lineNumbers: false,
                indentUnit: 4,
                smartIndent: true,
                indentWithTabs: false,
                lineWrapping: false,
                autoCloseBrackets: true,
                matchBrackets: true,
                viewportMargin: Infinity,
                extraKeys: cmExtraKeys  // Gunakan variabel yang sudah didefinisikan
            });

            // 1. Tambahkan callback untuk menangani keydown event dengan prioritas tinggi
            // Tambahkan ini sebelum Anda mengatur extraKeys
            codeEditor.getInputField().addEventListener('keydown', function (event) {
                // Cek jika suggestion box visible dan Enter ditekan
                if (event.key === 'Enter' && suggestionsContainer.style.display !== 'none') {
                    console.log("Enter intercepted at input field level!");
                    event.preventDefault();
                    event.stopPropagation();
                    applySuggestion();
                    return false;
                }
            }, true); // true untuk fase capturing - sangat penting!

            // Solusi minimalis untuk mengatasi masalah arrow keys

            // 1. Pasang event handler khusus untuk keyboard navigation
            codeEditor.getInputField().addEventListener('keydown', function (e) {
                // Hanya proses jika suggestion box terlihat
                if (suggestionsContainer.style.display !== 'none') {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        // Hentikan propagasi dan default behavior
                        e.preventDefault();
                        e.stopImmediatePropagation();

                        // Jalankan navigasi
                        const direction = e.key === 'ArrowDown' ? 1 : -1;

                        // Simpan cursor position
                        const cursor = codeEditor.getCursor();

                        // Navigasi suggestion
                        const items = suggestionsContainer.querySelectorAll('.suggestion-item');
                        if (items.length === 0) return;

                        const currentIndex = [...items].findIndex(item => item.classList.contains('selected'));
                        let newIndex = currentIndex + direction;

                        // Wrap around
                        if (newIndex < 0) newIndex = items.length - 1;
                        if (newIndex >= items.length) newIndex = 0;

                        // Update selected item
                        items.forEach(item => item.classList.remove('selected'));
                        items[newIndex].classList.add('selected');

                        // Kembalikan cursor ke posisi semula dan fokus
                        setTimeout(() => {
                            codeEditor.focus();
                            codeEditor.setCursor(cursor);
                        }, 0);

                        return false;
                    }
                }
            }, true); // true untuk fase capturing - sangat penting!

            // Perlu memastikan mode "comment" dari CodeMirror dimuat
            // Tambahkan kode ini di bagian awal inisialisasi, setelah deklarasi innerContent

            // Pastikan addon comment tersedia
            if (!CodeMirror.commands.toggleComment) {
                console.error("CodeMirror comment addon tidak tersedia!");

                // Mendefinisikan fallback toggleComment jika addon asli tidak tersedia
                CodeMirror.commands.toggleComment = function (cm) {
                    const selections = cm.listSelections();
                    let lines = [];
                    let lineNumbers = [];

                    // Kumpulkan baris yang dipilih
                    for (let i = 0; i < selections.length; i++) {
                        const from = selections[i].from();
                        const to = selections[i].to();

                        for (let j = from.line; j <= to.line; j++) {
                            if (lineNumbers.indexOf(j) === -1) {
                                lineNumbers.push(j);
                                lines.push(cm.getLine(j));
                            }
                        }
                    }

                    // Cek apakah semua baris sudah memiliki komentar
                    const areAllCommented = lines.every(line => /^\s*\/\//.test(line));

                    // Toggle komentar untuk semua baris
                    cm.operation(() => {
                        for (let i = 0; i < lineNumbers.length; i++) {
                            const line = lines[i];
                            const lineNum = lineNumbers[i];

                            if (areAllCommented) {
                                // Hapus komentar
                                const newLine = line.replace(/^\s*\/\/\s?/, '');
                                cm.replaceRange(
                                    newLine,
                                    { line: lineNum, ch: 0 },
                                    { line: lineNum, ch: line.length }
                                );
                            } else {
                                // Tambahkan komentar
                                cm.replaceRange(
                                    "// " + line,
                                    { line: lineNum, ch: 0 },
                                    { line: lineNum, ch: line.length }
                                );
                            }
                        }
                    });

                    console.log("Manual toggle comment executed");
                };
            }

            // Ganti referensi ke codeTextarea dengan codeEditor
            const codeTextarea = {
                value: initialContent,
                selectionStart: 0,
                selectionEnd: 0,
                focus: function () { codeEditor.focus(); },
                dispatchEvent: function () { },
                // Emulasi properti yang diperlukan
                get scrollTop() { return codeEditor.getScrollInfo().top; },
                set scrollTop(val) { codeEditor.scrollTo(null, val); },
                get scrollLeft() { return codeEditor.getScrollInfo().left; },
                set scrollLeft(val) { codeEditor.scrollTo(val, null); }
            };

            // Update fungsi updateLineNumbers untuk bekerja dengan CodeMirror
            function updateLineNumbers() {
                const lines = codeEditor.getValue().split('\n');
                const count = lines.length;

                let lineNumbersHtml = '';
                for (let i = 0; i < count; i++) {
                    lineNumbersHtml += `<div>${i + 1}</div>`;
                }

                lineNumbers.innerHTML = lineNumbersHtml;
            }

            // Jalankan update line numbers awal
            updateLineNumbers();

            // Variables for auto-save functionality
            let autoSaveTimeout = null;
            const AUTO_SAVE_DELAY = 2000; // 2 seconds after last change

            // Function to handle auto-save with debounce
            function triggerAutoSave() {
                // Clear any pending save timeout
                if (autoSaveTimeout) {
                    clearTimeout(autoSaveTimeout);
                }

                // Set a new timeout for auto-saving
                autoSaveTimeout = setTimeout(() => {
                    if (options.filePath) {
                        console.log("Auto-saving to:", options.filePath);
                        saveFile(options.filePath, codeEditor.getValue(), true); // true indicates auto-save
                    }
                }, AUTO_SAVE_DELAY);
            }

            // Update events untuk CodeMirror
            codeEditor.on('change', function () {
                // Update codeTextarea.value untuk memastikan kompatibilitas
                codeTextarea.value = codeEditor.getValue();

                // Update line numbers
                updateLineNumbers();

                // Handle auto-completion
                handleAutoCompletion();

                // Auto-save
                if (options.filePath) {
                    console.log("Change detected, triggering auto-save for:", options.filePath);
                    triggerAutoSave();
                } else {
                    console.log("No filePath in options, auto-save skipped");
                }
            });

            codeEditor.on('scroll', function () {
                // Update line numbers saat scrolling
                lineNumbers.style.top = (-codeEditor.getScrollInfo().top) + 'px';

                // Sembunyikan saran
                hideSuggestions();
            });

            // Store the file path for saving
            const filePath = options.filePath;

            // Keywords for suggestions
            const jsKeywords = [
                'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
                'default', 'delete', 'do', 'else', 'export', 'extends', 'false',
                'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
                'new', 'null', 'return', 'super', 'switch', 'this', 'throw',
                'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
            ];

            const jsFunctions = [
                'Array', 'Boolean', 'Date', 'Error', 'Function', 'JSON', 'Math', 'Number',
                'Object', 'Promise', 'RegExp', 'String', 'console', 'document', 'window',
                'alert', 'confirm', 'fetch', 'parseInt', 'parseFloat', 'setTimeout',
                'clearTimeout', 'setInterval', 'clearInterval'
            ];

            const jsMethods = {
                'console': ['log', 'warn', 'error', 'info', 'debug', 'table'],
                'Array': ['from', 'isArray', 'of'],
                'array': ['push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'join', 'map', 'filter'],
                'String': ['fromCharCode', 'fromCodePoint'],
                'string': ['charAt', 'concat', 'includes', 'indexOf', 'replace', 'slice', 'split']
            };

            // Initialize line numbers
            updateLineNumbers();

            // Event listeners
            codeTextarea.addEventListener('input', () => {
                updateLineNumbers();
                handleAutoCompletion();

                // Trigger auto-save if we have a file path (meaning it was previously saved)
                if (options.filePath) {
                    triggerAutoSave();
                }
            });

            // Sync scroll between line numbers and textarea
            codeTextarea.addEventListener('scroll', () => {
                lineNumbers.style.top = (-codeTextarea.scrollTop) + 'px';
                hideSuggestions();
            });

            codeTextarea.addEventListener('keydown', (e) => {
                // Save on Ctrl+S / Cmd+S
                if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();

                    // Use options.filePath instead of the local filePath variable to ensure it's always up to date
                    if (options.filePath) {
                        // If we already have a file path, save directly
                        console.log("Saving to existing path:", options.filePath);
                        saveFile(options.filePath, codeTextarea.value);
                    } else {
                        // Ask for a file name and path
                        console.log("Showing save dialog for new file");
                        showSaveDialog(codeTextarea.value);
                    }

                    return;
                }

                // Toggle comments with Ctrl+/ or Cmd+/
                if ((e.key === '/' || e.key === '?') && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    toggleComment();
                    return;
                }

                // Handle suggestion selection with arrow keys
                if (suggestionsContainer.style.display !== 'none') {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
                        return;
                    }

                    if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        applySuggestion();
                        return;
                    }

                    if (e.key === 'Escape') {
                        e.preventDefault();
                        hideSuggestions();
                        // Make sure the event doesn't propagate to close the window
                        e.stopPropagation();
                        return;
                    }
                }

                // Handle tab key for indentation (when no suggestions are shown)
                if (e.key === 'Tab' && suggestionsContainer.style.display === 'none') {
                    e.preventDefault();

                    // Insert tab at cursor position
                    const start = codeTextarea.selectionStart;
                    const end = codeTextarea.selectionEnd;

                    codeTextarea.value = codeTextarea.value.substring(0, start) + '    ' + codeTextarea.value.substring(end);

                    // Move cursor after the inserted tab
                    codeTextarea.selectionStart = codeTextarea.selectionEnd = start + 4;
                }

                // Prevent event bubbling for all keydown events
                e.stopPropagation();
            });

            codeTextarea.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Prevent window drag
            });

            // Function to show save dialog
            function showSaveDialog(content) {
                console.log("Showing save dialog");

                // Determine an appropriate default path
                let defaultPath = "/home/user/Documents/untitled.js";

                // Create a simple save dialog
                const saveDialog = document.createElement('div');
                saveDialog.className = 'save-dialog';
                saveDialog.innerHTML = `
                    <div class="save-dialog-content">
                        <h2>Save File</h2>
                        <div class="input-group">
                            <label for="save-path">File path:</label>
                            <input type="text" id="save-path" value="${defaultPath}">
                        </div>
                        <div class="dialog-buttons">
                            <button class="save-confirm">Save</button>
                            <button class="save-cancel">Cancel</button>
                        </div>
                    </div>
                `;

                document.body.appendChild(saveDialog);

                // Focus the input
                const pathInput = saveDialog.querySelector('#save-path');
                pathInput.focus();
                pathInput.setSelectionRange(pathInput.value.lastIndexOf('/') + 1, pathInput.value.length);

                // Function to handle the save action
                function handleSave() {
                    const path = pathInput.value;

                    // Check if file already exists
                    if (window.FileSystem && FileSystem.exists(path)) {
                        const confirmOverwrite = confirm(`File '${path}' already exists. Overwrite?`);
                        if (!confirmOverwrite) {
                            return; // Don't save, keep dialog open
                        }
                    }

                    saveFile(path, content);
                    console.log("After saveFile call in showSaveDialog, options.filePath =", options.filePath);
                    saveDialog.remove();
                }

                // Handle Enter key in input
                pathInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSave();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        saveDialog.remove();
                    }
                });

                // Handle buttons
                saveDialog.querySelector('.save-confirm').addEventListener('click', handleSave);

                saveDialog.querySelector('.save-cancel').addEventListener('click', () => {
                    saveDialog.remove();
                });
            }

            // Override fungsi saveFile untuk menggunakan CodeMirror
            function saveFile(path, content, isAutoSave = false) {
                console.log(`${isAutoSave ? 'Auto-saving' : 'Saving'} to:`, path);
                console.log("Current options.filePath:", options.filePath);

                try {
                    // Use the FileSystem to save the file
                    if (window.FileSystem) {
                        // Check if this is an existing file that we're updating (our own file)
                        const isSameFile = path === options.filePath;
                        console.log("Is same file check:", { path, optionsFilePath: options.filePath, isSameFile });

                        // Check if file exists and it's not our current file
                        if (!isSameFile && FileSystem.exists(path)) {
                            // For manual save, ask for confirmation
                            if (!isAutoSave) {
                                const confirmOverwrite = confirm(`File '${path}' already exists. Overwrite?`);
                                if (!confirmOverwrite) {
                                    console.log("Save canceled - file exists");
                                    showNotification("Save canceled - file already exists", "info");
                                    return;
                                }
                            } else {
                                // For auto-save of a different file, don't overwrite without confirmation
                                // Just silently abort the auto-save
                                console.log("Auto-save canceled - would overwrite a different file");
                                return;
                            }
                        }

                        // Save the file
                        FileSystem.writeFile(path, content);

                        // Update the window title with the new file name
                        const windowElement = contentElement.closest('.window');
                        if (windowElement) {
                            const titleElement = windowElement.querySelector('.window-title');
                            if (titleElement) {
                                const fileName = path.split('/').pop();
                                titleElement.textContent = fileName;
                            }
                        }

                        // Update the stored file path in options (this is critical!)
                        options.filePath = path;
                        console.log("Updated options.filePath to:", path);

                        // Show a success message for manual saves only
                        if (!isAutoSave) {
                            showNotification(`File saved: ${path}`);
                        }
                        // No status update for auto-save (silent operation)

                    } else {
                        // Only show errors for manual saves
                        if (!isAutoSave) {
                            showNotification('FileSystem not available', 'error');
                        }
                    }
                } catch (error) {
                    // Only show errors for manual saves
                    if (!isAutoSave) {
                        showNotification(`Error saving file: ${error.message}`, 'error');
                    }
                    console.error("Save error:", error);
                }
            }

            // Function to show a notification
            function showNotification(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = `notification ${type}`;
                notification.textContent = message;

                document.body.appendChild(notification);

                // Remove after a delay
                setTimeout(() => {
                    notification.style.opacity = '0';
                    setTimeout(() => notification.remove(), 300);
                }, 2000);
            }

            // Auto-completion handling
            function handleAutoCompletion() {
                const cursor = codeEditor.getCursor();
                const line = codeEditor.getLine(cursor.line);
                const textBeforeCursor = line.substring(0, cursor.ch);

                // Dapatkan kata yang sedang diketik
                const match = textBeforeCursor.match(/[a-zA-Z0-9_$]+$/);
                if (!match) {
                    hideSuggestions();
                    return;
                }

                const currentWord = match[0];
                if (currentWord.length < 1) {
                    hideSuggestions();
                    return;
                }

                // Check for dot notation (e.g., "console.")
                const dotMatch = textBeforeCursor.match(/([a-zA-Z0-9_$]+)\.([a-zA-Z0-9_$]*)$/);

                let suggestions = [];

                if (dotMatch) {
                    // We have a dot notation, like "console."
                    const objectName = dotMatch[1].toLowerCase();
                    const partialMethod = dotMatch[2];

                    // Find methods for the object
                    const methods = jsMethods[objectName] || [];

                    suggestions = methods.filter(method =>
                        method.toLowerCase().startsWith(partialMethod.toLowerCase())
                    );
                } else {
                    // Regular word, suggest keywords and functions
                    const allOptions = [...jsKeywords, ...jsFunctions];

                    suggestions = allOptions.filter(option =>
                        option.toLowerCase().startsWith(currentWord.toLowerCase())
                    );

                    // Custom variables from the current code
                    const customVars = findCustomVariables(codeEditor.getValue());
                    const matchingCustomVars = customVars.filter(v =>
                        v.toLowerCase().startsWith(currentWord.toLowerCase())
                    );

                    suggestions = [...new Set([...matchingCustomVars, ...suggestions])];
                }

                console.log("Current word:", currentWord, "Suggestions:", suggestions.length);

                if (suggestions.length > 0) {
                    showSuggestions(suggestions, currentWord);
                } else {
                    hideSuggestions();
                }
            }

            // Perbaiki posisi suggestion box - jangan terlalu atas meskipun banyak item

            function showSuggestions(suggestions, currentWord) {
                // Calculate position for suggestions based on cursor position
                const cursor = codeEditor.getCursor();
                const cursorCoords = codeEditor.cursorCoords(true);

                // Get the correct position relative to window coordinates
                const editorRect = editorWrapper.getBoundingClientRect();
                const windowRect = contentElement.closest('.window').getBoundingClientRect();

                // Position relative to the window content
                const relativeTop = cursorCoords.top - windowRect.top;
                const relativeLeft = cursorCoords.left - windowRect.left;

                // Calculate the absolute position within the window
                suggestionsContainer.style.position = 'absolute';
                suggestionsContainer.style.zIndex = '10000';

                // PERUBAHAN: Batasi jumlah maksimum item yang memengaruhi posisi
                // Ini mencegah suggestion box terlalu jauh di atas saat item banyak
                const maxDisplayItems = Math.min(5, suggestions.length); // Maksimal 5 item untuk menghitung posisi
                const itemHeight = 25; // Perkiraan tinggi per item 25px
                const suggestionsHeight = maxDisplayItems * itemHeight;

                // Tambahkan class ke suggestionsContainer untuk membatasi tingginya
                suggestionsContainer.style.maxHeight = '125px'; // 5 item × 25px
                suggestionsContainer.style.overflowY = 'auto'; // Tambahkan scrollbar jika perlu

                // POSISIKAN DI SEKITAR CURSOR: Pilih posisi paling nyaman
                if (relativeTop > suggestionsHeight + 30) {
                    // Cukup ruang di atas: tampilkan di atas kursor dengan jarak sedang
                    suggestionsContainer.style.top = (relativeTop - suggestionsHeight - 5) + 'px';
                } else {
                    // Tidak cukup ruang di atas: tampilkan di bawah kursor
                    suggestionsContainer.style.top = (relativeTop + 15) + 'px';
                }

                suggestionsContainer.style.left = relativeLeft + 'px';

                // Make sure suggestions don't go off-screen on right
                const suggestionsWidth = 200; // Approximate width of suggestion box
                const windowWidth = windowRect.width;

                if (relativeLeft + suggestionsWidth > windowWidth - 20) {
                    // If would go off right edge, align to right side with 10px margin
                    suggestionsContainer.style.left = 'auto';
                    suggestionsContainer.style.right = '10px';
                }

                // Generate the HTML for suggestions
                let suggestionHtml = suggestions.map((suggestion, index) => {
                    return `<div class="suggestion-item" data-index="${index}">${suggestion}</div>`;
                }).join('');

                suggestionsContainer.innerHTML = suggestionHtml;
                suggestionsContainer.style.display = 'block';

                // Add click event to suggestions
                const suggestionItems = suggestionsContainer.querySelectorAll('.suggestion-item');
                suggestionItems.forEach(item => {
                    item.addEventListener('click', () => {
                        const selectedSuggestion = suggestions[parseInt(item.getAttribute('data-index'))];
                        applySuggestionText(selectedSuggestion, currentWord);
                    });
                });

                // Highlight first suggestion
                if (suggestionItems.length > 0) {
                    suggestionItems[0].classList.add('selected');
                }
            }

            // Perbaiki fungsi applySuggestion untuk memastikan bekerja dengan benar
            function applySuggestion() {
                console.log("Applying suggestion");
                const selectedItem = suggestionsContainer.querySelector('.suggestion-item.selected');

                if (!selectedItem) {
                    console.log("No selected suggestion item found");
                    return;
                }

                const selectedSuggestion = selectedItem.textContent;
                console.log("Selected suggestion:", selectedSuggestion);

                const cursor = codeEditor.getCursor();
                const line = codeEditor.getLine(cursor.line);
                const textBeforeCursor = line.substring(0, cursor.ch);

                // Dapatkan kata yang sedang diketik
                const wordMatch = textBeforeCursor.match(/[a-zA-Z0-9_$]+$/);
                if (!wordMatch) {
                    console.log("No current word found before cursor");
                    return;
                }

                const currentWord = wordMatch[0];
                console.log("Current word to replace:", currentWord, "position:", cursor.ch - currentWord.length);

                // Ganti kata saat ini dengan saran
                codeEditor.replaceRange(
                    selectedSuggestion,
                    { line: cursor.line, ch: cursor.ch - currentWord.length },
                    { line: cursor.line, ch: cursor.ch }
                );

                // Fokus kembali ke editor
                codeEditor.focus();

                // Sembunyikan saran
                hideSuggestions();

                console.log("Suggestion applied successfully");

                // Penting: mencegah default behavior
                return true;
            }

            // Perbaiki fungsi navigateSuggestions
            function navigateSuggestions(direction) {
                console.log("Navigating suggestions:", direction);
                const items = suggestionsContainer.querySelectorAll('.suggestion-item');
                if (items.length === 0) return;

                const currentIndex = [...items].findIndex(item => item.classList.contains('selected'));

                let newIndex = currentIndex + direction;
                if (newIndex < 0) newIndex = items.length - 1;
                if (newIndex >= items.length) newIndex = 0;

                // Hapus selection dari semua item
                items.forEach(item => item.classList.remove('selected'));

                // Set selected class pada item yang dipilih
                items[newIndex].classList.add('selected');

                // Scroll ke item yang dipilih jika perlu
                const selectedItem = items[newIndex];
                if (selectedItem) {
                    // Scroll into view jika perlu
                    if (selectedItem.offsetTop < suggestionsContainer.scrollTop) {
                        suggestionsContainer.scrollTop = selectedItem.offsetTop;
                    } else if (selectedItem.offsetTop + selectedItem.offsetHeight >
                        suggestionsContainer.scrollTop + suggestionsContainer.clientHeight) {
                        suggestionsContainer.scrollTop =
                            selectedItem.offsetTop + selectedItem.offsetHeight - suggestionsContainer.clientHeight;
                    }
                }

                console.log("Selected suggestion index:", newIndex);

                // PENTING: Gunakan setTimeout untuk mengembalikan fokus ke editor
                // tanpa memicu default behavior arrow key
                setTimeout(() => {
                    codeEditor.focus();
                    // Tetapkan kursor pada posisi saat ini untuk mencegah pergerakan
                    const cursor = codeEditor.getCursor();
                    codeEditor.setCursor(cursor);
                }, 0);
            }

            function findCustomVariables(code) {
                const variables = new Set();

                // Match variable declarations (var, let, const)
                const varRegex = /\b(?:var|let|const)\s+([a-zA-Z0-9_$]+)\b/g;
                let match;
                while ((match = varRegex.exec(code)) !== null) {
                    variables.add(match[1]);
                }

                // Match function declarations
                const funcRegex = /\bfunction\s+([a-zA-Z0-9_$]+)\b/g;
                while ((match = funcRegex.exec(code)) !== null) {
                    variables.add(match[1]);
                }

                // The rest of your variable detection code remains the same...

                return [...variables]; // Convert Set back to array
            }

            function applySuggestionText(suggestion, currentWord) {
                const cursor = codeEditor.getCursor();
                const line = codeEditor.getLine(cursor.line);
                const wordStartPos = cursor.ch - currentWord.length;

                // Ganti kata saat ini dengan saran
                codeEditor.replaceRange(
                    suggestion,
                    { line: cursor.line, ch: wordStartPos },
                    { line: cursor.line, ch: cursor.ch }
                );

                // Fokus kembali ke editor dan update line numbers
                codeEditor.focus();
                updateLineNumbers();

                // Sembunyikan saran
                hideSuggestions();
            }

            // Perbaiki fungsi hideSuggestions untuk memastikan event tidak propagasi
            function hideSuggestions() {
                console.log("Hiding suggestions");
                suggestionsContainer.style.display = 'none';

                // Fokus kembali ke editor
                codeEditor.focus();
            }

            // Add this function to toggle comments
            function toggleComment() {
                // Get selection
                const start = codeTextarea.selectionStart;
                const end = codeTextarea.selectionEnd;

                // Get the selected text
                const selectedText = codeTextarea.value.substring(start, end);

                // Check if there's a selection
                if (start !== end) {
                    // Multiple lines
                    const lines = selectedText.split('\n');
                    const isAllCommented = lines.every(line => line.trim().startsWith('//'));

                    // Toggle comments based on if all lines are already commented
                    const newLines = lines.map(line => {
                        if (isAllCommented) {
                            // Remove comments
                            return line.replace(/^\s*\/\/\s?/, '');
                        } else {
                            // Add comments
                            return '// ' + line;
                        }
                    });

                    // Replace the selection with the new text
                    codeTextarea.value = codeTextarea.value.substring(0, start) +
                        newLines.join('\n') +
                        codeTextarea.value.substring(end);

                    // Restore selection
                    codeTextarea.selectionStart = start;
                    codeTextarea.selectionEnd = start + newLines.join('\n').length;
                } else {
                    // Single line - get the current line
                    const text = codeTextarea.value;
                    const lines = text.split('\n');
                    let lineIndex = 0;
                    let position = 0;

                    // Find the current line
                    for (let i = 0; i < lines.length; i++) {
                        if (position + lines[i].length >= start) {
                            lineIndex = i;
                            break;
                        }
                        position += lines[i].length + 1; // +1 for the \n character
                    }

                    // Toggle comment on this single line
                    const currentLine = lines[lineIndex];
                    const lineStart = position;
                    const isCommented = currentLine.trimStart().startsWith('//');

                    if (isCommented) {
                        // Remove comment
                        lines[lineIndex] = currentLine.replace(/^\s*\/\/\s?/, '');
                    } else {
                        // Add comment
                        lines[lineIndex] = '// ' + currentLine;
                    }

                    // Update the textarea
                    codeTextarea.value = lines.join('\n');

                    // Place cursor at the same position
                    const cursorOffset = isCommented ?
                        (currentLine.indexOf('//') > -1 ? currentLine.indexOf('//') + (currentLine.charAt(currentLine.indexOf('//') + 2) === ' ' ? 3 : 2) : 0) :
                        3;

                    codeTextarea.selectionStart = codeTextarea.selectionEnd = start + (isCommented ? -cursorOffset : cursorOffset);
                }

                // Update line numbers
                updateLineNumbers();

                // Trigger a change event to ensure autocompletion updates
                codeTextarea.dispatchEvent(new Event('input'));
            }            // Initial update
            updateLineNumbers();

            // Add suggestion styling
            const styleElement = document.createElement('style');
            styleElement.textContent = `
            .suggestions-container {
                position: absolute;
                background-color: white;
                border: 1px solid #ccc;
                border-radius: 3px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                max-height: 200px;
                overflow-y: auto;
                z-index: 100000;
                width: 200px;
                font-size: 14px;
            }

            .suggestion-item {
                padding: 5px 10px;
                cursor: pointer;
                font-family: monospace;
            }

            .suggestion-item:hover, .suggestion-item.selected {
                background-color: #f0f0f0;
            }

            .suggestion-item.selected {
                background-color: #e0e0e0;
            }

            /* Pastikan code editor container memiliki position relative agar absolute positioning bekerja dengan benar */
            .code-editor-container {
                position: relative;
                overflow: hidden;
            }

            /* Pastikan suggestions container tetap di dalam window-content */
            .window-content {
                overflow: visible !important;
            }
            `;
            document.head.appendChild(styleElement);

            // Perbaikan tambahan untuk memastikan posisi suggestion container tetap up-to-date
            codeEditor.on('cursorActivity', function () {
                // Jika suggestion container sedang ditampilkan, perbarui posisinya
                if (suggestionsContainer.style.display !== 'none') {
                    // Dapatkan kata yang sedang diketik
                    const cursor = codeEditor.getCursor();
                    const line = codeEditor.getLine(cursor.line);
                    const textBeforeCursor = line.substring(0, cursor.ch);

                    const match = textBeforeCursor.match(/[a-zA-Z0-9_$]+$/);
                    if (match) {
                        const currentWord = match[0];
                        const dotMatch = textBeforeCursor.match(/([a-zA-Z0-9_$]+)\.([a-zA-Z0-9_$]*)$/);

                        // Dapatkan saran yang sedang ditampilkan
                        const suggestionItems = suggestionsContainer.querySelectorAll('.suggestion-item');
                        const suggestions = Array.from(suggestionItems).map(item => item.textContent);

                        // Perbarui posisi tanpa mengubah konten
                        const currentIndex = [...suggestionItems].findIndex(item => item.classList.contains('selected'));
                        showSuggestions(suggestions, currentWord, dotMatch);

                        // Kembalikan selection state jika ada
                        if (currentIndex >= 0) {
                            const newItems = suggestionsContainer.querySelectorAll('.suggestion-item');
                            if (newItems[currentIndex]) {
                                newItems.forEach(item => item.classList.remove('selected'));
                                newItems[currentIndex].classList.add('selected');
                            }
                        }
                    }
                }
            });

            // Register key event handlers for CodeMirror
            codeEditor.on("keyup", function (cm, event) {
                // Only trigger autocompletion for letters, numbers, dots, or delete/backspace
                if (
                    (event.keyCode >= 65 && event.keyCode <= 90) || // A-Z
                    (event.keyCode >= 48 && event.keyCode <= 57) || // 0-9
                    event.keyCode === 190 || // .
                    event.keyCode === 8 || // backspace
                    event.keyCode === 46 // delete
                ) {
                    handleAutoCompletion();
                }
            });

            // Perbaiki event handler untuk Enter di extraKeys CodeMirror
            const updatedExtraKeys = {
                "Ctrl-S": function (cm) {
                    if (options.filePath) {
                        saveFile(options.filePath, cm.getValue());
                    } else {
                        showSaveDialog(cm.getValue());
                    }
                    return true; // Mencegah default behavior
                },
                "Ctrl-/": function (cm) {
                    cm.toggleComment({ lineComment: "//" });
                    return true; // Mencegah default behavior
                },
                "Enter": function (cm, event) {
                    console.log("Enter handler in extraKeys, suggestions visible:",
                        suggestionsContainer.style.display !== 'none');

                    if (suggestionsContainer.style.display !== 'none') {
                        // Beri penanda bahwa event ini sudah ditangani
                        event.codemirrorIgnore = true;
                        applySuggestion();
                        // Kembalikan false agar CodeMirror tidak memproses Enter lebih lanjut
                        return false;
                    }
                    // Kembalikan undefined agar default behavior tetap berjalan
                    return undefined;
                },
                // Tambahkan handler untuk ESC key
                "Esc": function (cm, event) {
                    console.log("Escape handler in extraKeys, suggestions visible:",
                        suggestionsContainer.style.display !== 'none');

                    if (suggestionsContainer.style.display !== 'none') {
                        // Hanya sembunyikan suggestion box dan cegah event propagasi
                        hideSuggestions();
                        event.preventDefault();
                        event.stopPropagation();
                        // Penting: return false untuk mencegah ESC ditangkap oleh window manager
                        return false;
                    }
                    // Biarkan ESC normal jika tidak ada suggestion
                    return CodeMirror.Pass;
                },
                // Tambahkan handler untuk arrow keys
                "Up": function (cm, event) {
                    if (suggestionsContainer.style.display !== 'none') {
                        console.log("Arrow Up intercepted for suggestions");
                        event.preventDefault();
                        navigateSuggestions(-1); // Navigasi ke atas
                        return false; // Penting: mencegah default behavior
                    }
                    return CodeMirror.Pass; // Biarkan default jika tidak ada suggestion
                },
                "Down": function (cm, event) {
                    if (suggestionsContainer.style.display !== 'none') {
                        console.log("Arrow Down intercepted for suggestions");
                        event.preventDefault();
                        navigateSuggestions(1); // Navigasi ke bawah
                        return false; // Penting: mencegah default behavior
                    }
                    return CodeMirror.Pass; // Biarkan default jika tidak ada suggestion
                }
            };

            // Terapkan extraKeys baru
            codeEditor.setOption("extraKeys", updatedExtraKeys);

            // Tambahkan event listener tambahan untuk memastikan applySuggestion terpanggil
            suggestionsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('suggestion-item')) {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    const suggestionItems = suggestionsContainer.querySelectorAll('.suggestion-item');

                    // Pilih item yang diklik
                    suggestionItems.forEach(item => item.classList.remove('selected'));
                    e.target.classList.add('selected');

                    // Terapkan suggestion
                    applySuggestion();
                }
            });

            // Tambahkan event listener alternatif untuk Enter jika extraKeys tidak cukup
            codeEditor.getWrapperElement().addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && suggestionsContainer.style.display !== 'none') {
                    console.log("Enter caught by direct event listener");
                    e.preventDefault();
                    e.stopPropagation();
                    applySuggestion();
                    return false;
                }
            }, true); // true untuk fase capturing, menangkap event sebelum sampai ke CodeMirror

            // 2. Tambahkan juga event listener khusus dengan prioritas tinggi untuk ESC
            codeEditor.getInputField().addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && suggestionsContainer.style.display !== 'none') {
                    console.log("ESC intercepted at input field level!");
                    event.preventDefault();
                    event.stopPropagation();
                    hideSuggestions();
                    return false;
                }
            }, true); // true untuk fase capturing

            // 2. Tambahkan juga event listener khusus untuk arrow keys dengan prioritas tinggi
            codeEditor.getInputField().addEventListener('keydown', function (event) {
                if (suggestionsContainer.style.display !== 'none') {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        console.log("Arrow key intercepted at input field level:", event.key);
                        event.preventDefault();
                        event.stopImmediatePropagation(); // Ini lebih kuat daripada stopPropagation
                        navigateSuggestions(event.key === 'ArrowDown' ? 1 : -1);
                        return false;
                    }
                }
            }, true); // true untuk fase capturing

            // Tambahkan handler dengan prioritas lebih tinggi pada wrapper element
            codeEditor.getWrapperElement().addEventListener('keydown', function (event) {
                if (suggestionsContainer.style.display !== 'none') {
                    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                        console.log("Arrow key intercepted at wrapper level:", event.key);
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        navigateSuggestions(event.key === 'ArrowDown' ? 1 : -1);
                        return false;
                    }
                }
            }, true);

            // Tambahkan override global untuk arrow keys sebagai jaring pengaman terakhir
            document.addEventListener('keydown', function (event) {
                // Cek apakah ada suggestion box yang ditampilkan
                const visibleSuggestionBox = document.querySelector('.suggestions-container[style*="display: block"]');

                if (visibleSuggestionBox && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                    // Cek apakah target dalam CodeMirror
                    if (event.target.closest('.CodeMirror')) {
                        console.log("Arrow key captured at document level:", event.key);
                        event.preventDefault();
                        event.stopPropagation();

                        // Temukan editor yang sedang aktif
                        const activeEditor = document.querySelector('.CodeMirror-focused').CodeMirror;
                        if (activeEditor) {
                            navigateSuggestions(event.key === 'ArrowDown' ? 1 : -1);
                        }

                        return false;
                    }
                }
            }, true);
        },

        // Method to get the current code from this editor
        getCode: function (windowElement) {
            const textarea = windowElement.querySelector('.code-textarea');
            return textarea ? textarea.value : '';
        }
    });

    // Tambahkan event listener pada window untuk menangkap ESC sebelum window manager
    document.addEventListener('keydown', function (event) {
        // Cek jika ESC ditekan dan suggestion box muncul
        if (event.key === 'Escape' &&
            document.querySelector('.suggestions-container') &&
            document.querySelector('.suggestions-container').style.display !== 'none') {

            console.log("ESC captured at document level to prevent window close");
            event.stopPropagation();

            // Tangani suggestion hide di level terendah
            const suggestionsContainer = document.querySelector('.suggestions-container');
            suggestionsContainer.style.display = 'none';

            event.preventDefault();
            return false;
        }
    }, true); // true untuk fase capturing
})();