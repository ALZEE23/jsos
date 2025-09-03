/**
 * Image Viewer App
 */

(function () {
    // Register the image viewer window type
    WindowManager.registerWindowType('imageviewer', {
        title: 'Image Viewer',
        defaultWidth: 400,
        defaultHeight: 300,

        // Initialize the content
        initContent: function (contentElement, options) {
            // Find the inner content area
            const innerContent = contentElement.querySelector('[id^="inner-content"]');
            if (!innerContent) {
                console.error('Inner content element not found');
                return;
            }

            // Create image viewer UI
            innerContent.innerHTML = `
                <div class="image-viewer" style="height: 100%;">
                    <div class="image-container" style="height: 100%; display: flex; justify-content: center; align-items: center;">
                        <img class="viewer-image" src="${options.imageSrc || 'https://via.placeholder.com/400x300'}" alt="Image" style="max-width: 100%; max-height: 100%;">
                    </div>
                    <div class="image-controls">
                        <button class="img-btn zoom-in">+</button>
                        <button class="img-btn zoom-reset">1:1</button>
                        <button class="img-btn zoom-out">-</button>
                    </div>
                </div>
            `;

            // Set up image viewer functionality
            let scale = 1;
            const image = innerContent.querySelector('.viewer-image');

            // Add event listeners
            innerContent.querySelector('.zoom-in').addEventListener('click', (e) => {
                e.stopPropagation();
                scale *= 1.2;
                image.style.transform = `scale(${scale})`;
            });

            innerContent.querySelector('.zoom-reset').addEventListener('click', (e) => {
                e.stopPropagation();
                scale = 1;
                image.style.transform = 'scale(1)';
            });

            innerContent.querySelector('.zoom-out').addEventListener('click', (e) => {
                e.stopPropagation();
                scale /= 1.2;
                image.style.transform = `scale(${scale})`;
            });

            // Prevent window drag when interacting with controls
            innerContent.querySelectorAll('.img-btn').forEach(btn => {
                btn.addEventListener('mousedown', e => e.stopPropagation());
            });
        }
    });
})();