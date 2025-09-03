/**
 * Notepad App
 */

// Example of a simple notepad app
(function () {
    console.log('Registering notepad app...');

    // Register the notepad window type
    WindowManager.registerWindowType('notepad', {
        title: 'Notepad',
        defaultWidth: 300,
        defaultHeight: 250,

        // Initialize the content
        initContent: function (contentElement, options) {
            console.log('Initializing notepad content...');

            // Find the inner content area
            const innerContent = contentElement.querySelector('[id^="inner-content"]');
            if (!innerContent) {
                console.error('Inner content element not found');
                return;
            }

            // Make inner content scrollable but hide scrollbars
            innerContent.classList.add('scrollable');

            // Create textarea with hidden scrollbars
            const textarea = document.createElement('textarea');
            textarea.className = 'notepad-textarea';
            textarea.placeholder = 'Write your note here...';
            textarea.style.width = '100%';
            textarea.style.height = '100%';
            textarea.style.border = 'none';
            textarea.style.outline = 'none';
            textarea.style.resize = 'none';
            textarea.style.backgroundColor = 'inherit';
            textarea.style.fontFamily = '"Pixelify Sans", "Comic Sans MS", cursive, sans-serif';
            textarea.style.fontSize = '14px';

            // Explicitly hide scrollbars with inline styles too (belt and suspenders approach)
            textarea.style.overflow = 'auto';
            textarea.style.scrollbarWidth = 'none'; // Firefox
            textarea.style.msOverflowStyle = 'none'; // IE and Edge

            // Set initial content if provided
            if (options.content) {
                textarea.value = options.content;
            }

            // Add to window
            innerContent.appendChild(textarea);

            // Add this line to ensure Chrome/Safari/Opera scrollbars are hidden
            const styleElement = document.createElement('style');
            styleElement.textContent = `
                #${innerContent.id} textarea::-webkit-scrollbar {
                    display: none;
                }
            `;
            document.head.appendChild(styleElement);

            // Focus the textarea
            setTimeout(() => textarea.focus(), 100);

            // Add specific event handlers
            textarea.addEventListener('mousedown', e => {
                e.stopPropagation(); // Prevent drag when clicking in textarea
            });
        }
    });
})();