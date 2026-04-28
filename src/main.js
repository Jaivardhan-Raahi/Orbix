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

        // Movement State
        this.keys = {};
        this.moveSpeed = 2.0;
        this.playerVelocity = new THREE.Vector3();
        this.lookObject = null;
        this.aiCooldown = 0;

        // Lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);

        this.xrManager = new XRManager(this.renderer, this.scene, this.camera);
        this.orb = new Orb(this.scene);
        this.environment = new Environment(this.scene);
        this.raycaster = new THREE.Raycaster();
        
        this.clock = new THREE.Clock();
        this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
        
        this.setupControls();
    }

    setupControls() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Keyboard movement
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Click/Tap interaction
        window.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') {
                // Tap to move forward on mobile
                this.playerVelocity.z -= 1.0;
            } else {
                // Click to cycle distance
                let nextDist = this.orb.targetDistance + 1.0;
                if (nextDist > 3.5) nextDist = 1.0;
                this.orb.setDistance(nextDist);
            }
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
        
        this.updateMovement(deltaTime);
        this.updateLookDetection(deltaTime);
        this.updateFollow(deltaTime);
        
        this.environment.update(elapsedTime);
        this.orb.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    updateMovement(deltaTime) {
        const activeCamera = this.xrManager.getCamera();
        const direction = new THREE.Vector3();
        const right = new THREE.Vector3();

        // Get movement directions relative to camera
        activeCamera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        right.crossVectors(direction, activeCamera.up);

        if (this.keys['KeyW']) this.playerVelocity.add(direction.multiplyScalar(this.moveSpeed * deltaTime));
        if (this.keys['KeyS']) this.playerVelocity.sub(direction.multiplyScalar(this.moveSpeed * deltaTime));
        if (this.keys['KeyA']) this.playerVelocity.sub(right.multiplyScalar(this.moveSpeed * deltaTime));
        if (this.keys['KeyD']) this.playerVelocity.add(right.multiplyScalar(this.moveSpeed * deltaTime));

        // Apply velocity to camera container (or scene in simplified world)
        this.camera.position.add(this.playerVelocity);
        this.playerVelocity.multiplyScalar(0.9); // Friction
    }

    updateLookDetection(deltaTime) {
        const activeCamera = this.xrManager.getCamera();
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);
        
        this.raycaster.set(camPos, camDir);

        // Filter for objects with userData.type
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const hit = intersects.find(i => i.object.userData && i.object.userData.type);

        if (hit) {
            const objectType = hit.object.userData.type;
            if (this.lookObject !== objectType) {
                console.log(`[Look Detection] User is looking at: ${objectType}`);
                this.lookObject = objectType;
                this.triggerAIReaction(objectType);
            }
        } else {
            this.lookObject = null;
        }

        if (this.aiCooldown > 0) this.aiCooldown -= deltaTime;
    }

    triggerAIReaction(type) {
        if (this.aiCooldown > 0) return;
        
        const responses = {
            laptop: "Time to get some work done?",
            book: "Researching something interesting?",
            desk: "A clear workspace is a clear mind.",
            pillar: "These pillars have seen a lot of history."
        };

        const message = responses[type] || `User is looking at a ${type}.`;
        console.log(`[AI Interaction] ${message}`);
        
        this.aiCooldown = 4.0; // 4 second cooldown
        
        // Visual feedback on the orb
        this.orb.setColor(0xffaa00);
        setTimeout(() => this.orb.setColor(0x00ffff), 800);
    }

    updateFollow(deltaTime) {
        const activeCamera = this.xrManager.getCamera();
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        const camRight = new THREE.Vector3();
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);
        camRight.crossVectors(camDir, activeCamera.up).normalize();
        
        // Calculate offset position: Forward + Right + Down
        // Distance from gaze center: 0.5m right, 0.3m down
        const offset = camDir.clone().multiplyScalar(this.orb.targetDistance)
            .add(camRight.multiplyScalar(0.5))
            .add(new THREE.Vector3(0, -0.3, 0));

        const targetPos = camPos.clone().add(offset).add(this.orb.jitter);
        
        // If looking at an object, shift slightly closer to it
        if (this.lookObject) {
            targetPos.lerp(camPos.clone().add(camDir.multiplyScalar(this.orb.targetDistance * 0.8)), 0.3);
        }
        
        this.orb.group.position.lerp(targetPos, 2.5 * deltaTime);
        this.orb.group.lookAt(camPos);
    }
}

new App();
