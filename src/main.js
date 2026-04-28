import * as THREE from 'three';
import { XRManager } from './xr.js';
import { Orb } from './orb.js';
import { Environment } from './environment.js';

class App {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        // Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        this.xrManager = new XRManager(this.renderer, this.scene, this.camera);
        this.orb = new Orb(this.scene);
        this.environment = new Environment(this.scene);
        
        this.clock = new THREE.Clock();
        this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(time, frame) {
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        if (this.xrManager.getIsPresenting()) {
            if (frame) {
                this.updateFollow(deltaTime);
            }
        }
        
        this.environment.update(elapsedTime);
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
