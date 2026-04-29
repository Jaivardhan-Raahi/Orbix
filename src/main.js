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
        this.setupReticle();
        
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

    setupReticle() {
        const geometry = new THREE.RingGeometry(0.1, 0.15, 32).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.reticle = new THREE.Mesh(geometry, material);
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
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
            console.log('[Assets] room loaded.');
            const room = gltf.scene;
            room.position.set(0, 0, 0); 
            room.userData.type = "room";
            this.scene.add(room);
        });

        // 1. Laptop (On the Table - Closer)
        loader.load('/models/laptop.glb', (gltf) => {
            const obj = gltf.scene;
            obj.position.set(0, 0.8, -0.8);
            obj.scale.set(0.4, 0.4, 0.4);
            this.scene.add(obj);
            // Large hitbox: easy to tap
            createHitbox([0, 0.9, -0.8], [0.8, 0.5, 0.6], "laptop");
        });

        // 2. Desk Lamp (Small & Realistic)
        loader.load('/models/desk_lamp.glb', (gltf) => {
            const obj = gltf.scene;
            obj.position.set(0.4, 0.8, -0.9);
            obj.scale.set(0.12, 0.12, 0.12);
            this.scene.add(obj);
            createHitbox([0.4, 1.0, -0.9], [0.4, 0.6, 0.4], "lamp");
        });

        // 3. Phone (Closer)
        loader.load('/models/low_poly_mobile_phone.glb', (gltf) => {
            const obj = gltf.scene;
            obj.position.set(-0.4, 0.8, -0.7);
            obj.scale.set(0.08, 0.08, 0.08);
            this.scene.add(obj);
            createHitbox([-0.4, 0.9, -0.7], [0.3, 0.2, 0.4], "phone");
        });
    }

    setupControls() {
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        window.addEventListener('pointerdown', (e) => {
            console.log("[Interaction] Global tap detected.");
            
            // PROOF OF LIFE: This happens IMMEDIATELY on any tap
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
        console.log("[Interaction] Running raycast check...");
        
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
            console.log(`[Interaction] HIT HITBOX: ${type}`);
            this.triggerAIReaction(type);
        } else {
            console.log("[Interaction] Ray missed all targets.");
        }
    }

    async triggerAIReaction(type) {
        if (this.aiCooldown > 0) return;
        this.aiCooldown = 8.0;

        console.log(`[AI] Processing reaction for: ${type}`);
        this.orb.setColor(0xffaa00); 

        try {
            const prompt = `User interacted with a ${type}. React as Orbix. One short sentence.`;
            const response = await chatWithAI(prompt);
            
            console.log(`[AI] Response: "${response}"`);
            this.orb.setColor(0x00ffff);
            speak(response);
            
            const screenPos = this.getOrbScreenPosition();
            this.chatUI.show(response, screenPos.x, screenPos.y);
        } catch (err) {
            console.error("[AI] Error:", err);
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

        if (frame) {
            const hitPose = this.xrManager.updateHitTest(frame);
            if (hitPose) {
                this.reticle.visible = true;
                this.reticle.matrix.fromArray(hitPose.transform.matrix);
            } else {
                this.reticle.visible = false;
            }
        }

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
