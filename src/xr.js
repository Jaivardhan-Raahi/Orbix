import * as THREE from 'three';

export class XRManager {
    constructor(renderer, scene, camera, onSelect) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.onSelect = onSelect;
        
        this.hitTestSource = null;
        this.hitTestSourceRequested = false;
        this.session = null;
        this.setupXR();
    }

    async setupXR() {
        this.renderer.xr.enabled = true;
        const startBtn = document.getElementById('start-ar-btn');

        if ('xr' in navigator) {
            console.log('WebXR: Checking immersive-ar support...');
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            
            if (supported) {
                startBtn.addEventListener('click', () => this.startAR());
            } else {
                startBtn.textContent = "AR Not Supported";
                startBtn.style.background = "#555";
                startBtn.style.cursor = "not-allowed";
                console.warn('WebXR: immersive-ar NOT supported.');
            }
        } else {
            startBtn.textContent = "WebXR Not Available";
            startBtn.style.background = "#555";
            console.warn('WebXR: API not found in navigator.');
        }
    }

    async startAR() {
        try {
            console.log('WebXR: Requesting immersive-ar session...');
            const session = await navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['dom-overlay'],
                domOverlay: { root: document.body }
            });
            
            console.log('WebXR: Session granted.');
            this.renderer.xr.setSession(session);
            this.session = session;
            
            // Setup select event
            session.addEventListener('select', (e) => {
                if (this.onSelect) this.onSelect(e);
            });
            
            // Hide landing UI and trigger fade-in
            document.getElementById('landing-ui').style.display = 'none';
            const fade = document.getElementById('fade-overlay');
            fade.style.opacity = '1';
            setTimeout(() => { fade.style.opacity = '0'; }, 100);

            session.addEventListener('end', () => {
                console.log('WebXR: Session ended.');
                document.getElementById('landing-ui').style.display = 'flex';
                this.hitTestSourceRequested = false;
                this.hitTestSource = null;
                this.session = null;
            });

        } catch (error) {
            console.error('WebXR: Failed to start session:', error);
            alert('Could not start AR session. Check console for details.');
        }
    }

    updateHitTest(frame) {
        if (!this.session || !frame) return null;

        const referenceSpace = this.renderer.xr.getReferenceSpace();

        if (!this.hitTestSourceRequested) {
            this.session.requestReferenceSpace('viewer').then((refSpace) => {
                this.session.requestHitTestSource({ space: refSpace }).then((source) => {
                    this.hitTestSource = source;
                });
            });
            this.hitTestSourceRequested = true;
        }

        if (this.hitTestSource) {
            const hitTestResults = frame.getHitTestResults(this.hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                return hit.getPose(referenceSpace);
            }
        }
        return null;
    }

    getIsPresenting() {
        return this.renderer.xr.isPresenting;
    }

    getCamera() {
        return this.renderer.xr.isPresenting ? this.renderer.xr.getCamera(this.camera) : this.camera;
    }
}
