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

            // Create a simpler code editor layout without the save button and title bar
            innerContent.innerHTML = `
                <div class="code-editor-container">
                    <div class="line-numbers"></div>
                    <textarea class="code-textarea" spellcheck="false" placeholder="Write your code here..."></textarea>
                    <div class="suggestions-container" style="display: none;"></div>
                </div>
            `;

            // Get references to UI elements
            const codeTextarea = innerContent.querySelector('.code-textarea');
            const lineNumbers = innerContent.querySelector('.line-numbers');
            const suggestionsContainer = innerContent.querySelector('.suggestions-container');

            // Store the file path for saving
            const filePath = options.filePath;

            // Set initial content if provided
            if (options.code) {
                codeTextarea.value = options.code;
            } else {
                // Default sample code
                codeTextarea.value = '// JavaScript code example\nconsole.log("Hello, world!");\n\n// Define a function\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n\ngreet("User");';
            }

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

                    if (filePath) {
                        // If we already have a file path, save directly
                        saveFile(filePath, codeTextarea.value);
                    } else {
                        // Ask for a file name and path
                        showSaveDialog(codeTextarea.value);
                    }

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
                // Create a simple save dialog
                const saveDialog = document.createElement('div');
                saveDialog.className = 'save-dialog';
                saveDialog.innerHTML = `
                    <div class="save-dialog-content">
                        <h2>Save File</h2>
                        <div class="input-group">
                            <label for="save-path">File path:</label>
                            <input type="text" id="save-path" value="/home/user/Documents/untitled.js">
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

                // Handle buttons
                saveDialog.querySelector('.save-confirm').addEventListener('click', () => {
                    const path = pathInput.value;
                    saveFile(path, content);
                    saveDialog.remove();
                });

                saveDialog.querySelector('.save-cancel').addEventListener('click', () => {
                    saveDialog.remove();
                });
            }

            // Function to save file
            function saveFile(path, content) {
                try {
                    // Use the FileSystem to save the file
                    if (window.FileSystem) {
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

                        // Update the stored file path
                        options.filePath = path;

                        // Show a success message
                        showNotification(`File saved: ${path}`);
                    } else {
                        showNotification('FileSystem not available', 'error');
                    }
                } catch (error) {
                    showNotification(`Error saving file: ${error.message}`, 'error');
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

            // Function to update line numbers
            function updateLineNumbers() {
                const lines = codeTextarea.value.split('\n');
                const count = lines.length;

                let lineNumbersHtml = '';
                for (let i = 0; i < count; i++) {
                    lineNumbersHtml += `<div>${i + 1}</div>`;
                }

                lineNumbers.innerHTML = lineNumbersHtml;
            }

            // Auto-completion handling
            function handleAutoCompletion() {
                const cursorPos = codeTextarea.selectionStart;
                const text = codeTextarea.value.substring(0, cursorPos);

                // Get the current word being typed
                const match = text.match(/[a-zA-Z0-9_$]+$/);
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
                const dotMatch = text.match(/([a-zA-Z0-9_$]+)\.([a-zA-Z0-9_$]*)$/);

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
                    const customVars = findCustomVariables(codeTextarea.value);
                    const matchingCustomVars = customVars.filter(v =>
                        v.toLowerCase().startsWith(currentWord.toLowerCase())
                    );

                    suggestions = [...new Set([...matchingCustomVars, ...suggestions])];
                }

                if (suggestions.length > 0) {
                    showSuggestions(suggestions, currentWord, dotMatch);
                } else {
                    hideSuggestions();
                }
            }

            // Function to find custom variables and functions in the code
            function findCustomVariables(code) {
                const variables = [];

                // Match variable declarations (var, let, const)
                const varRegex = /\b(?:var|let|const)\s+([a-zA-Z0-9_$]+)\b/g;
                let match;

                while ((match = varRegex.exec(code)) !== null) {
                    variables.push(match[1]);
                }

                // Match function declarations
                const funcRegex = /\bfunction\s+([a-zA-Z0-9_$]+)\b/g;
                while ((match = funcRegex.exec(code)) !== null) {
                    variables.push(match[1]);
                }

                return [...new Set(variables)]; // Remove duplicates
            }

            // Function to show suggestions
            function showSuggestions(suggestions, currentWord) {
                // Calculate position for suggestions
                const cursorPos = codeTextarea.selectionStart;
                const textBeforeCursor = codeTextarea.value.substring(0, cursorPos);
                const lines = textBeforeCursor.split('\n');
                const currentLineIndex = lines.length - 1;
                const currentLineText = lines[currentLineIndex];
                const lineHeight = parseInt(getComputedStyle(codeTextarea).lineHeight) || 18;

                // Position the suggestions relative to cursor
                const topOffset = (currentLineIndex * lineHeight) - codeTextarea.scrollTop + 25;
                const leftOffset = 50 + Math.min(currentLineText.length * 8, 200); // Simple estimate

                suggestionsContainer.style.top = topOffset + 'px';
                suggestionsContainer.style.left = leftOffset + 'px';

                // Build the suggestion HTML
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

                // Highlight the first suggestion
                if (suggestionItems.length > 0) {
                    suggestionItems[0].classList.add('selected');
                }
            }

            // Function to navigate through suggestions
            function navigateSuggestions(direction) {
                const items = suggestionsContainer.querySelectorAll('.suggestion-item');
                const currentIndex = [...items].findIndex(item => item.classList.contains('selected'));

                let newIndex = currentIndex + direction;
                if (newIndex < 0) newIndex = items.length - 1;
                if (newIndex >= items.length) newIndex = 0;

                items.forEach(item => item.classList.remove('selected'));
                items[newIndex].classList.add('selected');
            }

            // Function to apply the selected suggestion
            function applySuggestion() {
                const selectedItem = suggestionsContainer.querySelector('.suggestion-item.selected');
                if (!selectedItem) return;

                const cursorPos = codeTextarea.selectionStart;
                const text = codeTextarea.value.substring(0, cursorPos);

                // Handle dot notation vs regular completion
                const dotMatch = text.match(/([a-zA-Z0-9_$]+)\.([a-zA-Z0-9_$]*)$/);
                const wordMatch = text.match(/[a-zA-Z0-9_$]+$/);

                if (!wordMatch) return;

                const currentWord = wordMatch[0];
                const selectedSuggestion = selectedItem.textContent;

                applySuggestionText(selectedSuggestion, currentWord);
            }

            // Apply the suggestion text to the editor
            function applySuggestionText(suggestion, currentWord) {
                const cursorPos = codeTextarea.selectionStart;
                const startPos = cursorPos - currentWord.length;

                // Replace the current word with the suggestion
                codeTextarea.value =
                    codeTextarea.value.substring(0, startPos) +
                    suggestion +
                    codeTextarea.value.substring(cursorPos);

                // Move cursor to the end of the inserted suggestion
                codeTextarea.selectionStart = codeTextarea.selectionEnd = startPos + suggestion.length;

                // Hide suggestions
                hideSuggestions();

                // Focus back on the textarea and update line numbers
                codeTextarea.focus();
                updateLineNumbers();
            }

            // Function to hide suggestions
            function hideSuggestions() {
                suggestionsContainer.style.display = 'none';
            }

            // Initial update
            updateLineNumbers();
        },

        // Method to get the current code from this editor
        getCode: function (windowElement) {
            const textarea = windowElement.querySelector('.code-textarea');
            return textarea ? textarea.value : '';
        }
    });
})();