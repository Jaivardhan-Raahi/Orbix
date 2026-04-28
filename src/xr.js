import * as THREE from 'three';

export class XRManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.session = null;
        this.setupXR();
    }

    async setupXR() {
        this.renderer.xr.enabled = true;
        const overlay = document.getElementById('overlay');

        if ('xr' in navigator) {
            console.log('WebXR: Checking for immersive-vr support...');
            const supported = await navigator.xr.isSessionSupported('immersive-vr');
            
            if (supported) {
                console.log('WebXR: immersive-vr is supported.');
                this.createStartButton(overlay);
            } else {
                console.warn('WebXR: immersive-vr NOT supported. Falling back to standard rendering.');
                this.showFallbackMessage(overlay);
            }
        } else {
            console.warn('WebXR: API not found in navigator. Falling back to standard rendering.');
            this.showFallbackMessage(overlay, 'WebXR not supported in this browser.');
        }
    }

    createStartButton(container) {
        const button = document.createElement('button');
        button.textContent = 'Start VR Session';
        button.style.cssText = `
            padding: 12px 24px;
            font-size: 16px;
            background: #00ffff;
            color: #000;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            font-weight: bold;
        `;

        button.onclick = async () => {
            try {
                console.log('WebXR: Requesting immersive-vr session...');
                const session = await navigator.xr.requestSession('immersive-vr');
                console.log('WebXR: Session started successfully.');
                this.renderer.xr.setSession(session);
                button.textContent = 'Exit VR';
                
                session.addEventListener('end', () => {
                    console.log('WebXR: Session ended.');
                    button.textContent = 'Start VR Session';
                    this.session = null;
                });

                this.session = session;
            } catch (error) {
                console.error('WebXR: Failed to start session:', error);
                alert('Could not start VR session. Check console for details.');
            }
        };

        container.appendChild(button);
    }

    showFallbackMessage(container, message = 'VR Mode Unavailable') {
        const div = document.createElement('div');
        div.textContent = message;
        div.style.cssText = `
            padding: 10px;
            background: rgba(255, 0, 0, 0.7);
            color: white;
            border-radius: 5px;
            font-size: 14px;
        `;
        container.appendChild(div);
    }

    getIsPresenting() {
        return this.renderer.xr.isPresenting;
    }

    getCamera() {
        // When not in XR, this returns the default camera.
        // When in XR, it returns the XR-managed camera.
        return this.renderer.xr.isPresenting ? this.renderer.xr.getCamera(this.camera) : this.camera;
    }
}
