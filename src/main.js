import * as THREE from 'three';
import { XRManager } from './xr.js';
import { Orb } from './orb.js';

class App {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 20);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        // Lighting
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        this.scene.add(light);

        this.xrManager = new XRManager(this.renderer, this.scene, this.camera);
        this.orb = new Orb(this.scene);
        
        this.clock = new THREE.Clock();
        this.renderer.setAnimationLoop((time) => this.render(time));
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(time, frame) {
        const deltaTime = this.clock.getDelta();
        
        if (this.xrManager.getIsPresenting()) {
            if (frame) {
                // XR session is active and providing frames
                this.updateFollow(deltaTime);
            }
        }
        
        this.orb.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    updateFollow(deltaTime) {
        // Use the active camera (XR or standard)
        const activeCamera = this.xrManager.getCamera();
        
        // Target position: 1.5 meters in front of the camera
        const targetPos = new THREE.Vector3(0, 0, -1.5); 
        targetPos.applyMatrix4(activeCamera.matrixWorld);
        
        // Smoothly move the orb toward the target
        this.orb.mesh.position.lerp(targetPos, 1.5 * deltaTime);
        
        // Look at the camera
        const camPos = new THREE.Vector3();
        activeCamera.getWorldPosition(camPos);
        this.orb.mesh.lookAt(camPos);
    }
}

new App();
