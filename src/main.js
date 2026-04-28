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
        
        // Add interaction: click/tap to move orb
        window.addEventListener('pointerdown', () => {
            // Cycle distance: 1m -> 2m -> 3m -> 1m
            let nextDist = this.orb.targetDistance + 1.0;
            if (nextDist > 3.5) nextDist = 1.0;
            this.orb.setDistance(nextDist);
            console.log(`Orb target distance: ${nextDist}m`);
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(time, frame) {
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        // Always update follow logic, but use standard camera if not in XR
        this.updateFollow(deltaTime);
        
        this.environment.update(elapsedTime);
        this.orb.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    updateFollow(deltaTime) {
        const activeCamera = this.xrManager.getCamera();
        
        // 1. Get camera position and direction
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);
        
        // 2. Calculate target position in front of gaze
        const targetPos = camPos.clone().add(camDir.multiplyScalar(this.orb.targetDistance));
        
        // 3. Smoothly move orb (LERP)
        this.orb.group.position.lerp(targetPos, 2.0 * deltaTime);
        
        // 4. Always face the user
        this.orb.group.lookAt(camPos);
    }
}

new App();
