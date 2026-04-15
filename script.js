let canvas;
let ctx;
let baseImage = new Image();
let canvasAspectRatio = 4 / 3;

const BASE_FONT_SIZE = 40;
const HANDLE_RADIUS = 8;
const HANDLE_PADDING = 12;
const HANDLE_HOVER_MARGIN = 24;
const MIN_WIDTH_RATIO = 0.25;
const MAX_WIDTH_RATIO = 0.95;

let textBoxes = {
    top: { x: 0.5, y: 0.12, width: 0.7, angle: 0 },
    bottom: { x: 0.5, y: 0.88, width: 0.7, angle: 0 }
};
let isDragging = false;
let dragTarget = null;
let hoveredTextTarget = null;
let gestureState = null;
let scrollAnimationFrame = null;
let canvasContainer;

let topTextInput;
let bottomTextInput;
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

function getFontSizeForText(text, targetWidth) {
    const fontSize = BASE_FONT_SIZE;
    ctx.font = `${fontSize}px Impact`;
    const measured = ctx.measureText(text).width || 1;
    return Math.max(12, Math.min(200, fontSize * targetWidth / measured));
}

function getTextBoxData(text, settings) {
    const targetWidth = settings.width * canvas.width;
    const fontSize = getFontSizeForText(text, targetWidth);
    ctx.font = `${fontSize}px Impact`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2;
    return {
        fontSize,
        textWidth,
        textHeight,
        halfWidth: textWidth / 2 + HANDLE_PADDING,
        halfHeight: textHeight / 2 + HANDLE_PADDING
    };
}

function rotatePoint(point, center, angle) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
        x: dx * Math.cos(angle) - dy * Math.sin(angle),
        y: dx * Math.sin(angle) + dy * Math.cos(angle)
    };
}

function getTextHandlePositions(settings, dims) {
    const center = ratioToPixels(settings);
    const resizeLocal = { x: dims.halfWidth, y: 0 };
    const rotateLocal = { x: 0, y: -dims.halfHeight - 20 };
    return {
        resize: {
            x: center.x + resizeLocal.x * Math.cos(settings.angle) - resizeLocal.y * Math.sin(settings.angle),
            y: center.y + resizeLocal.x * Math.sin(settings.angle) + resizeLocal.y * Math.cos(settings.angle)
        },
        rotate: {
            x: center.x + rotateLocal.x * Math.cos(settings.angle) - rotateLocal.y * Math.sin(settings.angle),
            y: center.y + rotateLocal.x * Math.sin(settings.angle) + rotateLocal.y * Math.cos(settings.angle)
        }
    };
}

function pointInTextBox(point, text, settings, extraMargin = 0) {
    const center = ratioToPixels(settings);
    const local = rotatePoint(point, center, -settings.angle);
    const dims = getTextBoxData(text, settings);
    return (
        local.x >= -dims.halfWidth - extraMargin &&
        local.x <= dims.halfWidth + extraMargin &&
        local.y >= -dims.halfHeight - extraMargin &&
        local.y <= dims.halfHeight + extraMargin
    );
}

function getDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function scheduleRedraw() {
    if (scrollAnimationFrame !== null) return;
    scrollAnimationFrame = requestAnimationFrame(() => {
        drawImage(true);
        scrollAnimationFrame = null;
    });
}

function getTouchPositions(touches) {
    return Array.from(touches).map((touch) => getMousePos(touch));
}

function getMidpoint(a, b) {
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2
    };
}

function getAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x);
}

function findGestureTarget(positions) {
    const topText = topTextInput.value.toUpperCase();
    const bottomText = bottomTextInput.value.toUpperCase();
    const topBox = textBoxes.top;
    const bottomBox = textBoxes.bottom;
    const topDims = topText ? getTextBoxData(topText, topBox) : null;
    const bottomDims = bottomText ? getTextBoxData(bottomText, bottomBox) : null;
    const topHandles = topDims ? getTextHandlePositions(topBox, topDims) : null;
    const bottomHandles = bottomDims ? getTextHandlePositions(bottomBox, bottomDims) : null;

    const midpoint = getMidpoint(positions[0], positions[1]);
    const topScore = topText ? (
        (pointInTextBox(midpoint, topText, topBox, HANDLE_HOVER_MARGIN) ? 0 : 1000) +
        Math.min(
            getDistance(midpoint, topHandles.rotate),
            getDistance(midpoint, topHandles.resize)
        )
    ) : Infinity;

    const bottomScore = bottomText ? (
        (pointInTextBox(midpoint, bottomText, bottomBox, HANDLE_HOVER_MARGIN) ? 0 : 1000) +
        Math.min(
            getDistance(midpoint, bottomHandles.rotate),
            getDistance(midpoint, bottomHandles.resize)
        )
    ) : Infinity;

    if (topScore === Infinity && bottomScore === Infinity) return null;
    return topScore <= bottomScore ? 'top' : 'bottom';
}

function updateHoverTarget(mousePos) {
    const topText = topTextInput.value.toUpperCase();
    const bottomText = bottomTextInput.value.toUpperCase();
    const topBox = textBoxes.top;
    const bottomBox = textBoxes.bottom;
    const topHit = topText && pointInTextBox(mousePos, topText, topBox, HANDLE_HOVER_MARGIN);
    const bottomHit = bottomText && pointInTextBox(mousePos, bottomText, bottomBox, HANDLE_HOVER_MARGIN);

    let topHandleHover = false;
    let bottomHandleHover = false;

    if (topText) {
        const topDims = getTextBoxData(topText, topBox);
        const topHandles = getTextHandlePositions(topBox, topDims);
        topHandleHover = getDistance(mousePos, topHandles.rotate) < HANDLE_RADIUS * 1.5 ||
            getDistance(mousePos, topHandles.resize) < HANDLE_RADIUS * 1.5;
    }

    if (bottomText) {
        const bottomDims = getTextBoxData(bottomText, bottomBox);
        const bottomHandles = getTextHandlePositions(bottomBox, bottomDims);
        bottomHandleHover = getDistance(mousePos, bottomHandles.rotate) < HANDLE_RADIUS * 1.5 ||
            getDistance(mousePos, bottomHandles.resize) < HANDLE_RADIUS * 1.5;
    }

    if (topHit || topHandleHover) {
        hoveredTextTarget = 'top';
    } else if (bottomHit || bottomHandleHover) {
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

function drawDragHandle(x, y) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, HANDLE_RADIUS, 0, Math.PI * 2);
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
    if (textColorInput) textColorInput.addEventListener('input', () => drawImage(true));
    if (downloadBtn) downloadBtn.addEventListener('click', downloadImage);

    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            const pos = getMousePos(e);
            const topText = topTextInput.value.toUpperCase();
            const bottomText = bottomTextInput.value.toUpperCase();
            const topBox = textBoxes.top;
            const bottomBox = textBoxes.bottom;
            const topDims = getTextBoxData(topText, topBox);
            const bottomDims = getTextBoxData(bottomText, bottomBox);
            const topHandles = getTextHandlePositions(topBox, topDims);
            const bottomHandles = getTextHandlePositions(bottomBox, bottomDims);

            if (topText && getDistance(pos, topHandles.rotate) < HANDLE_RADIUS * 1.5) {
                isDragging = true;
                dragTarget = 'top-rotate';
            } else if (topText && getDistance(pos, topHandles.resize) < HANDLE_RADIUS * 1.5) {
                isDragging = true;
                dragTarget = 'top-resize';
            } else if (topText && pointInTextBox(pos, topText, topBox)) {
                isDragging = true;
                dragTarget = 'top-move';
            } else if (bottomText && getDistance(pos, bottomHandles.rotate) < HANDLE_RADIUS * 1.5) {
                isDragging = true;
                dragTarget = 'bottom-rotate';
            } else if (bottomText && getDistance(pos, bottomHandles.resize) < HANDLE_RADIUS * 1.5) {
                isDragging = true;
                dragTarget = 'bottom-resize';
            } else if (bottomText && pointInTextBox(pos, bottomText, bottomBox)) {
                isDragging = true;
                dragTarget = 'bottom-move';
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            const pos = getMousePos(e);
            if (isDragging && dragTarget) {
                const target = dragTarget.split('-')[0];
                const mode = dragTarget.split('-')[1];
                const box = textBoxes[target];
                const center = ratioToPixels(box);
                const local = rotatePoint(pos, center, -box.angle);

                if (mode === 'move') {
                    textBoxes[target].x = pixelsToRatio(pos).x;
                    textBoxes[target].y = pixelsToRatio(pos).y;
                } else if (mode === 'resize') {
                    const newWidth = Math.max(MIN_WIDTH_RATIO, Math.min(MAX_WIDTH_RATIO, (Math.abs(local.x) + HANDLE_PADDING) * 2 / canvas.width));
                    textBoxes[target].width = newWidth;
                } else if (mode === 'rotate') {
                    textBoxes[target].angle = Math.atan2(pos.y - center.y, pos.x - center.x) + Math.PI / 2;
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
            if (e.touches.length === 2) {
                const positions = getTouchPositions(e.touches);
                const target = findGestureTarget(positions);
                if (target) {
                    const midpoint = getMidpoint(positions[0], positions[1]);
                    const startAngle = getAngle(positions[0], positions[1]);
                    const startDistance = Math.max(1, getDistance(positions[0], positions[1]));

                    gestureState = {
                        target,
                        startAngle,
                        startDistance,
                        startMidpoint: midpoint,
                        startBox: { ...textBoxes[target] }
                    };
                    hoveredTextTarget = target;
                    e.preventDefault();
                    return;
                }
            }

            const pos = getEventPos(e);
            const topText = topTextInput.value.toUpperCase();
            const bottomText = bottomTextInput.value.toUpperCase();
            const topBox = textBoxes.top;
            const bottomBox = textBoxes.bottom;
            const topDims = getTextBoxData(topText, topBox);
            const bottomDims = getTextBoxData(bottomText, bottomBox);
            const topHandles = getTextHandlePositions(topBox, topDims);
            const bottomHandles = getTextHandlePositions(bottomBox, bottomDims);

            if (topText && getDistance(pos, topHandles.rotate) < HANDLE_RADIUS * 1.5) {
                isDragging = true;
                dragTarget = 'top-rotate';
                e.preventDefault();
            } else if (topText && getDistance(pos, topHandles.resize) < HANDLE_RADIUS * 1.5) {
                isDragging = true;
                dragTarget = 'top-resize';
                e.preventDefault();
            } else if (topText && pointInTextBox(pos, topText, topBox)) {
                isDragging = true;
                dragTarget = 'top-move';
                e.preventDefault();
            } else if (bottomText && getDistance(pos, bottomHandles.rotate) < HANDLE_RADIUS * 1.5) {
                isDragging = true;
                dragTarget = 'bottom-rotate';
                e.preventDefault();
            } else if (bottomText && getDistance(pos, bottomHandles.resize) < HANDLE_RADIUS * 1.5) {
                isDragging = true;
                dragTarget = 'bottom-resize';
                e.preventDefault();
            } else if (bottomText && pointInTextBox(pos, bottomText, bottomBox)) {
                isDragging = true;
                dragTarget = 'bottom-move';
                e.preventDefault();
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (gestureState && e.touches.length === 2) {
                const positions = getTouchPositions(e.touches);
                const midpoint = getMidpoint(positions[0], positions[1]);
                const currentAngle = getAngle(positions[0], positions[1]);
                const currentDistance = Math.max(1, getDistance(positions[0], positions[1]));
                const deltaAngle = currentAngle - gestureState.startAngle;
                const scale = currentDistance / gestureState.startDistance;

                const target = gestureState.target;
                const box = textBoxes[target];
                const newWidth = Math.max(MIN_WIDTH_RATIO, Math.min(MAX_WIDTH_RATIO, gestureState.startBox.width * scale));
                const deltaX = midpoint.x - gestureState.startMidpoint.x;
                const deltaY = midpoint.y - gestureState.startMidpoint.y;

                box.width = newWidth;
                box.angle = gestureState.startBox.angle + deltaAngle;
                box.x = Math.min(1, Math.max(0, gestureState.startBox.x + deltaX / canvas.width));
                box.y = Math.min(1, Math.max(0, gestureState.startBox.y + deltaY / canvas.height));

                drawImage(true);
                e.preventDefault();
                return;
            }

            if (isDragging && dragTarget) {
                const pos = getEventPos(e);
                const target = dragTarget.split('-')[0];
                const mode = dragTarget.split('-')[1];
                const box = textBoxes[target];
                const center = ratioToPixels(box);
                const local = rotatePoint(pos, center, -box.angle);

                if (mode === 'move') {
                    textBoxes[target].x = pixelsToRatio(pos).x;
                    textBoxes[target].y = pixelsToRatio(pos).y;
                } else if (mode === 'resize') {
                    const newWidth = Math.max(MIN_WIDTH_RATIO, Math.min(MAX_WIDTH_RATIO, (Math.abs(local.x) + HANDLE_PADDING) * 2 / canvas.width));
                    textBoxes[target].width = newWidth;
                } else if (mode === 'rotate') {
                    textBoxes[target].angle = Math.atan2(pos.y - center.y, pos.x - center.x) + Math.PI / 2;
                }
                drawImage(true);
                e.preventDefault();
            }
        });

        canvas.addEventListener('touchend', () => {
            isDragging = false;
            dragTarget = null;
            gestureState = null;
            drawImage(true);
        });

        canvas.addEventListener('touchcancel', () => {
            isDragging = false;
            dragTarget = null;
            gestureState = null;
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
    window.addEventListener('orientationchange', updateCanvasSize);
    window.addEventListener('scroll', scheduleRedraw, { passive: true });
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

// Draw the text box with handles and optional controls
function drawTextBox(key, text, settings, showHandles) {
    if (!text) return;

    const dims = getTextBoxData(text, settings);
    const center = ratioToPixels(settings);

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(settings.angle);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const isActive = hoveredTextTarget === key || (dragTarget && dragTarget.startsWith(`${key}-`));
    if (showHandles && isActive) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-dims.halfWidth, -dims.halfHeight, dims.halfWidth * 2, dims.halfHeight * 2);
        drawDragHandle(dims.halfWidth, 0);
        drawDragHandle(0, -dims.halfHeight - 20);
    }

    ctx.font = `${dims.fontSize}px Impact`;
    ctx.fillStyle = textColorInput.value;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
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
        const topText = topTextInput.value.toUpperCase();
        const bottomText = bottomTextInput.value.toUpperCase();
        drawTextBox('top', topText, textBoxes.top, showHandles);
        drawTextBox('bottom', bottomText, textBoxes.bottom, showHandles);
    }
}

function downloadImage() {
    try {
        drawImage(true, false);  // Always include text in downloads, but hide UI handles
        const link = document.createElement('a');
        link.download = 'meme.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.warn('Could not download image (canvas may be tainted):', e);
        alert('Unable to download image. Cross-origin image may have tainted the canvas.');
    }
}