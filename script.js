let canvas;
let ctx;
let baseImage = new Image();
let canvasAspectRatio = 4 / 3;

// Text position state as ratios so positions scale with the canvas.
let topTextPosition = { x: 0.5, y: 0.12 };
let bottomTextPosition = { x: 0.5, y: 0.88 };
let isDragging = false;
let dragTarget = null;
let hoveredTextTarget = null;
let canvasContainer;

let topTextInput;
let bottomTextInput;
let fontSizeInput;
let textColorInput;
let downloadBtn;
let imageUpload;

const RAW_BASE_URL = 'https://alexgarysmith.github.io/make-zach-say-it/zimages/';
const ZIMAGE_LIST = [
    '0c1c1205-bef4-41d5-bcae-df5a873e9a6d.jpg',
    '1f49a476-d6f4-4018-b2dd-8359925c36d1.jpg',
    '20350224-f7d3-48dc-aede-9cfc689c0335.jpg',
    '2deaf793-8355-40b4-a8dc-039b823ccd9c.jpg',
    '374e1e98-6e24-4af7-8330-1b37905619f1.jpg',
    '4788a04e-0b4b-495c-9620-092247b368dc.jpg',
    '5009339e-45b0-4885-8635-44d327734a41.jpg',
    '5856fa08-b9ae-432f-af1a-c3b82e440468.jpg',
    '59573787-bd23-4e61-a449-97fc53768447.jpg',
    '62b9ae4c-c791-4e9e-9b83-95a290f8687b.jpg',
    '6a250531-ab57-4391-8f16-3299b6194398.jpg',
    '6df39a98-7251-4b38-a471-7a928608f5f7.jpg',
    '756faf3d-ea97-4589-a277-9189748bdf9f.jpg',
    '7b181b80-3110-4dd4-8c4f-5542c50d2016.jpg',
    '8f769bfe-3298-4880-aa04-40b6c741fe0c.jpg',
    '9116bf37-c6f6-4b9f-871c-b785f21b70b8.jpg',
    '98c83554-e8eb-4a52-850c-e7d18424d941.jpg',
    'a3c218de-3f35-449b-9355-25f8ba562b21.jpg',
    'a5ede5cb-02e9-47bf-aec6-e094a2d71bfc.jpg',
    'b178c79b-4a27-4bd0-9057-83789bd2c45b.jpg',
    'd5e07d74-faad-4a9a-9e6f-fe317ef9b542.jpg',
    'd66b7be4-91bc-4699-ad40-9d382082d299.jpg',
    'e5d260fe-bc05-4d15-8082-cbe7a2bf669e.jpg'
];
const FALLBACK_IMAGE_URL = 'https://alexgarysmith.github.io/make-zach-say-it/zach.jpeg';

function getRandomZimagePath() {
    const index = Math.floor(Math.random() * ZIMAGE_LIST.length);
    return `${RAW_BASE_URL}${ZIMAGE_LIST[index]}`;
}

function updateCanvasSize() {
    if (!canvasContainer) return;
    const width = Math.max(260, Math.min(canvasContainer.clientWidth, window.innerWidth - 32));
    const height = Math.round(width * canvasAspectRatio);
    const resized = canvas.width !== width || canvas.height !== height;

    canvas.width = width;
    canvas.height = height;

    if (resized) {
        drawImage(true);
    }
}

function updateHoverTarget(mousePos) {
    if (isNearPosition(mousePos, ratioToPixels(topTextPosition))) {
        hoveredTextTarget = 'top';
    } else if (isNearPosition(mousePos, ratioToPixels(bottomTextPosition))) {
        hoveredTextTarget = 'bottom';
    } else {
        hoveredTextTarget = null;
    }
}

// Helper to load an image from a src. If `external` is true, we set crossOrigin to 'anonymous' before
// assigning the src so the host must serve the image with appropriate CORS headers for toDataURL to work.
function setBaseImageFromSrc(src, external = false, onErrorFallback) {
    const img = new Image();
    if (external) img.crossOrigin = 'anonymous';
    img.onload = function() {
        baseImage = img;
        canvasAspectRatio = img.height / img.width || canvasAspectRatio;
        updateCanvasSize();
        drawImage(false);  // Don't add text when just loading image
    };
    img.onerror = function(e) {
        if (typeof onErrorFallback === 'function') {
            return onErrorFallback();
        }
        console.warn('Failed to load image:', e);
        alert('Failed to load image. Check the image URL or file and try again.');
    };
    img.src = src;
}

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

function initializeApp() {
    canvas = document.getElementById('imageCanvas');
    ctx = canvas.getContext('2d');
    canvasContainer = document.querySelector('.canvas-container');
    topTextInput = document.getElementById('topText');
    bottomTextInput = document.getElementById('bottomText');
    fontSizeInput = document.getElementById('fontSize');
    textColorInput = document.getElementById('textColor');
    downloadBtn = document.getElementById('downloadBtn');
    imageUpload = document.getElementById('imageUpload');

    updateCanvasSize();
    const defaultImagePath = getRandomZimagePath();
    setBaseImageFromSrc(defaultImagePath, true, () => {
        console.warn('Random zimages load failed, falling back to remote default image');
        setBaseImageFromSrc(FALLBACK_IMAGE_URL, true);
    });

    if (topTextInput) topTextInput.addEventListener('input', () => drawImage(true));
    if (bottomTextInput) bottomTextInput.addEventListener('input', () => drawImage(true));
    if (fontSizeInput) fontSizeInput.addEventListener('input', () => drawImage(true));
    if (textColorInput) textColorInput.addEventListener('input', () => drawImage(true));
    if (downloadBtn) downloadBtn.addEventListener('click', downloadImage);

    if (canvas) {
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
            const pos = getMousePos(e);
            if (isDragging) {
                const ratio = pixelsToRatio(pos);
                if (dragTarget === 'top') {
                    topTextPosition = ratio;
                } else if (dragTarget === 'bottom') {
                    bottomTextPosition = ratio;
                }
                drawImage(true);
            } else {
                updateHoverTarget(pos);
                drawImage(true);
            }
        });

        canvas.addEventListener('mouseleave', () => {
            hoveredTextTarget = null;
            if (!isDragging) drawImage(true);
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            dragTarget = null;
            drawImage(true);
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
                e.preventDefault();
            }
        });

        canvas.addEventListener('touchend', () => {
            isDragging = false;
            dragTarget = null;
            drawImage(true);
        });

        canvas.addEventListener('touchcancel', () => {
            isDragging = false;
            dragTarget = null;
        });
    }

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            dragTarget = null;
            drawImage(true);
        }
    });

    window.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            dragTarget = null;
            drawImage(true);
        }
    });

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
                setBaseImageFromSrc(evt.target.result, false);
            };
            reader.onerror = function(err) {
                console.warn('File read error', err);
                alert('Failed to read file. Try a different image.');
            };
            reader.readAsDataURL(file);
        });
    }

    window.addEventListener('resize', updateCanvasSize);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
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

// Draw the image and optionally add text
function drawImage(addText = true, showHandles = true) {
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

        // Draw drag handle only when hovering and not dragging
        if (showHandles && !isDragging && hoveredTextTarget) {
            if (hoveredTextTarget === 'top') {
                drawDragHandle(topPos.x, topPos.y, 'Top text - Drag to move');
            } else if (hoveredTextTarget === 'bottom') {
                drawDragHandle(bottomPos.x, bottomPos.y, 'Bottom text - Drag to move');
            }
        }
    }
}

function downloadImage() {
    try {
        drawImage(true, false);  // Always include text, but never show UI handles in downloads
        const link = document.createElement('a');
        link.download = 'meme.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.warn('Could not download image (canvas may be tainted):', e);
        alert('Unable to download image. Cross-origin image may have tainted the canvas.');
    }
}