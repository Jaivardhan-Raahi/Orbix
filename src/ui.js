export class ChatUI {
    constructor() {
        this.element = this.createBubble();
        document.body.appendChild(this.element);
    }

    createBubble() {
        const div = document.createElement('div');
        div.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.85);
            color: #00ffff;
            padding: 10px 15px;
            border-radius: 15px;
            border: 1px solid #00ffff;
            font-size: 14px;
            max-width: 200px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 100;
            text-align: center;
            transform: translate(-50%, -100%);
            box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
        `;
        return div;
    }

    show(text, x, y) {
        this.element.textContent = text;
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y - 40}px`; // Offset above the orb
        this.element.style.opacity = '1';

        // Auto-hide after 4 seconds
        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            this.element.style.opacity = '0';
        }, 4000);
    }

    updatePosition(x, y) {
        if (this.element.style.opacity === '1') {
            this.element.style.left = `${x}px`;
            this.element.style.top = `${y - 40}px`;
        }
    }
}
