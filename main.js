/**
 * Main initialization script
 */

console.log('Main script loading...');

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded');

    // Initialize the window manager
    WindowManager.init();

    // Optionally create a default window for testing
    // WindowManager.createWindow('notepad', { content: 'Hello, world!' });

    console.log('Initialization complete');
});