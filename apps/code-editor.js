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
                    <div class="editor-controls">
                        <div class="save-status"></div>
                    </div>
                </div>
            `;

            // Get references to UI elements
            const codeTextarea = innerContent.querySelector('.code-textarea');
            const lineNumbers = innerContent.querySelector('.line-numbers');
            const suggestionsContainer = innerContent.querySelector('.suggestions-container');
            const saveStatus = innerContent.querySelector('.save-status');

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

            // Function to save file
            function saveFile(path, content, isAutoSave = false) {
                console.log(`${isAutoSave ? 'Auto-saving' : 'Saving'} to:`, path);

                try {
                    // Use the FileSystem to save the file
                    if (window.FileSystem) {
                        // Check if this is an existing file that we're updating (our own file)
                        const isSameFile = path === options.filePath;

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

            // Function to update line numbers
            function updateLineNumbers() {
                const lines = codeTextarea.value.split('\n');
                const count = lines.length;

                let lineNumbersHtml = '';
                for (let i = 0; i < count; i++) {
                    lineNumbersHtml += `<div>${i + 1}</div>`;
                }

                lineNumbers.innerHTML = lineNumbersHtml;

                // Make sure line numbers container is properly positioned
                lineNumbers.style.top = '0';  // Reset top position
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

                // Match function parameters
                const paramRegex = /\bfunction\s*(?:[a-zA-Z0-9_$]+)?\s*\(([^)]*)\)/g;
                while ((match = paramRegex.exec(code)) !== null) {
                    const params = match[1].split(',').map(p => p.trim());
                    params.forEach(param => {
                        // Handle destructuring and default values by taking just the parameter name
                        const paramName = param.split('=')[0].trim().match(/^[a-zA-Z0-9_$]+/);
                        if (paramName) {
                            variables.add(paramName[0]);
                        }
                    });
                }

                // Match class names
                const classRegex = /\bclass\s+([a-zA-Z0-9_$]+)\b/g;
                while ((match = classRegex.exec(code)) !== null) {
                    variables.add(match[1]);
                }

                // Match for...of and for...in variable declarations
                const forLoopRegex = /\bfor\s*\(\s*(const|let|var)?\s*([a-zA-Z0-9_$]+)\s*(of|in)\s*/g;
                while ((match = forLoopRegex.exec(code)) !== null) {
                    variables.add(match[2]);
                }

                // Match object property assignments that create variables
                const objectPropRegex = /\b([a-zA-Z0-9_$]+)\s*:\s*function\b/g;
                while ((match = objectPropRegex.exec(code)) !== null) {
                    variables.add(match[1]);
                }

                // Match arrow function parameters
                const arrowFuncRegex = /\(([^)]*)\)\s*=>/g;
                while ((match = arrowFuncRegex.exec(code)) !== null) {
                    const params = match[1].split(',').map(p => p.trim());
                    params.forEach(param => {
                        // Handle destructuring and default values
                        const paramName = param.split('=')[0].trim().match(/^[a-zA-Z0-9_$]+/);
                        if (paramName) {
                            variables.add(paramName[0]);
                        }
                    });
                }

                // Match single-parameter arrow functions without parentheses
                const singleParamArrowRegex = /\b([a-zA-Z0-9_$]+)\s*=>/g;
                while ((match = singleParamArrowRegex.exec(code)) !== null) {
                    variables.add(match[1]);
                }

                // Match imported variables
                const importRegex = /\bimport\s*{([^}]*)}\s*from/g;
                while ((match = importRegex.exec(code)) !== null) {
                    const imports = match[1].split(',').map(i => i.trim());
                    imports.forEach(imp => {
                        // Handle 'as' alias
                        const importName = imp.split(' as ')[0].trim();
                        if (importName) {
                            variables.add(importName);
                        }
                    });
                }

                return [...variables]; // Convert Set back to array
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
            }

            // Initial update
            updateLineNumbers();

            // Add auto-save functionality to code-editor.js

            // First, add a variable to track if auto-save is enabled and the last save time
            let saveTimeout = null;
            const AUTO_SAVE_DELAY = 1000; // Auto-save delay in milliseconds (1 second)

            // Function to handle auto-save with debounce
            function triggerAutoSave() {
                // Clear any pending save timeout
                if (saveTimeout) {
                    clearTimeout(saveTimeout);
                }

                // Set a new timeout - but don't show any status messages
                saveTimeout = setTimeout(() => {
                    if (options.filePath) {
                        console.log("Auto-saving to:", options.filePath);
                        saveFile(options.filePath, codeTextarea.value, true); // true indicates auto-save
                    }
                }, AUTO_SAVE_DELAY);
            }
        },

        // Method to get the current code from this editor
        getCode: function (windowElement) {
            const textarea = windowElement.querySelector('.code-textarea');
            return textarea ? textarea.value : '';
        }
    });
})();