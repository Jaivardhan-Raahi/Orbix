import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { XRManager } from './xr.js';
import { Orb } from './orb.js';
import { chatWithAI } from './ai.js';
import { speak } from './voice.js';
import { ChatUI } from './ui.js';

class App {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.6, 0); 
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        this.raycaster = new THREE.Raycaster();
        this.chatUI = new ChatUI();
        
        // Gaze State
        this.aiCooldown = 0;
        this.gazeTarget = null;
        this.gazeTimer = 0;
        this.gazeThreshold = 2.0; // 2 seconds to trigger
        this.gazeTriggered = false;

        this.setupLighting();
        this.setupGazeCursor();
        
        this.xrManager = new XRManager(this.renderer, this.scene, this.camera, null);
        this.orb = new Orb(this.scene);
        
        this.loadModels();

        this.clock = new THREE.Clock();
        this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
        
        this.setupControls();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);
    }

    setupGazeCursor() {
        const geometry = new THREE.RingGeometry(0.015, 0.02, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.8,
            depthTest: false 
        });
        this.gazeCursor = new THREE.Mesh(geometry, material);
        this.gazeCursor.renderOrder = 999;
        this.scene.add(this.gazeCursor);
    }

    loadModels() {
        console.log('[Assets] Loading decoupled interior setup...');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        const createHitbox = (pos, size, type) => {
            const geo = new THREE.BoxGeometry(...size);
            const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, visible: false });
            const hitbox = new THREE.Mesh(geo, mat);
            hitbox.position.set(...pos);
            hitbox.userData.type = type;
            this.scene.add(hitbox);
            return hitbox;
        };

        loader.load('/models/living_room.glb', (gltf) => {
            const room = gltf.scene;
            room.position.set(0, 0, 0); 
            room.userData.type = "room";
            this.scene.add(room);
        });

        // 1. Laptop (Center-Left Table)
        loader.load('/models/laptop.glb', (gltf) => {
            const obj = gltf.scene;
            obj.position.set(-0.8, 0.8, -1.2);
            obj.scale.set(0.4, 0.4, 0.4);
            this.scene.add(obj);
            createHitbox([-0.8, 0.9, -1.2], [0.6, 0.3, 0.5], "laptop");
        });

        // 2. Desk Lamp (Far Right Corner)
        loader.load('/models/desk_lamp.glb', (gltf) => {
            const obj = gltf.scene;
            obj.position.set(1.2, 0.8, -1.0);
            obj.scale.set(0.12, 0.12, 0.12);
            this.scene.add(obj);
            createHitbox([1.2, 1.0, -1.0], [0.3, 0.5, 0.3], "lamp");
        });

        // 3. Phone (Near Center Table - Slightly Right)
        loader.load('/models/low_poly_mobile_phone.glb', (gltf) => {
            const obj = gltf.scene;
            obj.position.set(0.2, 0.8, -0.6);
            obj.scale.set(0.25, 0.25, 0.25);
            this.scene.add(obj);
            createHitbox([0.2, 0.85, -0.6], [0.3, 0.15, 0.4], "phone");
        });
    }

    setupControls() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateGaze(deltaTime) {
        const activeCamera = this.xrManager.getCamera();
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);

        // Position Gaze Cursor
        if (this.gazeCursor) {
            const cursorPos = camPos.clone().add(camDir.clone().multiplyScalar(1.0));
            this.gazeCursor.position.copy(cursorPos);
            this.gazeCursor.lookAt(camPos);
        }

        // Raycast for stare detection
        this.raycaster.set(camPos, camDir);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        const hit = intersects.find(i => {
            const type = i.object.userData.type;
            return type && type !== "room" && type !== "orb";
        });

        if (hit) {
            const type = hit.object.userData.type;
            
            // If gazing at same object
            if (this.gazeTarget === type) {
                if (!this.gazeTriggered) {
                    this.gazeTimer += deltaTime;
                    
                    // Visual feedback: Scale cursor based on progress
                    const scale = 1.0 + (this.gazeTimer / this.gazeThreshold) * 2.0;
                    this.gazeCursor.scale.set(scale, scale, scale);
                    this.gazeCursor.material.color.set(0x00ffff);

                    if (this.gazeTimer >= this.gazeThreshold) {
                        console.log(`[Gaze] Stare successful: ${type}`);
                        this.triggerAIReaction(type);
                        this.gazeTriggered = true;
                    }
                }
            } else {
                // New target
                this.gazeTarget = type;
                this.gazeTimer = 0;
                this.gazeTriggered = false;
            }
        } else {
            // Looking at nothing/room
            this.gazeTarget = null;
            this.gazeTimer = 0;
            this.gazeTriggered = false;
            this.gazeCursor.scale.set(1, 1, 1);
            this.gazeCursor.material.color.set(0xffffff);
        }
    }

    async triggerAIReaction(type) {
        if (this.aiCooldown > 0) return;
        this.aiCooldown = 6.0;

        console.log(`[AI] Reacting to stare on: ${type}`);
        this.orb.setColor(0xffaa00); 

        try {
            const prompt = `User is staring at the ${type}. React as Orbix. One short sentence.`;
            const response = await chatWithAI(prompt);
            
            this.orb.setColor(0x00ffff);
            speak(response);
            
            const screenPos = this.getOrbScreenPosition();
            this.chatUI.show(response, screenPos.x, screenPos.y);
        } catch (err) {
            console.error("[AI] Gaze reaction failed:", err);
            this.orb.setColor(0x00ffff);
        }
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

    render(time, frame) {
        const deltaTime = this.clock.getDelta();
        if (this.aiCooldown > 0) this.aiCooldown -= deltaTime;

        this.updateGaze(deltaTime);

        // Update Orb (Shoulder Follow)
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
            .add(new THREE.Vector3(0, 0.2, 0));

        const targetPos = camPos.clone().add(offset).add(this.orb.jitter);
        
        this.orb.group.position.lerp(targetPos, 2.0 * deltaTime);
        this.orb.group.lookAt(camPos);
        this.orb.update(deltaTime);

        const screenPos = this.getOrbScreenPosition();
        this.chatUI.updatePosition(screenPos.x, screenPos.y);

        this.renderer.render(this.scene, this.camera);
    }
}

new App();
