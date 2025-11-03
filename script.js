const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
let baseImage = new Image();

// Set default canvas size
canvas.width = 800;
canvas.height = 600;

// Helper to load an image from a src. If `external` is true, we set crossOrigin to 'anonymous' before
// assigning the src so the host must serve the image with appropriate CORS headers for toDataURL to work.
function setBaseImageFromSrc(src, external = false) {
    const img = new Image();
    if (external) img.crossOrigin = 'anonymous';
    img.onload = function() {
        baseImage = img;
        drawImage();
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
setBaseImageFromSrc('https://raw.githubusercontent.com/AlexGarySmith/make-zach-say-it/main/zach.jpeg', true);

// Get DOM elements
const topTextInput = document.getElementById('topText');
const bottomTextInput = document.getElementById('bottomText');
const fontSizeInput = document.getElementById('fontSize');
const textColorInput = document.getElementById('textColor');
const downloadBtn = document.getElementById('downloadBtn');
const previewBtn = document.getElementById('previewBtn');
const previewImg = document.getElementById('previewImage');
const imageUpload = document.getElementById('imageUpload');

// Add event listeners
topTextInput.addEventListener('input', drawImage);
bottomTextInput.addEventListener('input', drawImage);
fontSizeInput.addEventListener('input', drawImage);
textColorInput.addEventListener('input', drawImage);
downloadBtn.addEventListener('click', downloadImage);
previewBtn.addEventListener('click', () => {
    // Try to open the generated image in a new tab/window
    try {
        const data = canvas.toDataURL('image/png');
        const w = window.open('about:blank', '_blank');
        if (w) {
            w.document.write(`<title>Preview</title><img src="${data}" alt="Preview">`);
            w.document.close();
        } else {
            // Popup blocked
            alert('Unable to open preview in new tab — your browser may be blocking popups.');
        }
    } catch (e) {
        console.warn('Could not open preview (canvas may be tainted):', e);
        alert('Preview not available (cross-origin image may have tainted the canvas).');
    }
});

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

function drawImage() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If base image not ready yet, draw a placeholder and exit
    if (!baseImage.complete || baseImage.naturalWidth === 0) {
        ctx.fillStyle = '#ccc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (previewImg) previewImg.src = '';
        return;
    }

    // Draw base image
    const scale = Math.min(canvas.width / baseImage.width, canvas.height / baseImage.height);
    const x = (canvas.width - baseImage.width * scale) / 2;
    const y = (canvas.height - baseImage.height * scale) / 2;

    ctx.drawImage(baseImage, x, y, baseImage.width * scale, baseImage.height * scale);

    // Configure text settings
    ctx.textAlign = 'center';
    ctx.fillStyle = textColorInput.value;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = `${fontSizeInput.value}px Impact`;

    // Draw top text
    const topText = topTextInput.value.toUpperCase();
    ctx.strokeText(topText, canvas.width / 2, 60);
    ctx.fillText(topText, canvas.width / 2, 60);

    // Draw bottom text
    const bottomText = bottomTextInput.value.toUpperCase();
    ctx.strokeText(bottomText, canvas.width / 2, canvas.height - 20);
    ctx.fillText(bottomText, canvas.width / 2, canvas.height - 20);

    // Update live preview image (if available). Use try/catch because canvas may be tainted
    if (previewImg) {
        try {
            previewImg.src = canvas.toDataURL('image/png');
        } catch (e) {
            // If canvas is tainted (cross-origin), toDataURL will throw. We silently fail and leave preview empty.
            console.warn('Could not update preview image (canvas may be tainted):', e);
            previewImg.src = '';
        }
    }
}

function downloadImage() {
    try {
        const link = document.createElement('a');
        link.download = 'meme.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.warn('Could not download image (canvas may be tainted):', e);
        alert('Unable to download image. Cross-origin image may have tainted the canvas.');
    }
}