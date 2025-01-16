import { ScreenShare } from './screenShare.js';
import { CropManager } from './cropManager.js';
import { UIManager } from './uiManager.js';

document.addEventListener('DOMContentLoaded', () => {
    const uiManager = new UIManager();
    const screenShare = new ScreenShare(uiManager);
    const cropManager = new CropManager(screenShare, uiManager);

    // Initialize the application
    uiManager.initialize();
    screenShare.initialize();
    cropManager.initialize();
});