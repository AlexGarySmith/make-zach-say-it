const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
let baseImage = new Image();
let canvasAspectRatio = 4 / 3;

// Text position state as ratios so positions scale with the canvas.
let topTextPosition = { x: 0.5, y: 0.12 };
let bottomTextPosition = { x: 0.5, y: 0.88 };
let isDragging = false;
let dragTarget = null;
const canvasContainer = document.querySelector('.canvas-container');

function updateCanvasSize() {
    if (!canvasContainer) return;
    const width = Math.max(260, Math.min(canvasContainer.clientWidth, window.innerWidth - 32));
    const height = Math.round(width * canvasAspectRatio);
    const resized = canvas.width !== width || canvas.height !== height;

    canvas.width = width;
    canvas.height = height;

    if (resized) {
        drawImage(true);
        updatePreview(true);
    }
}

// Helper to load an image from a src. If `external` is true, we set crossOrigin to 'anonymous' before
// assigning the src so the host must serve the image with appropriate CORS headers for toDataURL to work.
function setBaseImageFromSrc(src, external = false) {
    const img = new Image();
    if (external) img.crossOrigin = 'anonymous';
    img.onload = function() {
        baseImage = img;
        canvasAspectRatio = img.height / img.width || canvasAspectRatio;
        updateCanvasSize();
        drawImage(false);  // Don't add text when just loading image
        updatePreview(false);  // Show preview without text
    };
    img.onerror = function(e) {
        console.warn('Failed to load image:', e);
        alert('Failed to load image. Check the image URL or file and try again.');
    };
    img.src = src;
}

// Initialize base image (default). Use raw.githubusercontent URL or any host that sets CORS headers
// so preview/download works. If you plan to let users upload their own images, uploaded images
// will be Data URLs and won't require CORS.
setBaseImageFromSrc('https://raw.githubusercontent.com/AlexGarySmith/make-zach-say-it/79c3ba8a6e1b811ebb7b1cac3e94f8772a6fe93d/zach.jpeg', true);

// Get DOM elements
const topTextInput = document.getElementById('topText');
const bottomTextInput = document.getElementById('bottomText');
const fontSizeInput = document.getElementById('fontSize');
const textColorInput = document.getElementById('textColor');
const downloadBtn = document.getElementById('downloadBtn');
const previewBtn = document.getElementById('previewBtn');
const previewImg = document.getElementById('previewImage');
const imageUpload = document.getElementById('imageUpload');

// Helper function to draw a drag handle
function drawDragHandle(x, y, tooltip) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

// Helper function to get mouse position relative to canvas
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function getEventPos(evt) {
    const point = evt.touches ? evt.touches[0] : evt;
    return getMousePos(point);
}

function ratioToPixels(position) {
    return {
        x: position.x * canvas.width,
        y: position.y * canvas.height
    };
}

function pixelsToRatio(position) {
    return {
        x: Math.min(1, Math.max(0, position.x / canvas.width)),
        y: Math.min(1, Math.max(0, position.y / canvas.height))
    };
}

// Helper function to find if a point is near text position
function isNearPosition(mousePos, textPos) {
    const distance = Math.sqrt(
        Math.pow(mousePos.x - textPos.x, 2) + 
        Math.pow(mousePos.y - textPos.y, 2)
    );
    return distance < 20;
}

// Add event listeners
topTextInput.addEventListener('input', () => {
    drawImage(true);
    updatePreview(true);
});
bottomTextInput.addEventListener('input', () => {
    drawImage(true);
    updatePreview(true);
});
fontSizeInput.addEventListener('input', () => {
    drawImage(true);
    updatePreview(true);
});
textColorInput.addEventListener('input', () => {
    drawImage(true);
    updatePreview(true);
});
downloadBtn.addEventListener('click', downloadImage);
previewBtn.addEventListener('click', () => updatePreview(true));

// Add drag event listeners
canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);
    if (isNearPosition(pos, ratioToPixels(topTextPosition))) {
        isDragging = true;
        dragTarget = 'top';
    } else if (isNearPosition(pos, ratioToPixels(bottomTextPosition))) {
        isDragging = true;
        dragTarget = 'bottom';
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const pos = getMousePos(e);
        const ratio = pixelsToRatio(pos);
        if (dragTarget === 'top') {
            topTextPosition = ratio;
        } else if (dragTarget === 'bottom') {
            bottomTextPosition = ratio;
        }
        drawImage(true);
        updatePreview(true);
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    dragTarget = null;
    drawImage(true);
    updatePreview(true);
});

canvas.addEventListener('touchstart', (e) => {
    const pos = getEventPos(e);
    if (isNearPosition(pos, ratioToPixels(topTextPosition))) {
        isDragging = true;
        dragTarget = 'top';
        e.preventDefault();
    } else if (isNearPosition(pos, ratioToPixels(bottomTextPosition))) {
        isDragging = true;
        dragTarget = 'bottom';
        e.preventDefault();
    }
});

canvas.addEventListener('touchmove', (e) => {
    if (isDragging) {
        const pos = getEventPos(e);
        const ratio = pixelsToRatio(pos);
        if (dragTarget === 'top') {
            topTextPosition = ratio;
        } else if (dragTarget === 'bottom') {
            bottomTextPosition = ratio;
        }
        drawImage(true);
        updatePreview(true);
        e.preventDefault();
    }
});

canvas.addEventListener('touchend', () => {
    isDragging = false;
    dragTarget = null;
    drawImage(true);
    updatePreview(true);
});

canvas.addEventListener('touchcancel', () => {
    isDragging = false;
    dragTarget = null;
});

window.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        dragTarget = null;
        drawImage(true);
        updatePreview(true);
    }
});

window.addEventListener('touchend', () => {
    if (isDragging) {
        isDragging = false;
        dragTarget = null;
        drawImage(true);
        updatePreview(true);
    }
});

window.addEventListener('resize', updateCanvasSize);

// Handle user-uploaded image files
if (imageUpload) {
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(evt) {
            // evt.target.result is a data URL. Data URLs are same-origin and won't taint the canvas.
            setBaseImageFromSrc(evt.target.result, false);
        };
        reader.onerror = function(err) {
            console.warn('File read error', err);
            alert('Failed to read file. Try a different image.');
        };
        reader.readAsDataURL(file);
    });
}

// Draw the image and optionally add text
function drawImage(addText = true) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If base image not ready yet, draw a placeholder and exit
    if (!baseImage.complete || baseImage.naturalWidth === 0) {
        ctx.fillStyle = '#ccc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    // Draw base image
    const scale = Math.min(canvas.width / baseImage.width, canvas.height / baseImage.height);
    const x = (canvas.width - baseImage.width * scale) / 2;
    const y = (canvas.height - baseImage.height * scale) / 2;

    ctx.drawImage(baseImage, x, y, baseImage.width * scale, baseImage.height * scale);

    if (addText) {
        // Configure text settings
        ctx.textAlign = 'center';
        ctx.fillStyle = textColorInput.value;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = `${fontSizeInput.value}px Impact`;

        // Convert ratio-based positions to actual canvas pixels
        const topPos = ratioToPixels(topTextPosition);
        const bottomPos = ratioToPixels(bottomTextPosition);

        // Draw top text
        const topText = topTextInput.value.toUpperCase();
        ctx.strokeText(topText, topPos.x, topPos.y);
        ctx.fillText(topText, topPos.x, topPos.y);

        // Draw bottom text
        const bottomText = bottomTextInput.value.toUpperCase();
        ctx.strokeText(bottomText, bottomPos.x, bottomPos.y);
        ctx.fillText(bottomText, bottomPos.x, bottomPos.y);

        // Draw drag handles if not dragging
        if (!isDragging) {
            drawDragHandle(topPos.x, topPos.y, 'Top text - Drag to move');
            drawDragHandle(bottomPos.x, bottomPos.y, 'Bottom text - Drag to move');
        }
    }
}

// Update the preview image with or without text
function updatePreview(withText = false) {
    // Update live preview image (if available). Use try/catch because canvas may be tainted
    if (previewImg) {
        try {
            const isDraggingTemp = isDragging;
            isDragging = true; // Temporarily hide drag handles
            drawImage(withText);  // Draw with or without text
            previewImg.src = canvas.toDataURL('image/png');
            isDragging = isDraggingTemp; // Restore drag state
            drawImage(withText); // Redraw canvas with handles if needed
        } catch (e) {
            // If canvas is tainted (cross-origin), toDataURL will throw. We silently fail and leave preview empty.
            console.warn('Could not update preview image (canvas may be tainted):', e);
            previewImg.src = '';
        }
    }
}

function downloadImage() {
    try {
        drawImage(true);  // Always include text in downloads
        const link = document.createElement('a');
        link.download = 'meme.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.warn('Could not download image (canvas may be tainted):', e);
        alert('Unable to download image. Cross-origin image may have tainted the canvas.');
    }
}