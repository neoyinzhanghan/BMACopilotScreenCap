from flask import Flask, render_template
from flask_socketio import SocketIO

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/preview')
def preview():
    return render_template('preview.html')

# Create templates/index.html
"""
<!DOCTYPE html>
<html>
<head>
    <title>Screen Share with Live Crop</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        
        .screen-container {
            position: relative;
            margin: 20px 0;
            display: inline-block;
        }
        
        #sharedScreen {
            max-width: 100%;
            display: none;
        }
        
        .crop-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: none;
        }
        
        .crop-box {
            position: absolute;
            width: 512px;
            height: 512px;
            border: 2px solid red;
            background-color: rgba(255, 0, 0, 0.1);
            cursor: move;
            transform: translate(0, 0);
        }
        
        .controls {
            margin: 20px 0;
        }
        
        button {
            padding: 10px 20px;
            font-size: 16px;
            background-color: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
        }
        
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        
        #cropCanvas {
            display: none;
        }
        
        .instructions {
            margin: 20px 0;
            padding: 15px;
            background-color: #e3f2fd;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>Screen Share with Live Crop</h1>
    
    <div class="instructions">
        <h3>How to use:</h3>
        <ol>
            <li>Click "Start Screen Share" to share your screen</li>
            <li>A new window will open showing the live crop preview</li>
            <li>Drag the red box to select the 512x512 region you want to show</li>
            <li>The preview window will update in real-time</li>
        </ol>
    </div>
    
    <div class="controls">
        <button id="shareButton">Start Screen Share</button>
        <button id="stopButton" style="display: none;">Stop Sharing</button>
    </div>
    
    <div class="screen-container">
        <video id="sharedScreen" autoplay></video>
        <div class="crop-overlay">
            <div class="crop-box"></div>
        </div>
    </div>
    
    <canvas id="cropCanvas" width="512" height="512"></canvas>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"></script>
    <script>
        let stream = null;
        let previewWindow = null;
        
        const shareButton = document.getElementById('shareButton');
        const stopButton = document.getElementById('stopButton');
        const sharedScreen = document.getElementById('sharedScreen');
        const cropOverlay = document.querySelector('.crop-overlay');
        const cropBox = document.querySelector('.crop-box');
        const cropCanvas = document.getElementById('cropCanvas');
        const ctx = cropCanvas.getContext('2d');
        
        // Dragging functionality
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX;
        let initialY;
        
        cropBox.addEventListener('mousedown', dragStart);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        function dragStart(e) {
            initialX = e.clientX - currentX;
            initialY = e.clientY - currentY;
            
            if (e.target === cropBox) {
                isDragging = true;
            }
        }
        
        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                // Constrain to video bounds
                const bounds = sharedScreen.getBoundingClientRect();
                currentX = Math.max(bounds.left, Math.min(currentX, bounds.right - cropBox.offsetWidth));
                currentY = Math.max(bounds.top, Math.min(currentY, bounds.bottom - cropBox.offsetHeight));
                
                setTranslate(currentX, currentY, cropBox);
            }
        }
        
        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate(${xPos}px, ${yPos}px)`;
        }
        
        function dragEnd(e) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }
        
        async function startScreenShare() {
            try {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: "always"
                    },
                    audio: false
                });
                
                sharedScreen.srcObject = stream;
                sharedScreen.style.display = 'block';
                cropOverlay.style.display = 'block';
                shareButton.style.display = 'none';
                stopButton.style.display = 'inline-block';
                
                // Set initial crop box position
                const bounds = sharedScreen.getBoundingClientRect();
                currentX = (bounds.width - 512) / 2;
                currentY = (bounds.height - 512) / 2;
                setTranslate(currentX, currentY, cropBox);
                
                stream.getVideoTracks()[0].addEventListener('ended', () => {
                    stopSharing();
                });
                
                // Open preview window
                previewWindow = window.open('/preview', 'preview', 'width=532,height=532');
                
                // Start the crop preview loop
                requestAnimationFrame(updateCrop);
                
            } catch (err) {
                console.error("Error sharing screen:", err);
            }
        }
        
        function stopSharing() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (previewWindow) {
                previewWindow.close();
            }
            sharedScreen.style.display = 'none';
            cropOverlay.style.display = 'none';
            shareButton.style.display = 'inline-block';
            stopButton.style.display = 'none';
        }
        
        function updateCrop() {
            if (!stream || !previewWindow || previewWindow.closed) {
                return;
            }
            
            const bounds = sharedScreen.getBoundingClientRect();
            const scaleX = sharedScreen.videoWidth / bounds.width;
            const scaleY = sharedScreen.videoHeight / bounds.height;
            
            ctx.drawImage(
                sharedScreen,
                (currentX - bounds.left) * scaleX,
                (currentY - bounds.top) * scaleY,
                512 * scaleX,
                512 * scaleY,
                0,
                0,
                512,
                512
            );
            
            // Send the cropped image to preview window
            previewWindow.postMessage({
                type: 'crop-update',
                image: cropCanvas.toDataURL('image/jpeg', 0.7)
            }, '*');
            
            requestAnimationFrame(updateCrop);
        }
        
        shareButton.addEventListener('click', startScreenShare);
        stopButton.addEventListener('click', stopSharing);
        
        // Clean up when the window is closed
        window.addEventListener('beforeunload', () => {
            if (previewWindow && !previewWindow.closed) {
                previewWindow.close();
            }
        });
    </script>
</body>
</html>
"""

# Create templates/preview.html
"""
<!DOCTYPE html>
<html>
<head>
    <title>Crop Preview</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f0f0f0;
        }
        
        #previewImage {
            width: 512px;
            height: 512px;
            border: 1px solid #ccc;
            background-color: white;
        }
    </style>
</head>
<body>
    <img id="previewImage" alt="Crop Preview">
    
    <script>
        const previewImage = document.getElementById('previewImage');
        
        window.addEventListener('message', (event) => {
            if (event.data.type === 'crop-update') {
                previewImage.src = event.data.image;
            }
        });
    </script>
</body>
</html>
"""

if __name__ == '__main__':
    socketio.run(app, debug=True)