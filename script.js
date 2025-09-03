// Set a starting z-index value
let currentMaxZIndex = 100;

// Function to bring a note to the front
function bringToFront(note) {
    // Increment the maximum z-index counter
    currentMaxZIndex += 1;
    // Set the note's z-index to the new maximum
    note.style.zIndex = currentMaxZIndex;
}

// Add maximize/restore functionality when double-clicking the title bar

// Store original dimensions when maximizing
const originalDimensions = new Map();

// Function to toggle maximize/restore with smooth animation
function toggleMaximize(note) {
    const noteId = note.id;

    // Bring to front when maximizing/restoring
    bringToFront(note);

    // Add transition class before making changes
    note.classList.add("transitioning");

    if (originalDimensions.has(noteId)) {
        // Restore to original size with animation
        const { width, height, top, left } = originalDimensions.get(noteId);

        // Apply the transition
        note.style.width = width;
        note.style.height = height;
        note.style.top = top;
        note.style.left = left;

        // Remove from storage
        originalDimensions.delete(noteId);

        // Find and update title if needed
        const titleBar = note.querySelector('[id^="drag-handle"]');
        if (titleBar) {
            titleBar.innerHTML = `<span class="title-text"></span>`;
        }
    } else {
        // Save current dimensions
        originalDimensions.set(noteId, {
            width: note.style.width || `${note.offsetWidth}px`,
            height: note.style.height || `${note.offsetHeight}px`,
            top: note.style.top,
            left: note.style.left,
        });

        // Set to maximized size with margins
        const margin = 40; // Keep a small margin from the window edge

        // Apply the transition
        note.style.width = `${window.innerWidth - margin * 2}px`;
        note.style.height = `${window.innerHeight - margin * 2}px`;
        note.style.top = `${margin}px`;
        note.style.left = `${margin}px`;

        // Find and update title if needed
        const titleBar = note.querySelector('[id^="drag-handle"]');
        if (titleBar) {
            titleBar.innerHTML = `<span class="title-text"></span>`;
        }
    }

    // Add a visual feedback animation
    note.classList.add("maximizing");

    // Remove transition and effect classes after animation completes
    setTimeout(() => {
        note.classList.remove("maximizing");
        note.classList.remove("transitioning");
    }, 300); // Match with transition duration
}

function initNoteEventListeners(note) {
    const createBtn = note.querySelector('[id^="create-note"]');
    const deleteBtn = note.querySelector('[id^="delete-note"]');

    // Generate a unique identifier suffix
    const noteId = note.id;

    // Update IDs to be unique
    createBtn.id = "create-note-" + noteId;
    deleteBtn.id = "delete-note-" + noteId;

    // Remove any existing listeners to prevent duplicates
    const newCreateBtn = createBtn.cloneNode(true);
    const newDeleteBtn = deleteBtn.cloneNode(true);
    createBtn.parentNode.replaceChild(newCreateBtn, createBtn);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

    // Set up click handlers
    newCreateBtn.addEventListener("click", createNewNote);
    newDeleteBtn.addEventListener("click", () => deleteNote(note));

    // Update drag handle reference
    const dragHandle = note.querySelector('[id^="drag-handle"]');
    if (dragHandle) {
        dragHandle.id = "drag-handle-" + noteId;

        // Add double-click handler to the title bar
        dragHandle.addEventListener("dblclick", () => toggleMaximize(note));
    }

    // Fix the resize handles by using attribute selectors instead of getElementById
    const directions = ["n", "e", "s", "w", "ne", "se", "sw", "nw"];
    directions.forEach((dir) => {
        const handle = note.querySelector('[id^="resize-' + dir + '"]');
        if (handle) {
            handle.id = "resize-" + dir + "-" + noteId;
        }
    });

    // Add visual indication that the title bar can be double-clicked
    if (dragHandle) {
        dragHandle.title = "Double-click to maximize/restore";
        dragHandle.style.cursor = "move";
    }

    // Make the new note draggable with its unique drag handle
    setupDrag(note);
    setupResize(note);
}

// Modify the setupDrag function to disable transitions during dragging
function setupDrag(element) {
    let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
    const dragHandle = element.querySelector('[id^="drag-handle"]');

    // Add click handler to bring note to front when clicked anywhere on it
    element.addEventListener("mousedown", function (e) {
        if (
            !e.target.closest(".sticky-textarea") &&
            !e.target.closest(".control-button")
        ) {
            bringToFront(element);
        }
    });

    if (dragHandle) {
        dragHandle.onmousedown = dragMouseDown;
    } else {
        element.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        if (
            e.target.closest(".sticky-textarea") ||
            e.target.closest(".control-button")
        ) {
            // Don't start drag on textarea or buttons
            return;
        }

        e = e || window.event;
        e.preventDefault();

        // Bring note to front when starting to drag
        bringToFront(element);

        // Temporarily disable all transitions during drag
        element.classList.remove("transitioning");

        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const elementWidth = element.offsetWidth;
        const elementHeight = element.offsetHeight;

        if (newLeft < 0) newLeft = 0;
        if (newTop < 0) newTop = 0;

        const visibleWidth = Math.min(100, elementWidth / 2);
        if (newLeft > windowWidth - visibleWidth) {
            newLeft = windowWidth - visibleWidth;
        }

        const visibleHeight = Math.min(100, elementHeight / 2);
        if (newTop > windowHeight - visibleHeight) {
            newTop = windowHeight - visibleHeight;
        }

        element.style.top = Math.round(newTop) + "px";
        element.style.left = Math.round(newLeft) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Modify setupResize to disable transitions during resizing
function setupResize(element) {
    // Set up resize handlers for each direction
    const directions = ["n", "e", "s", "w", "ne", "se", "sw", "nw"];

    directions.forEach((dir) => {
        const handle = element.querySelector('[id^="resize-' + dir + '"]');
        if (handle) {
            handle.onmousedown = (e) => resizeStart(e, dir);
        }
    });

    let startX, startY, startWidth, startHeight, startLeft, startTop;

    function resizeStart(e, direction) {
        e.preventDefault();

        // Disable transitions during resize
        element.classList.remove("transitioning");

        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;
        startLeft = element.offsetLeft;
        startTop = element.offsetTop;

        document.onmousemove = (e) => resizeMove(e, direction);
        document.onmouseup = resizeEnd;
    }

    function resizeMove(e, direction) {
        e.preventDefault();

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        if (direction.includes("e")) {
            newWidth = Math.round(startWidth + dx);
            if (newLeft + newWidth > windowWidth) {
                newWidth = windowWidth - newLeft;
            }
        }

        if (direction.includes("s")) {
            newHeight = Math.round(startHeight + dy);
            if (newTop + newHeight > windowHeight) {
                newHeight = windowHeight - newTop;
            }
        }

        if (direction.includes("w")) {
            const proposedWidth = Math.round(startWidth - dx);
            const proposedLeft = Math.round(startLeft + dx);

            if (proposedLeft < 0) {
                newLeft = 0;
                newWidth = startWidth + startLeft;
            } else {
                newWidth = proposedWidth;
                newLeft = proposedLeft;
            }
        }

        if (direction.includes("n")) {
            const proposedHeight = Math.round(startHeight - dy);
            const proposedTop = Math.round(startTop + dy);

            if (proposedTop < 0) {
                newTop = 0;
                newHeight = startHeight + startTop;
            } else {
                newHeight = proposedHeight;
                newTop = proposedTop;
            }
        }

        const minWidth = 150;
        const minHeight = 100;

        if (newWidth >= minWidth) {
            element.style.width = newWidth + "px";
            if (direction.includes("w")) {
                element.style.left = newLeft + "px";
            }
        }

        if (newHeight >= minHeight) {
            element.style.height = newHeight + "px";
            if (direction.includes("n")) {
                element.style.top = newTop + "px";
            }
        }
    }

    function resizeEnd() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Store a copy of the template when the page loads
let noteTemplate;

document.addEventListener("DOMContentLoaded", function () {
    // Store a deep clone of the original note template for future use
    noteTemplate = document.getElementById("draggable-box").cloneNode(true);
});

// Fix the createNewNote function to use the stored template
function createNewNote() {
    // If the original template was deleted, use our stored copy
    const templateToUse = document.getElementById("draggable-box") || noteTemplate;
    const newNote = templateToUse.cloneNode(true);

    // Generate a unique ID for the new note
    const noteId = "note-" + Date.now();
    newNote.id = noteId;

    // Set random position for the new note
    // Get current position or use default
    const baseTop = templateToUse.offsetTop || 100;
    const baseLeft = templateToUse.offsetLeft || 100;
    const offsetX = Math.floor(Math.random() * 100) + 50;
    const offsetY = Math.floor(Math.random() * 100) + 50;
    newNote.style.top = baseTop + offsetY + "px";
    newNote.style.left = baseLeft + offsetX + "px";

    // Initially set opacity to 0 to avoid flash before animation starts
    newNote.style.opacity = "0";

    // Set a higher z-index for the new note
    bringToFront(newNote);

    // Clear any text
    const textarea = newNote.querySelector(".sticky-textarea");
    if (textarea) {
        textarea.value = "";

        // Apply font directly to the element - make sure it overrides any other styles
        textarea.style.fontFamily = '"Pixelify Sans", "Comic Sans MS", cursive, sans-serif';
        textarea.style.fontSize = "14px";

        // Also focus the textarea when clicking on it (for better usability)
        textarea.addEventListener("mousedown", function (e) {
            // Prevent event from bubbling to avoid drag start
            e.stopPropagation();
        });
    }

    // Add to document
    document.body.appendChild(newNote);

    // Initialize event listeners
    initNoteEventListeners(newNote);

    // Start animation after a brief delay (to ensure DOM is updated)
    setTimeout(() => {
        newNote.style.opacity = ""; // Reset opacity to let CSS take over
        newNote.classList.add("note-appear");
    }, 10);

    // Focus the new textarea
    if (textarea) {
        textarea.focus();
    }
}

// Also fix the deleteNote function to avoid deleting the template
function deleteNote(note) {
    // Add the closing animation class
    note.classList.add("note-close");

    // Wait for the animation to finish before removing the element
    setTimeout(() => {
        note.remove();
    }, 200); // Match this with the animation duration
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
    // Apply animation to the first note
    const initialNote = document.getElementById("draggable-box");
    if (initialNote) {
        initialNote.classList.add("note-appear");
    }

    // Apply the font to the initial note's textarea
    const initialTextarea = document.querySelector(".sticky-textarea");
    if (initialTextarea) {
        initialTextarea.style.fontFamily = '"Pixelify Sans", "Comic Sans MS", cursive, sans-serif';
        initialTextarea.style.fontSize = "14px";
    }

    // Initialize the first note with a base z-index
    if (initialNote) {
        initialNote.style.zIndex = currentMaxZIndex;
    }

    // Initialize the first note
    const box = document.getElementById("draggable-box");
    initNoteEventListeners(box);
});

// Add keyboard shortcuts
document.addEventListener("keydown", function (e) {
    // Ctrl+N or Cmd+N to create new note
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        createNewNote();
    }
});