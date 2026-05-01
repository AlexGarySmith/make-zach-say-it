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
let topTextColorInput;
let bottomTextColorInput;
let downloadBtn;
let imageUpload;

const RAW_BASE_URL = 'https://alexgarysmith.github.io/make-zach-say-it/zimages/';
const ZIMAGE_API_URL = 'https://api.github.com/repos/alexgarysmith/make-zach-say-it/contents/zimages';
const ZEME_BASE_URL = 'https://alexgarysmith.github.io/make-zach-say-it/zemes/';
const ZEME_API_URL = 'https://api.github.com/repos/alexgarysmith/make-zach-say-it/contents/zemes';
const ZIMAGE_LIST = [];
const FALLBACK_IMAGE_URL = `${RAW_BASE_URL}2deaf793-8355-40b4-a8dc-039b823ccd9c.jpg`;

function getRandomZimagePath() {
    if (ZIMAGE_LIST.length === 0) {
        return FALLBACK_IMAGE_URL;
    }
    const index = Math.floor(Math.random() * ZIMAGE_LIST.length);
    return `${RAW_BASE_URL}${ZIMAGE_LIST[index]}`;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function buildZimageGallery(imageUrls) {
    const gallery = document.getElementById('zimagesGallery');
    if (!gallery) return;

    shuffleArray(imageUrls);
    gallery.innerHTML = '';
    imageUrls.forEach((url) => {
        const card = document.createElement('div');
        card.className = 'zimage-card';
        card.setAttribute('data-zimage-src', url);

        const image = document.createElement('img');
        image.src = url;
        image.alt = 'Zach image';

        card.appendChild(image);
        gallery.appendChild(card);
    });
}

function buildZemeGallery(imageUrls) {
    const gallery = document.getElementById('zemesGallery');
    if (!gallery) return;

    shuffleArray(imageUrls);
    gallery.innerHTML = '';
    imageUrls.forEach((url) => {
        const card = document.createElement('div');
        card.className = 'zimage-card';
        card.setAttribute('data-zeme-src', url);

        const image = document.createElement('img');
        image.src = url;
        image.alt = 'Favorite zeme';

        card.appendChild(image);
        gallery.appendChild(card);
    });
}

function scrollCarousel(track, direction = 1) {
    if (!track) return;

    const card = track.querySelector('.zimage-card');
    const gap = 12;
    const scrollAmount = (card ? card.offsetWidth : 220) + gap;
    const maxScroll = track.scrollWidth - track.clientWidth;

    if (direction < 0 && track.scrollLeft <= 1) {
        track.scrollTo({ left: maxScroll, behavior: 'smooth' });
        return;
    }

    if (direction > 0 && track.scrollLeft + track.clientWidth >= maxScroll - 1) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
        return;
    }

    const nextPosition = track.scrollLeft + direction * scrollAmount;

    if (direction > 0 && nextPosition >= maxScroll - 1) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
        return;
    }

    track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

function updateGallerySelection(selectedUrl) {
    const gallery = document.getElementById('zimagesGallery');
    if (!gallery) return;

    gallery.querySelectorAll('.zimage-card.selected').forEach((card) => {
        card.classList.remove('selected');
    });

    const matchingCard = gallery.querySelector(`.zimage-card[data-zimage-src="${selectedUrl}"]`);
    if (matchingCard) {
        matchingCard.classList.add('selected');
    }
}

function loadZimageGallery() {
    const gallery = document.getElementById('zimagesGallery');
    if (!gallery) return;

    fetch(ZIMAGE_API_URL)
        .then((response) => {
            if (!response.ok) {
                throw new Error('GitHub API response not ok');
            }
            return response.json();
        })
        .then((files) => {
            const imageUrls = files
                .filter((file) => file.type === 'file' && /\.(jpe?g|png|gif)$/i.test(file.name))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                .map((file) => `${RAW_BASE_URL}${file.name}`);

            if (imageUrls.length === 0) {
                throw new Error('No image files found');
            }
            buildZimageGallery(imageUrls);
            updateGallerySelection(baseImage.src);
        })
        .catch(() => {
            const imageUrls = ZIMAGE_LIST.length ? ZIMAGE_LIST.map((name) => `${RAW_BASE_URL}${name}`) : [FALLBACK_IMAGE_URL];
            buildZimageGallery(imageUrls);
            updateGallerySelection(baseImage.src);
        });
}

function loadRandomZimage() {
    fetch(ZIMAGE_API_URL)
        .then((response) => {
            if (!response.ok) {
                throw new Error('GitHub API response not ok');
            }
            return response.json();
        })
        .then((files) => {
            const imageUrls = files
                .filter((file) => file.type === 'file' && /\.(jpe?g|png|gif)$/i.test(file.name))
                .map((file) => `${RAW_BASE_URL}${file.name}`);

            if (imageUrls.length === 0) {
                throw new Error('No image files found');
            }

            const randomUrl = imageUrls[Math.floor(Math.random() * imageUrls.length)];
            setBaseImageFromSrc(randomUrl, true, () => {
                console.warn('Random zimages load failed, falling back to default image');
                setBaseImageFromSrc(FALLBACK_IMAGE_URL, true);
            });
            updateGallerySelection(randomUrl);
        })
        .catch(() => {
            setBaseImageFromSrc(FALLBACK_IMAGE_URL, true);
            updateGallerySelection(FALLBACK_IMAGE_URL);
        });
}

function loadZemeGallery() {
    const gallery = document.getElementById('zemesGallery');
    if (!gallery) return;

    fetch(ZEME_API_URL)
        .then((response) => {
            if (!response.ok) {
                throw new Error('GitHub API response not ok');
            }
            return response.json();
        })
        .then((files) => {
            const imageUrls = files
                .filter((file) => file.type === 'file' && /\.(jpe?g|png|gif)$/i.test(file.name))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                .map((file) => `${ZEME_BASE_URL}${file.name}`);

            if (imageUrls.length === 0) {
                throw new Error('No image files found');
            }
            buildZemeGallery(imageUrls);
        })
        .catch(() => {
            gallery.innerHTML = '';
        });
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
        drawImage(true);
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
    topTextColorInput = document.getElementById('topTextColor');
    bottomTextColorInput = document.getElementById('bottomTextColor');
    downloadBtn = document.getElementById('downloadBtn');
    imageUpload = document.getElementById('imageUpload');

    updateCanvasSize();
    loadRandomZimage();

    loadZimageGallery();
    loadZemeGallery();

    if (topTextInput) topTextInput.addEventListener('input', () => drawImage(true));
    if (bottomTextInput) bottomTextInput.addEventListener('input', () => drawImage(true));
    if (topTextColorInput) topTextColorInput.addEventListener('input', () => drawImage(true));
    if (bottomTextColorInput) bottomTextColorInput.addEventListener('input', () => drawImage(true));
    if (downloadBtn) downloadBtn.addEventListener('click', downloadImage);

    document.querySelectorAll('.zimage-carousel').forEach((carousel) => {
        const track = carousel.querySelector('.zimage-carousel-track');
        const carouselPrev = carousel.querySelector('.carousel-arrow.prev');
        const carouselNext = carousel.querySelector('.carousel-arrow.next');
        if (carouselPrev) carouselPrev.addEventListener('click', () => scrollCarousel(track, -1));
        if (carouselNext) carouselNext.addEventListener('click', () => scrollCarousel(track, 1));
    });

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

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-zimage-src]');
        if (!trigger) return;

        const src = trigger.getAttribute('data-zimage-src');
        if (!src) return;

        setBaseImageFromSrc(src, true);

        const selectedCards = document.querySelectorAll('.zimage-card.selected');
        selectedCards.forEach((card) => card.classList.remove('selected'));
        if (trigger.classList.contains('zimage-card')) {
            trigger.classList.add('selected');
        }

        e.preventDefault();
    });

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
    ctx.fillStyle = key === 'top' ? (topTextColorInput ? topTextColorInput.value : '#ffffff') : (bottomTextColorInput ? bottomTextColorInput.value : '#ffffff');
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
        link.download = 'zach-meme-aka-zeme.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.warn('Could not download image (canvas may be tainted):', e);
        alert('Unable to download image. Cross-origin image may have tainted the canvas.');
    }
}
