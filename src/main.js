import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { XRManager } from './xr.js';
import { Orb, OrbState } from './orb.js';
import { chatWithAI } from './ai.js';
import { speak, interrupt, initVoice } from './voice.js';
import { ChatUI } from './ui.js';

class App {
    constructor() {
        this.initMobileConsole();
        console.log("[App] Starting Orbix...");
        
        this.scene = new THREE.Scene();
        
        // --- Phase 4: Camera Rig ---
        this.cameraRig = new THREE.Group();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.cameraRig.add(this.camera);
        this.scene.add(this.cameraRig);
        
        // Initial Position
        this.cameraRig.position.set(0, 0, 1.2); 
        this.targetPosition = this.cameraRig.position.clone();
        
        // --- Phase 5: Performance Optimized Renderer ---
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance" 
        });
        this.renderer.shadowMap.enabled = false; // Disable shadows for performance
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.raycaster = new THREE.Raycaster();
        this.chatUI = new ChatUI();
        
        // Gaze State
        this.aiCooldown = 0;
        this.gazeTarget = null;
        this.gazeTimer = 0;
        this.gazeThreshold = 1.5; // Slightly faster trigger
        this.gazeTriggered = false;

        // --- Proactive Interaction ---
        this.idleTimer = 0;
        this.idleThreshold = 20.0; // 20 seconds of no interaction triggers intervention

        this.setupLighting();
        this.setupGazeCursor();
        
        // Initialize systems
        this.xrManager = new XRManager(this.renderer, this.scene, this.camera, (e) => this.handleXRSelect(e));
        this.orb = new Orb(this.scene);
        
        this.loadModels();

        this.clock = new THREE.Clock();
        this.renderer.setAnimationLoop((time, frame) => this.render(time, frame));
        
        this.setupControls();
    }

    setupLighting() {
        // Optimized Lighting: 1 Ambient + 1 Directional
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);
    }

    setupGazeCursor() {
        // Larger, more visible red reticle for XR
        const geometry = new THREE.RingGeometry(0.02, 0.03, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 1.0,
            depthTest: false,
            depthWrite: false
        });
        this.gazeCursor = new THREE.Mesh(geometry, material);
        this.gazeCursor.renderOrder = 9999;
        this.scene.add(this.gazeCursor);
    }

    loadModels() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        loader.load('/models/scene.glb', (gltf) => {
            const model = gltf.scene;
            this.scene.add(model);
            model.traverse((node) => {
                if (node.isMesh) {
                    const name = node.name.toLowerCase();
                    if (name.includes('laptop')) node.userData.type = 'laptop';
                    else if (name.includes('phone') || name.includes('mobile')) node.userData.type = 'phone';
                    else if (name.includes('lamp')) node.userData.type = 'lamp';
                    else if (name.includes('desk') || name.includes('table')) node.userData.type = 'desk';
                    else if (name.includes('book')) node.userData.type = 'book';
                    else if (name.includes('floor')) node.userData.type = 'floor';
                }
            class App {
                constructor() {
                    this.initMobileConsole();
            ...
                setupControls() {
                    window.addEventListener('resize', () => this.onWindowResize());

                    // Keyboard Movement (Desktop)
                    window.addEventListener('keydown', (e) => {
                        const step = 0.5;
                        if (e.key === 'w') this.targetPosition.z -= step;
                        if (e.key === 's') this.targetPosition.z += step;
                        if (e.key === 'a') this.targetPosition.x -= step;
                        if (e.key === 'd') this.targetPosition.x += step;
                    });
                }

                initMobileConsole() {
                    const consoleDiv = document.getElementById('debug-console');
                    if (!consoleDiv) return;

                    consoleDiv.style.display = 'block';

                    const originalLog = console.log;
                    const originalError = console.error;

                    console.log = (...args) => {
                        originalLog.apply(console, args);
                        this.appendToConsole(args, '#00ff00');
                    };

                    console.error = (...args) => {
                        originalError.apply(console, args);
                        this.appendToConsole(args, '#ff4444');
                    };

                    window.onerror = (msg, url, line) => {
                        this.appendToConsole([`Error: ${msg} at ${line}`], '#ff0000');
                    };
                }

                appendToConsole(args, color) {
                    const consoleDiv = document.getElementById('debug-console');
                    if (!consoleDiv) return;

                    const p = document.createElement('div');
                    p.style.color = color;
                    p.style.marginBottom = '2px';
                    p.textContent = args.map(arg => 
                        typeof arg === 'object' ? JSON.stringify(arg) : arg
                    ).join(' ');

                    consoleDiv.appendChild(p);
                    consoleDiv.scrollTop = consoleDiv.scrollHeight;

                    // Keep only last 50 logs
                    if (consoleDiv.childNodes.length > 50) {
                        consoleDiv.removeChild(consoleDiv.firstChild);
                    }
                }

                handleXRSelect(event) {
        initVoice(); // Interaction required to start AudioContext
        
        // Simple click-to-move for floor
        const controller = event.target;
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const floorHit = intersects.find(i => i.object.userData.type === 'floor');
        
        if (floorHit) {
            this.targetPosition.copy(floorHit.point);
            this.targetPosition.y = 0; // Keep on ground
        }
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

        if (this.gazeCursor) {
            const cursorPos = camPos.clone().add(camDir.clone().multiplyScalar(1.5));
            this.gazeCursor.position.copy(cursorPos);
            this.gazeCursor.lookAt(camPos);
        }

        this.raycaster.set(camPos, camDir);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        
        // Find the first meaningful object that isn't the floor or the orb
        const hit = intersects.find(i => i.object.userData.type && i.object.userData.type !== "orb" && i.object.userData.type !== "floor");

        if (hit) {
            const type = hit.object.userData.type;
            if (this.gazeTarget === type) {
                if (!this.gazeTriggered) {
                    this.gazeTimer += deltaTime;
                    console.log(`[Gaze] Focusing on ${type}: ${this.gazeTimer.toFixed(2)}s / ${this.gazeThreshold}s`);
                    
                    const scale = 1.0 + (this.gazeTimer / this.gazeThreshold) * 2.0;
                    this.gazeCursor.scale.set(scale, scale, scale);
                    this.gazeCursor.material.color.set(0x00ffff);

                    if (this.gazeTimer >= this.gazeThreshold) {
                        console.log(`[Gaze] Triggering reaction for ${type}`);
                        this.triggerAIReaction(type);
                        this.gazeTriggered = true;
                    }
                }
            } else {
                console.log(`[Gaze] Target changed to: ${type}`);
                this.gazeTarget = type;
                this.gazeTimer = 0;
                this.gazeTriggered = false;
            }
        } else {
            if (this.gazeTarget) console.log(`[Gaze] Lost focus on ${this.gazeTarget}`);
            this.gazeTarget = null;
            this.gazeTimer = 0;
            this.gazeTriggered = false;
            this.gazeCursor.scale.set(1, 1, 1);
            this.gazeCursor.material.color.set(0xff0000); // Reset to Red
        }
    }

    async triggerAIReaction(type) {
        if (this.aiCooldown > 0) {
            console.log(`[AI] Cooldown active: ${this.aiCooldown.toFixed(1)}s remaining`);
            return;
        }
        this.aiCooldown = 5.0;
        this.idleTimer = 0; // Reset idle timer on active interaction

        console.log(`[AI] Starting reaction for ${type}...`);
        interrupt(); 
        this.orb.setState(OrbState.THINKING); 

        try {
            const prompt = `User is staring at the ${type}. React as Orbix. One short sentence.`;
            const response = await chatWithAI(prompt);
            console.log(`[AI] Response received: "${response}"`);
            
            this.orb.setState(OrbState.SPEAKING);
            this.chatUI.show(response);
            
            console.log(`[AI] Requesting speech for: "${response}"`);
            speak(response).then(() => {
                console.log(`[AI] Speech finished for: "${response}"`);
                if (this.orb.currentState === OrbState.SPEAKING) {
                    this.orb.setState(OrbState.IDLE);
                }
            }).catch(err => {
                console.error(`[AI] Speech failed:`, err);
                this.orb.setState(OrbState.IDLE);
            });

        } catch (err) {
            console.error("[AI] Interaction error:", err);
            this.orb.setState(OrbState.IDLE);
        }
    }

    getOrbScreenPosition() {
        const pos = new THREE.Vector3();
        this.orb.group.getWorldPosition(pos);
        pos.project(this.xrManager.getCamera());

        return {
            x: (pos.x * 0.5 + 0.5) * window.innerWidth,
            y: (pos.y * -0.5 + 0.5) * window.innerHeight
        };
    }

    render(time, frame) {
        const deltaTime = this.clock.getDelta();
        if (this.aiCooldown > 0) this.aiCooldown -= deltaTime;

        // --- Proactive Interaction Logic ---
        this.idleTimer += deltaTime;
        if (this.idleTimer > this.idleThreshold) {
            this.idleTimer = 0;
            this.triggerProactiveComment();
        }

        // --- Smooth Movement Damping ---
        this.cameraRig.position.lerp(this.targetPosition, 4 * deltaTime);

        this.updateGaze(deltaTime);

        const activeCamera = this.xrManager.getCamera();
        const camPos = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        const camRight = new THREE.Vector3();
        const camUp = new THREE.Vector3(0, 1, 0);
        
        activeCamera.getWorldPosition(camPos);
        activeCamera.getWorldDirection(camDir);
        camRight.crossVectors(camDir, camUp).normalize();
        
        // Smooth Orb Following
        const offset = camDir.clone().multiplyScalar(this.orb.targetDistance)
            .add(camRight.multiplyScalar(0.8))
            .add(new THREE.Vector3(0, 0.2, 0));

        const targetOrbPos = camPos.clone().add(offset).add(this.orb.jitter);
        this.orb.group.position.lerp(targetOrbPos, 3.0 * deltaTime);
        this.orb.group.lookAt(camPos);
        this.orb.update(deltaTime);

        // Update UI Position every frame (Translate3D)
        if (this.chatUI.isVisible) {
            const screenPos = this.getOrbScreenPosition();
            this.chatUI.updatePosition(screenPos.x, screenPos.y);
        }

        this.renderer.render(this.scene, this.camera);
    }

    async triggerProactiveComment() {
        if (this.aiCooldown > 0) return;
        this.aiCooldown = 10.0;
        
        interrupt();
        this.orb.setState(OrbState.INTERVENE);
        
        try {
            const prompt = "The user has been quiet. Say something to encourage them to stay focused on their studies. One short sentence.";
            const response = await chatWithAI(prompt);
            
            this.orb.setState(OrbState.SPEAKING);
            this.chatUI.show(response);
            speak(response).then(() => {
                if (this.orb.currentState === OrbState.SPEAKING) {
                    this.orb.setState(OrbState.IDLE);
                }
            });
        } catch (err) {
            this.orb.setState(OrbState.IDLE);
        }
    }
}

new App();
