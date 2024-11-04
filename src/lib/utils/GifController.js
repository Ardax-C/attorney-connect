export class GifController {
    constructor() {
        this.wrapper = null;
        this.gifImg = null;
        this.canvas = null;
        this.isPlaying = true;
        this.autoPlayTimer = null;
        this.AUTO_PAUSE_DELAY = 6000; // 6 seconds
    }

    async init(imgElement) {
        this.gifImg = imgElement;
        
        // Create wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'gif-wrapper ' + imgElement.className;
        
        // Create canvas for static frame
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'static-frame';
        this.canvas.width = imgElement.naturalWidth || imgElement.width;
        this.canvas.height = imgElement.naturalHeight || imgElement.height;
        
        // Draw first frame to canvas
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(imgElement, 0, 0);
        
        // Set up the GIF image
        imgElement.className = 'gif-image';
        
        // Replace image with wrapper and add components
        imgElement.parentNode.insertBefore(this.wrapper, imgElement);
        this.wrapper.appendChild(this.canvas);
        this.wrapper.appendChild(imgElement);
        
        // Add click handler
        this.wrapper.addEventListener('click', () => {
            this.togglePlay();
        });
        
        // Add play indicator
        const playIndicator = document.createElement('div');
        playIndicator.className = 'play-indicator';
        playIndicator.innerHTML = `
            <svg class="w-12 h-12 text-gray-800" viewBox="0 0 24 24">
                <path fill="currentColor" d="M8 5v14l11-7z"/>
            </svg>
        `;
        this.wrapper.appendChild(playIndicator);

        // Start auto-pause timer
        this.startAutoPauseTimer();
    }

    startAutoPauseTimer() {
        // Clear any existing timer
        if (this.autoPlayTimer) {
            clearTimeout(this.autoPlayTimer);
        }
        
        // Set new timer
        this.autoPlayTimer = setTimeout(() => {
            if (this.isPlaying) {
                this.pause();
            }
        }, this.AUTO_PAUSE_DELAY);
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.isPlaying = true;
        this.wrapper.classList.remove('paused');
        this.gifImg.style.visibility = 'visible';
        this.canvas.style.visibility = 'hidden';
        
        // Start auto-pause timer when playing
        this.startAutoPauseTimer();
    }

    pause() {
        this.isPlaying = false;
        this.wrapper.classList.add('paused');
        this.gifImg.style.visibility = 'hidden';
        this.canvas.style.visibility = 'visible';
        
        // Clear auto-pause timer when manually pausing
        if (this.autoPlayTimer) {
            clearTimeout(this.autoPlayTimer);
        }
    }

    destroy() {
        // Clear timer on destroy
        if (this.autoPlayTimer) {
            clearTimeout(this.autoPlayTimer);
        }

        if (this.wrapper && this.wrapper.parentNode) {
            this.gifImg.className = this.wrapper.className.replace('gif-wrapper', '').trim();
            this.gifImg.style.visibility = 'visible';
            this.wrapper.parentNode.insertBefore(this.gifImg, this.wrapper);
            this.wrapper.parentNode.removeChild(this.wrapper);
        }
    }
} 