export class CropManager {
    constructor(screenShare, uiManager) {
        this.screenShare = screenShare;
        this.uiManager = uiManager;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        this.cropBox = document.querySelector('.crop-box');
        this.cropOverlay = document.querySelector('.crop-overlay');
        this.previewCanvas = document.getElementById('previewCanvas');
        this.ctx = this.previewCanvas.getContext('2d');
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.cropOverlay.addEventListener('mousedown', (e) => this.startDraw(e));
        this.cropOverlay.addEventListener('mousemove', (e) => this.draw(e));
        this.cropOverlay.addEventListener('mouseup', () => this.endDraw());
        this.cropOverlay.addEventListener('mouseleave', () => this.endDraw());
    }

    startDraw(e) {
        this.isDrawing = true;
        const bounds = this.cropOverlay.getBoundingClientRect();
        this.startX = e.clientX - bounds.left;
        this.startY = e.clientY - bounds.top;
        this.cropBox.style.display = 'block';
        this.uiManager.showResetCropButton();
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const bounds = this.cropOverlay.getBoundingClientRect();
        this.currentX = Math.min(Math.max(e.clientX - bounds.left, 0), bounds.width);
        this.currentY = Math.min(Math.max(e.clientY - bounds.top, 0), bounds.height);

        const left = Math.min(this.startX, this.currentX);
        const top = Math.min(this.startY, this.currentY);
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);

        this.cropBox.style.left = left + 'px';
        this.cropBox.style.top = top + 'px';
        this.cropBox.style.width = width + 'px';
        this.cropBox.style.height = height + 'px';

        this.uiManager.updateDimensions(this.getCropDimensions());
    }

    endDraw() {
        this.isDrawing = false;
    }

    getCropDimensions() {
        const bounds = this.screenShare.getVideoBounds();
        const scale = this.screenShare.getTrueWidth() / bounds.width;
        const width = Math.abs(this.currentX - this.startX);
        const height = Math.abs(this.currentY - this.startY);
        
        return {
            width: Math.round(width * scale),
            height: Math.round(height * scale),
            scale: scale
        };
    }

    resetCrop() {
        this.cropBox.style.display = 'none';
        this.ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    }

    updatePreview() {
        if (!this.screenShare.isActive() || this.cropBox.style.display === 'none') {
            requestAnimationFrame(() => this.updatePreview());
            return;
        }
        
        try {
            const bounds = this.screenShare.getVideoBounds();
            const scale = this.screenShare.getTrueWidth() / bounds.width;
            
            const left = Math.min(this.startX, this.currentX);
            const top = Math.min(this.startY, this.currentY);
            const width = Math.abs(this.currentX - this.startX);
            const height = Math.abs(this.currentY - this.startY);
            
            const trueX = left * scale;
            const trueY = top * scale;
            const trueBoxWidth = width * scale;
            const trueBoxHeight = height * scale;
            
            this.previewCanvas.width = trueBoxWidth;
            this.previewCanvas.height = trueBoxHeight;
            
            this.ctx.drawImage(
                this.screenShare.getVideoElement(),
                trueX,
                trueY,
                trueBoxWidth,
                trueBoxHeight,
                0,
                0,
                this.previewCanvas.width,
                this.previewCanvas.height
            );
            
            requestAnimationFrame(() => this.updatePreview());
        } catch (error) {
            console.error('Error in updatePreview:', error);
            requestAnimationFrame(() => this.updatePreview());
        }
    }

    show() {
        this.cropOverlay.style.display = 'block';
    }

    hide() {
        this.cropOverlay.style.display = 'none';
        this.cropBox.style.display = 'none';
    }
}