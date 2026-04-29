import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { XRManager } from './xr.js';
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

        this.raycaster = new THREE.Raycaster();
        this.chatUI = new ChatUI();
        this.aiCooldown = 0;
        this.aiModel = null;
        this.aiJitterTime = 0;
        
        this.setupLighting();
        this.setupReticle();
        
        this.xrManager = new XRManager(this.renderer, this.scene, this.camera, (e) => this.onSelect(e));
        
        this.loadModels();

        this.clock = new THREE.Clock();
        this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
        
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
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
            room.position.set(0, -1.6, 0); 
            this.scene.add(room);
        }, undefined, (e) => console.error('Could not load living_room.glb', e));

        // Load laptop
        loader.load('/models/laptop.glb', (gltf) => {
            console.log('[Assets] laptop.glb loaded.');
            const laptop = gltf.scene;
            laptop.position.set(0, -0.5, -2);
            laptop.scale.set(0.5, 0.5, 0.5);
            laptop.userData.type = "laptop";
            this.scene.add(laptop);
        }, undefined, (e) => console.error('Could not load laptop.glb', e));

        // Load desk lamp
        loader.load('/models/desk_lamp.glb', (gltf) => {
            const lamp = gltf.scene;
            lamp.position.set(0.5, -0.5, -2.2);
            lamp.scale.set(0.5, 0.5, 0.5);
            lamp.userData.type = "desk lamp";
            this.scene.add(lamp);
        }, undefined, (e) => console.warn('Could not load desk_lamp.glb', e));

        // Load phone
        loader.load('/models/low_poly_mobile_phone.glb', (gltf) => {
            const phone = gltf.scene;
            phone.position.set(-0.5, -0.5, -1.8);
            phone.scale.set(0.1, 0.1, 0.1);
            phone.userData.type = "phone";
            this.scene.add(phone);
        }, undefined, (e) => console.warn('Could not load phone.glb', e));

        this.setupAIPlaceholder();
    }

    setupAIPlaceholder() {
        // AI Character placeholder since we don't have a humanoid GLB
        this.aiModel = new THREE.Group();
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const headMat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.6;
        this.aiModel.add(head);

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.6);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.1;
        this.aiModel.add(body);

        this.aiModel.position.set(1, 0, -2);
        this.scene.add(this.aiModel);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onSelect(event) {
        if (this.reticle.visible) {
            // Can use reticle position for something, e.g., moving AI
            // this.aiModel.position.setFromMatrixPosition(this.reticle.matrix);
        }

        // Tap detection via raycaster
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
            this.triggerAIReaction(type);
        }
    }

    async triggerAIReaction(type) {
        if (this.aiCooldown > 0) return;
        this.aiCooldown = 8.0;

        const prompt = `User tapped on a ${type}. React to this as Orbix (strict AI companion). One short sentence.`;
        
        const response = await chatWithAI(prompt);
        speak(response);
        
        const screenPos = this.getAIScreenPosition();
        this.chatUI.show(response, screenPos.x, screenPos.y);
    }

    getAIScreenPosition() {
        const pos = new THREE.Vector3();
        if (this.aiModel) {
            this.aiModel.children[0].getWorldPosition(pos); // Head position
        }
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

        // Update AI Character (Follow & Idle animation)
        if (this.aiModel) {
            const activeCamera = this.xrManager.getCamera();
            const camPos = new THREE.Vector3();
            activeCamera.getWorldPosition(camPos);

            // Look at camera (ignore Y axis for natural turning)
            const targetPos = new THREE.Vector3(camPos.x, this.aiModel.position.y, camPos.z);
            this.aiModel.lookAt(targetPos);

            // Subtle follow (Lerp towards a point slightly right and front of user)
            const camDir = new THREE.Vector3();
            activeCamera.getWorldDirection(camDir);
            camDir.y = 0;
            camDir.normalize();

            const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
            
            // AI target position: 2m forward, 1m right
            // We use clone() to avoid modifying camDir
            const aiTarget = camPos.clone()
                .add(camDir.clone().multiplyScalar(2))
                .add(right.clone().multiplyScalar(1));
            
            // Preserve Y
            aiTarget.y = 0;

            this.aiModel.position.lerp(aiTarget, 0.5 * deltaTime);

            // Idle animation (breathing)
            this.aiJitterTime += deltaTime;
            this.aiModel.children[0].position.y = 1.6 + Math.sin(this.aiJitterTime * 2) * 0.02; // Head bob
            this.aiModel.children[1].scale.y = 1 + Math.sin(this.aiJitterTime * 2) * 0.05; // Body breathe
        }

        const screenPos = this.getAIScreenPosition();
        this.chatUI.updatePosition(screenPos.x, screenPos.y);

        this.renderer.render(this.scene, this.camera);
    }
}

new App();
