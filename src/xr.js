import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';

export class XRManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.setupXR();
    }

    setupXR() {
        this.renderer.xr.enabled = true;
        const overlay = document.getElementById('overlay');
        const button = ARButton.createButton(this.renderer, {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['dom-overlay'],
            domOverlay: { root: overlay }
        });
        overlay.appendChild(button);
    }

    getIsPresenting() {
        return this.renderer.xr.isPresenting;
    }

    getCamera() {
        return this.renderer.xr.getCamera(this.camera);
    }
}
