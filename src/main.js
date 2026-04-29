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
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);
    }

    setupReticle() {
        const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.reticle = new THREE.Mesh(geometry, material);
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add(this.reticle);
    }

    loadModels() {
        console.log('[Assets] Starting to load models...');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        // Load living room
        loader.load('/models/living_room.glb', (gltf) => {
            console.log('[Assets] living_room.glb loaded.');
            const room = gltf.scene;
            // Place room floor at y=0
            room.position.set(0, 0, 0); 
            this.scene.add(room);
        }, undefined, (e) => console.error('Could not load living_room.glb', e));

        // Load laptop
        loader.load('/models/laptop.glb', (gltf) => {
            console.log('[Assets] laptop.glb loaded.');
            const laptop = gltf.scene;
            // Place on table: assuming table height is ~0.8m
            laptop.position.set(0, 0.8, -1.5);
            laptop.scale.set(0.5, 0.5, 0.5);
            laptop.userData.type = "laptop";
            this.scene.add(laptop);
        }, undefined, (e) => console.error('Could not load laptop.glb', e));

        // Load desk lamp
        loader.load('/models/desk_lamp.glb', (gltf) => {
            const lamp = gltf.scene;
            lamp.position.set(0.6, 0.8, -1.6);
            lamp.scale.set(0.5, 0.5, 0.5);
            lamp.userData.type = "desk lamp";
            this.scene.add(lamp);
        }, undefined, (e) => console.warn('Could not load desk_lamp.glb', e));

        // Load phone
        loader.load('/models/low_poly_mobile_phone.glb', (gltf) => {
            const phone = gltf.scene;
            phone.position.set(-0.6, 0.8, -1.2);
            phone.scale.set(0.1, 0.1, 0.1);
            phone.userData.type = "phone";
            this.scene.add(phone);
        }, undefined, (e) => console.warn('Could not load phone.glb', e));
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
            let obj = i.object;
            while (obj) {
                if (obj.userData && obj.userData.type) return true;
                obj = obj.parent;
            }
            return false;
        });

        if (hit) {
            let obj = hit.object;
            let type = null;
            while (obj) {
                if (obj.userData && obj.userData.type) {
                    type = obj.userData.type;
                    break;
                }
                obj = obj.parent;
            }

            console.log(`[Interaction] User tapped on: ${type}`);
            if (type !== 'orb') {
                this.triggerAIReaction(type);
            }
        }
    }

    async triggerAIReaction(type) {
        if (this.aiCooldown > 0) return;
        this.aiCooldown = 8.0;

        console.log(`[AI] Reacting to: ${type}`);
        
        // VISUAL FEEDBACK START
        this.orb.setColor(0xffaa00); 

        // USER GESTURE UNLOCK
        // We speak a tiny silent space to "hold" the user gesture 
        // through the async fetch call.
        const silentUtterance = new SpeechSynthesisUtterance(" ");
        window.speechSynthesis.speak(silentUtterance);

        const prompt = `User interacted with a ${type}. React to this as Orbix (strict blue orb AI companion). One short sentence.`;
        
        try {
            const response = await chatWithAI(prompt);
            console.log(`[AI] Response: ${response}`);
            
            // VISUAL FEEDBACK END
            this.orb.setColor(0x00ffff);
            
            speak(response);
            
            const screenPos = this.getOrbScreenPosition();
            this.chatUI.show(response, screenPos.x, screenPos.y);
        } catch (err) {
            console.error("[AI] Error:", err);
            this.orb.setColor(0x00ffff);
            speak("My connection is unstable.");
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

        // Update Reticle
        if (frame) {
            const hitPose = this.xrManager.updateHitTest(frame);
            if (hitPose) {
                this.reticle.visible = true;
                this.reticle.matrix.fromArray(hitPose.transform.matrix);
            } else {
                this.reticle.visible = false;
            }
        }

        // Update Orb (Shoulder Follow)
        const activeCamera = this.xrManager.getCamera();
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        const camRight = new THREE.Vector3();
        const camUp = new THREE.Vector3(0, 1, 0);
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);
        camRight.crossVectors(camDir, camUp).normalize();
        
        // Positioning inside the room: slightly forward, right, and at eye level
        const offset = camDir.clone().multiplyScalar(this.orb.targetDistance)
            .add(camRight.multiplyScalar(0.8))
            .add(new THREE.Vector3(0, 0.2, 0)); // Slightly above eye level

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
