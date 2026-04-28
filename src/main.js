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

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const hit = intersects.find(i => i.object.userData && i.object.userData.type);

        if (hit) {
            const objectType = hit.object.userData.type;
            
            // Special case for the Orb itself
            if (objectType === 'orb') {
                this.orb.isBeingLookedAt = true;
                this.orb.lookAtTimer = 2.0; // Stay focused for 2 seconds
            }

            if (this.lookObject !== objectType && objectType !== 'orb') {
                console.log(`[Look Detection] User is looking at: ${objectType}`);
                this.lookObject = objectType;
                this.triggerAIReaction(objectType);
            }
        } else {
            this.lookObject = null;
        }

        if (this.aiCooldown > 0) this.aiCooldown -= deltaTime;
        if (this.orb.lookAtTimer > 0) this.orb.lookAtTimer -= deltaTime;
        else this.orb.isBeingLookedAt = false;
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
        this.orb.setColor(0xffaa00);
        setTimeout(() => this.orb.setColor(0x00ffff), 800);
    }

    updateFollow(deltaTime) {
        const activeCamera = this.xrManager.getCamera();
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        const camRight = new THREE.Vector3();
        const camUp = new THREE.Vector3(0, 1, 0); // World UP
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);
        
        // Calculate Right vector: Forward x UP
        camRight.crossVectors(camDir, camUp).normalize();
        
        // Final Position: camera + forward * 1.5 + right * 0.8 + up * 0.3
        const offset = camDir.clone().multiplyScalar(this.orb.targetDistance) // Forward
            .add(camRight.multiplyScalar(0.8)) // Right
            .add(new THREE.Vector3(0, 0.3, 0)); // Up

        const targetPos = camPos.clone().add(offset).add(this.orb.jitter);
        
        // Use a softer LERP for "floating" feel (0.1 weight equivalent over time)
        this.orb.group.position.lerp(targetPos, 2.0 * deltaTime);
        
        // Rotation Logic
        if (this.orb.isBeingLookedAt) {
            // Look directly at user when engaged
            this.orb.group.lookAt(camPos);
        } else {
            // Idle: Face forward (in the direction the user is looking)
            const targetRotation = new THREE.Quaternion();
            const dummy = new THREE.Object3D();
            dummy.position.copy(this.orb.group.position);
            dummy.lookAt(this.orb.group.position.clone().add(camDir));
            targetRotation.copy(dummy.quaternion);
            
            this.orb.group.quaternion.slerp(targetRotation, 1.5 * deltaTime);
        }
    }
}

new App();
