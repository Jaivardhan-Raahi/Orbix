export class ChatUI {
    constructor() {
        this.element = this.createBubble();
        document.body.appendChild(this.element);
        this.isVisible = false;
    }

    createBubble() {
        const div = document.createElement('div');
        div.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            background: rgba(0, 0, 0, 0.9);
            color: #00ffff;
            padding: 12px 18px;
            border-radius: 18px;
            border: 1px solid rgba(0, 255, 255, 0.5);
            font-size: 15px;
            font-weight: 500;
            max-width: 250px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1000;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(0, 255, 255, 0.2);
            will-change: transform;
        `;
        return div;
    }

    /**
     * Shows the bubble with text.
     */
    show(text) {
        this.element.textContent = text;
        this.element.style.opacity = '1';
        this.isVisible = true;

        // Auto-hide after 5 seconds
        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, 5000);
    }

    hide() {
        this.element.style.opacity = '0';
        this.isVisible = false;
    }

    /**
     * Updates position using translate3d for GPU acceleration.
     * @param {number} x Screen X coordinate
     * @param {number} y Screen Y coordinate
     */
    updatePosition(x, y) {
        if (!this.isVisible) return;

        // Apply hardware-accelerated transform
        // translate(-50%, -100%) to center above the target and offset by 50px
        this.element.style.transform = `translate3d(${x}px, ${y - 60}px, 0) translate(-50%, -100%)`;
    }
}
