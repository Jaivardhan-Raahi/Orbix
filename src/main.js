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

    render(time) {
        const deltaTime = this.clock.getDelta();
        
        if (this.xrManager.getIsPresenting()) {
            this.updateFollow(deltaTime);
        }
        
        this.orb.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    updateFollow(deltaTime) {
        // Simple follow logic: Orb stays in front of the camera
        const xrCamera = this.renderer.xr.getCamera(this.camera);
        const targetPos = new THREE.Vector3(0, 0, -0.6); // 60cm in front
        targetPos.applyMatrix4(xrCamera.matrixWorld);
        
        // Smooth interpolation (LERP)
        this.orb.mesh.position.lerp(targetPos, 2 * deltaTime);
        
        // Smoothly look at the user
        const camPos = new THREE.Vector3();
        xrCamera.getWorldPosition(camPos);
        this.orb.mesh.lookAt(camPos);
    }
}

new App();
