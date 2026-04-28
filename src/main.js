import * as THREE from 'three';
import { XRManager } from './xr.js';
import { Orb } from './orb.js';
import { Environment } from './environment.js';
import { chatWithAI } from './ai.js';
import { speak } from './voice.js';
import { ChatUI } from './ui.js';

class App {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        // State
        this.keys = {};
        this.moveSpeed = 2.0;
        this.playerVelocity = new THREE.Vector3();
        this.lookObject = null;
        this.aiCooldown = 0;

        // Managers
        this.xrManager = new XRManager(this.renderer, this.scene, this.camera);
        this.orb = new Orb(this.scene);
        this.environment = new Environment(this.scene);
        this.chatUI = new ChatUI();
        this.raycaster = new THREE.Raycaster();
        
        this.clock = new THREE.Clock();
        this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
        
        this.setupControls();
    }

    setupControls() {
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        window.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'touch') {
                this.playerVelocity.z -= 1.0;
            } else {
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
        this.updateUI();
        
        this.environment.update(elapsedTime);
        this.orb.update(deltaTime);
        this.renderer.render(this.scene, this.camera);
    }

    updateMovement(deltaTime) {
        const activeCamera = this.xrManager.getCamera();
        const direction = new THREE.Vector3();
        const right = new THREE.Vector3();

        activeCamera.getWorldDirection(direction);
        direction.y = 0;
        direction.normalize();

        right.crossVectors(direction, activeCamera.up);

        if (this.keys['KeyW']) this.playerVelocity.add(direction.clone().multiplyScalar(this.moveSpeed * deltaTime));
        if (this.keys['KeyS']) this.playerVelocity.sub(direction.clone().multiplyScalar(this.moveSpeed * deltaTime));
        if (this.keys['KeyA']) this.playerVelocity.sub(right.clone().multiplyScalar(this.moveSpeed * deltaTime));
        if (this.keys['KeyD']) this.playerVelocity.add(right.clone().multiplyScalar(this.moveSpeed * deltaTime));

        this.camera.position.add(this.playerVelocity);
        this.playerVelocity.multiplyScalar(0.9);
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
            if (objectType === 'orb') {
                this.orb.isBeingLookedAt = true;
                this.orb.lookAtTimer = 2.0;
            } else if (this.lookObject !== objectType) {
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

    async triggerAIReaction(type) {
        if (this.aiCooldown > 0) return;
        this.aiCooldown = 8.0; // 8 second cooldown between AI responses

        const prompt = `User is looking at a ${type}. React to this as Orbix (strict AI companion). One short sentence.`;
        
        // Visual feedback (preparing to speak)
        this.orb.setColor(0xffaa00); 

        const response = await chatWithAI(prompt);
        
        // Finalize reaction
        this.orb.setColor(0x00ffff);
        speak(response);
        
        // Show bubble
        const screenPos = this.getOrbScreenPosition();
        this.chatUI.show(response, screenPos.x, screenPos.y);
    }

    updateUI() {
        const screenPos = this.getOrbScreenPosition();
        this.chatUI.updatePosition(screenPos.x, screenPos.y);
    }

    getOrbScreenPosition() {
        const pos = new THREE.Vector3();
        this.orb.group.getWorldPosition(pos);
        pos.project(this.camera);

        return {
            x: (pos.x * 0.5 + 0.5) * window.innerWidth,
            y: (pos.y * -0.5 + 0.5) * window.innerHeight
        };
    }

    updateFollow(deltaTime) {
        const activeCamera = this.xrManager.getCamera();
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        const camRight = new THREE.Vector3();
        const camUp = new THREE.Vector3(0, 1, 0);
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);
        camRight.crossVectors(camDir, camUp).normalize();
        
        const offset = camDir.clone().multiplyScalar(this.orb.targetDistance)
            .add(camRight.multiplyScalar(0.8))
            .add(new THREE.Vector3(0, 0.3, 0));

        const targetPos = camPos.clone().add(offset).add(this.orb.jitter);
        
        if (this.lookObject) {
            targetPos.lerp(camPos.clone().add(camDir.multiplyScalar(this.orb.targetDistance * 0.8)), 0.3);
        }

        this.orb.group.position.lerp(targetPos, 2.0 * deltaTime);
        
        if (this.orb.isBeingLookedAt) {
            this.orb.group.lookAt(camPos);
        } else {
            const dummy = new THREE.Object3D();
            dummy.position.copy(this.orb.group.position);
            dummy.lookAt(this.orb.group.position.clone().add(camDir));
            this.orb.group.quaternion.slerp(dummy.quaternion, 1.5 * deltaTime);
        }
    }
}

new App();
