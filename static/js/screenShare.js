export class ScreenShare {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.elements = uiManager.getElements();

        // Core properties
        this.stream = null;
        this.trueWidth = 0;
        this.trueHeight = 0;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;

        this.ctx = this.elements.previewCanvas.getContext('2d');

        // Bind methods
        this.startDraw = this.startDraw.bind(this);
        this.draw = this.draw.bind(this);
        this.endDraw = this.endDraw.bind(this);
        this.updatePreview = this.updatePreview.bind(this);
        this.startScreenShare = this.startScreenShare.bind(this);
        this.stopSharing = this.stopSharing.bind(this);
        this.resetCrop = this.resetCrop.bind(this);
    }

    initializeEventListeners() {
        const { cropOverlay, shareButton, stopButton, resetCropButton } = this.elements;

        cropOverlay.addEventListener('mousedown', this.startDraw);
        cropOverlay.addEventListener('mousemove', this.draw);
        cropOverlay.addEventListener('mouseup', this.endDraw);
        cropOverlay.addEventListener('mouseleave', this.endDraw);
        shareButton.addEventListener('click', this.startScreenShare);
        stopButton.addEventListener('click', this.stopSharing);
        resetCropButton.addEventListener('click', this.resetCrop);
    }

    updateStatus(message) {
        console.log(message);
        this.elements.statusDiv.textContent = message;
    }

    updateDimensions() {
        const { sharedScreen, dimensionsDiv, previewCanvas } = this.elements;
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        const bounds = sharedScreen.getBoundingClientRect();
        const scale = this.trueWidth / bounds.width;
        const trueBoxWidth = Math.round(width * scale);
        const trueBoxHeight = Math.round(height * scale);

        dimensionsDiv.textContent = `Source: ${this.trueWidth}x${this.trueHeight} | Crop: ${trueBoxWidth}x${trueBoxHeight} | Scale: ${scale.toFixed(2)}x`;

        previewCanvas.width = trueBoxWidth;
        previewCanvas.height = trueBoxHeight;
    }

    startDraw(e) {
        const { cropOverlay, cropBox, resetCropButton } = this.elements;
        this.isDrawing = true;
        const bounds = cropOverlay.getBoundingClientRect();
        this.startX = e.clientX - bounds.left;
        this.startY = e.clientY - bounds.top;
        cropBox.style.display = 'block';
        resetCropButton.style.display = 'inline-block';
    }

    draw(e) {
        if (!this.isDrawing) return;

        const { cropOverlay, cropBox } = this.elements;
        const bounds = cropOverlay.getBoundingClientRect();
        this.currentX = Math.min(Math.max(e.clientX - bounds.left, 0), bounds.width);
        this.currentY = Math.min(Math.max(e.clientY - bounds.top, 0), bounds.height);

        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);

        cropBox.style.left = left + 'px';
        cropBox.style.top = top + 'px';
        cropBox.style.width = width + 'px';
        cropBox.style.height = height + 'px';

        this.updateDimensions();
    }

    endDraw() {
        this.isDrawing = false;
    }

    resetCrop() {
        const { cropBox, resetCropButton, previewCanvas, dimensionsDiv } = this.elements;
        cropBox.style.display = 'none';
        resetCropButton.style.display = 'none';
        this.ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        dimensionsDiv.textContent = `Source: ${this.trueWidth}x${this.trueHeight} | Crop: Not Selected`;
        
        const recordingIndicator = document.getElementById('recordingIndicator');
        recordingIndicator.classList.remove('live');
        recordingIndicator.classList.add('active');
        
        this.updateStatus('Selection cleared - Click and drag again to select a new region');
    }

    async startScreenShare() {
        const { sharedScreen, cropOverlay, shareButton, stopButton } = this.elements;

        this.updateStatus('Click "Start Screen Share" and select the window or screen you want to share');
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                throw new Error('Screen sharing is not supported in this browser');
            }

            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "never",
                    displaySurface: "monitor",
                },
                audio: false
            });

            sharedScreen.srcObject = this.stream;

            await new Promise(resolve => {
                sharedScreen.onloadedmetadata = () => {
                    this.trueWidth = sharedScreen.videoWidth;
                    this.trueHeight = sharedScreen.videoHeight;
                    resolve();
                };
            });

            await sharedScreen.play();

            const recordingIndicator = document.getElementById('recordingIndicator');
            recordingIndicator.classList.add('active');
            this.updateStatus('Please drag to draw a box to crop the view region you want the AI to examine');
            this.updateDimensions();

            sharedScreen.style.display = 'block';
            cropOverlay.style.display = 'block';
            shareButton.style.display = 'none';
            stopButton.style.display = 'inline-block';

            this.stream.getVideoTracks()[0].addEventListener('ended', () => {
                this.updateStatus('Screen share stopped by user');
                this.stopSharing();
            });

            requestAnimationFrame(this.updatePreview);

            // Start automatic screenshots every 10 seconds
            this.screenshotInterval = setInterval(() => {
                this.captureAndSendScreenshot();
            }, 2000);

        } catch (err) {
            this.updateStatus(`Error: ${err.message}`);
            console.error("Screen share error:", err);
            this.stopSharing();
        }
    }

    stopSharing() {
        const { sharedScreen, cropOverlay, cropBox, shareButton, stopButton, resetCropButton, previewCanvas } = this.elements;

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            if (this.screenshotInterval) {
                clearInterval(this.screenshotInterval);
                this.screenshotInterval = null;
            }
        }
        
        // Remove active class from recording indicator and status
        const recordingIndicator = document.getElementById('recordingIndicator');
        recordingIndicator.classList.remove('active');
        recordingIndicator.classList.remove('live');
        
        sharedScreen.srcObject = null;
        sharedScreen.style.display = 'none';
        cropOverlay.style.display = 'none';
        cropBox.style.display = 'none';
        shareButton.style.display = 'inline-block';
        stopButton.style.display = 'none';
        resetCropButton.style.display = 'none';
        this.updateStatus('Screen capture ended');
        this.elements.dimensionsDiv.textContent = 'Resolution: Not sharing';

        this.ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    }

    updatePreview() {
        const { sharedScreen, cropBox, previewCanvas } = this.elements;

        if (!this.stream || cropBox.style.display === 'none') {
            requestAnimationFrame(this.updatePreview);
            return;
        }

        try {
            const bounds = sharedScreen.getBoundingClientRect();
            const scale = this.trueWidth / bounds.width;

            const left = Math.min(this.startX, this.currentX);
            const top = Math.min(this.startY, this.currentY);
            const width = Math.abs(this.currentX - this.startX);
            const height = Math.abs(this.currentY - this.startY);

            const trueX = left * scale;
            const trueY = top * scale;
            const trueBoxWidth = width * scale;
            const trueBoxHeight = height * scale;

            previewCanvas.width = trueBoxWidth;
            previewCanvas.height = trueBoxHeight;

            this.ctx.drawImage(
                sharedScreen,
                trueX,
                trueY,
                trueBoxWidth,
                trueBoxHeight,
                0,
                0,
                previewCanvas.width,
                previewCanvas.height
            );

            requestAnimationFrame(this.updatePreview);
        } catch (error) {
            console.error('Error in updatePreview:', error);
            requestAnimationFrame(this.updatePreview);
        }
    }

    async captureAndSendScreenshot() {
        if (!this.stream || this.elements.cropBox.style.display === 'none') {
            return;
        }

        const canvas = document.createElement('canvas');
        const bounds = this.elements.sharedScreen.getBoundingClientRect();
        const scale = this.trueWidth / bounds.width;

        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);

        const trueX = left * scale;
        const trueY = top * scale;
        const trueBoxWidth = width * scale;
        const trueBoxHeight = height * scale;

        canvas.width = trueBoxWidth;
        canvas.height = trueBoxHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(
            this.elements.sharedScreen,
            trueX,
            trueY,
            trueBoxWidth,
            trueBoxHeight,
            0,
            0,
            canvas.width,
            canvas.height
        );

        // Convert to base64
        const base64Image = canvas.toDataURL('image/jpeg');

        try {
            const response = await fetch('/api/save-screenshot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: base64Image })
            });
            const result = await response.json();
            if (result.success) {
                const recordingIndicator = document.getElementById('recordingIndicator');
                recordingIndicator.classList.remove('active');
                recordingIndicator.classList.add('live');
                this.updateStatus('Screen capture live');
            } else {
                console.error('Failed to save screenshot:', result.error);
            }
        } catch (error) {
            console.error('Error sending screenshot:', error);
        }
    }

    initialize() {
        this.initializeEventListeners();
        this.updateStatus('Ready to share screen');
    }
}