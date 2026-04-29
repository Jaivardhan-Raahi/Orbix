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
        this.aiCooldown = 0;
        
        this.setupLighting();
        this.setupGazeCursor();
        
        this.xrManager = new XRManager(this.renderer, this.scene, this.camera, (e) => this.onSelect(e));
        this.orb = new Orb(this.scene);
        
        this.loadModels();

        this.clock = new THREE.Clock();
        this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
        
        this.setupControls();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);
    }

    setupGazeCursor() {
        // A small 3D ring that follows the camera's center of gaze
        const geometry = new THREE.RingGeometry(0.015, 0.02, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.8,
            depthTest: false // Ensure it's always visible on top
        });
        this.gazeCursor = new THREE.Mesh(geometry, material);
        this.gazeCursor.renderOrder = 999;
        this.scene.add(this.gazeCursor);
    }

    loadModels() {
        console.log('[Assets] Loading optimized interior setup...');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        const createHitbox = (pos, size, type) => {
            const geo = new THREE.BoxGeometry(...size);
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0x00ff00, 
                visible: false // Change to true to debug hitboxes
            });
            const hitbox = new THREE.Mesh(geo, mat);
            hitbox.position.set(...pos);
            hitbox.userData.type = type;
            this.scene.add(hitbox);
            return hitbox;
        };

        // Load living room
        loader.load('/models/living_room.glb', (gltf) => {
            const room = gltf.scene;
            room.position.set(0, 0, 0); 
            room.userData.type = "room";
            this.scene.add(room);
        });

        // 1. Laptop (Closer, distinct hitbox)
        loader.load('/models/laptop.glb', (gltf) => {
            const obj = gltf.scene;
            obj.position.set(0.1, 0.8, -0.8);
            obj.scale.set(0.4, 0.4, 0.4);
            this.scene.add(obj);
            createHitbox([0.1, 0.9, -0.8], [0.6, 0.4, 0.5], "laptop");
        });

        // 2. Desk Lamp (Small)
        loader.load('/models/desk_lamp.glb', (gltf) => {
            const obj = gltf.scene;
            obj.position.set(0.5, 0.8, -0.9);
            obj.scale.set(0.12, 0.12, 0.12);
            this.scene.add(obj);
            createHitbox([0.5, 1.0, -0.9], [0.3, 0.5, 0.3], "lamp");
        });

        // 3. Phone (Scaled UP, moved to avoid laptop hitbox)
        loader.load('/models/low_poly_mobile_phone.glb', (gltf) => {
            const obj = gltf.scene;
            obj.position.set(-0.5, 0.8, -0.8);
            obj.scale.set(0.2, 0.2, 0.2); // Increased scale
            this.scene.add(obj);
            createHitbox([-0.5, 0.9, -0.8], [0.4, 0.2, 0.4], "phone");
        });
    }

    setupControls() {
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        window.addEventListener('pointerdown', (e) => {
            console.log("[Interaction] Global tap detected.");
            if (this.orb) {
                this.orb.setColor(0xffffff);
                setTimeout(() => this.orb.setColor(0x00ffff), 200);
            }
            this.onSelect(e);
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onSelect(event) {
        const activeCamera = this.xrManager.getCamera();
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);
        
        this.raycaster.set(camPos, camDir);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        const hit = intersects.find(i => {
            const type = i.object.userData.type;
            return type && type !== "room" && type !== "orb";
        });

        if (hit) {
            const type = hit.object.userData.type;
            console.log(`[Interaction] Tapped on: ${type}`);
            this.triggerAIReaction(type);
        }
    }

    async triggerAIReaction(type) {
        if (this.aiCooldown > 0) return;
        this.aiCooldown = 8.0;

        this.orb.setColor(0xffaa00); 
        try {
            const prompt = `User interacted with a ${type}. React as Orbix. One short sentence.`;
            const response = await chatWithAI(prompt);
            this.orb.setColor(0x00ffff);
            speak(response);
            
            const screenPos = this.getOrbScreenPosition();
            this.chatUI.show(response, screenPos.x, screenPos.y);
        } catch (err) {
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

        const activeCamera = this.xrManager.getCamera();
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);

        // Update Gaze Cursor position
        if (this.gazeCursor) {
            const cursorDist = 1.0; // Distance in front of camera
            const cursorPos = camPos.clone().add(camDir.clone().multiplyScalar(cursorDist));
            this.gazeCursor.position.copy(cursorPos);
            this.gazeCursor.lookAt(camPos);
            
            // Check for hover
            this.raycaster.set(camPos, camDir);
            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            const hover = intersects.find(i => i.object.userData.type && i.object.userData.type !== "room");
            
            if (hover) {
                this.gazeCursor.scale.set(2, 2, 2);
                this.gazeCursor.material.color.set(0x00ffff);
            } else {
                this.gazeCursor.scale.set(1, 1, 1);
                this.gazeCursor.material.color.set(0xffffff);
            }
        }

        // Update Orb (Shoulder Follow)
        const camRight = new THREE.Vector3();
        const camUp = new THREE.Vector3(0, 1, 0);
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
