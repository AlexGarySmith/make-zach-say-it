const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
let baseImage = new Image();

// Set default canvas size
canvas.width = 800;
canvas.height = 600;

// Initialize base image
baseImage.src = 'zach.jpeg';  // Replace with your image path
baseImage.onload = function() {
    drawImage();
};

// Get DOM elements
const topTextInput = document.getElementById('topText');
const bottomTextInput = document.getElementById('bottomText');
const fontSizeInput = document.getElementById('fontSize');
const textColorInput = document.getElementById('textColor');
const downloadBtn = document.getElementById('downloadBtn');

// Add event listeners
topTextInput.addEventListener('input', drawImage);
bottomTextInput.addEventListener('input', drawImage);
fontSizeInput.addEventListener('input', drawImage);
textColorInput.addEventListener('input', drawImage);
downloadBtn.addEventListener('click', downloadImage);

function drawImage() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
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
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'meme.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}