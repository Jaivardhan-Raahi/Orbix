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
        
        // --- Camera Rig ---
        this.cameraRig = new THREE.Group();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        this.cameraRig.add(this.camera);
        this.scene.add(this.cameraRig);
        
        // Initial Position
        this.cameraRig.position.set(0, 0, 1.2); 
        this.targetPosition = this.cameraRig.position.clone();
        
        // --- Optimized Renderer ---
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance" 
        });
        this.renderer.shadowMap.enabled = false;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.raycaster = new THREE.Raycaster();
        this.chatUI = new ChatUI();
        
        // Gaze State
        this.aiCooldown = 0;
        this.gazeTarget = null;
        this.gazeTimer = 0;
        this.gazeThreshold = 1.5;
        this.gazeTriggered = false;

        // --- Proactive Interaction ---
        this.idleTimer = 0;
        this.idleThreshold = 20.0; 

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

        if (consoleDiv.childNodes.length > 50) {
            consoleDiv.removeChild(consoleDiv.firstChild);
        }
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        this.scene.add(dirLight);
    }

    setupGazeCursor() {
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
            console.log("[Assets] scene.glb loaded.");

            model.traverse((node) => {
                if (node.isMesh) {
                    const name = node.name.toLowerCase();
                    // Tag meaningful objects
                    if (name.includes('laptop')) node.userData.type = 'laptop';
                    else if (name.includes('phone') || name.includes('mobile')) node.userData.type = 'phone';
                    else if (name.includes('lamp')) node.userData.type = 'lamp';
                    else if (name.includes('desk') || name.includes('table')) node.userData.type = 'desk';
                    else if (name.includes('book')) node.userData.type = 'book';
                    else if (name.includes('floor')) node.userData.type = 'floor';
                    
                    if (node.userData.type) {
                        console.log(`[Assets] Tagged ${node.name} as ${node.userData.type}`);
                    }
                }
            });
        });
    }

    setupControls() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        window.addEventListener('keydown', (e) => {
            const step = 0.5;
            if (e.key === 'w') this.targetPosition.z -= step;
            if (e.key === 's') this.targetPosition.z += step;
            if (e.key === 'a') this.targetPosition.x -= step;
            if (e.key === 'd') this.targetPosition.x += step;
        });
    }

    handleXRSelect(event) {
        initVoice(); 
        
        const controller = event.target;
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        const floorHit = intersects.find(i => i.object.userData.type === 'floor');
        
        if (floorHit) {
            this.targetPosition.copy(floorHit.point);
            this.targetPosition.y = 0; 
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
        
        // --- Debug Log names of top hits ---
        if (intersects.length > 0 && Math.random() < 0.01) {
            console.log(`[Gaze] Seeing: ${intersects.slice(0, 2).map(i => i.object.name).join(", ")}`);
        }

        const hit = intersects.find(i => i.object.userData.type && i.object.userData.type !== "orb" && i.object.userData.type !== "floor");

        if (hit) {
            const type = hit.object.userData.type;
            if (this.gazeTarget === type) {
                if (!this.gazeTriggered) {
                    this.gazeTimer += deltaTime;
                    console.log(`[Gaze] Focus on ${type}: ${this.gazeTimer.toFixed(1)}s`);
                    
                    const scale = 1.0 + (this.gazeTimer / this.gazeThreshold) * 2.0;
                    this.gazeCursor.scale.set(scale, scale, scale);
                    this.gazeCursor.material.color.set(0x00ffff);

                    if (this.gazeTimer >= this.gazeThreshold) {
                        this.triggerAIReaction(type);
                        this.gazeTriggered = true;
                    }
                }
            } else {
                this.gazeTarget = type;
                this.gazeTimer = 0;
                this.gazeTriggered = false;
            }
        } else {
            this.gazeTarget = null;
            this.gazeTimer = 0;
            this.gazeTriggered = false;
            this.gazeCursor.scale.set(1, 1, 1);
            this.gazeCursor.material.color.set(0xff0000); 
        }
    }

    async triggerAIReaction(type) {
        if (this.aiCooldown > 0) return;
        this.aiCooldown = 5.0;
        this.idleTimer = 0; 

        console.log(`[AI] Reacting to ${type}...`);
        interrupt(); 
        this.orb.setState(OrbState.THINKING); 

        try {
            const prompt = `User is staring at the ${type}. React as Orbix. One short sentence.`;
            const response = await chatWithAI(prompt);
            
            this.orb.setState(OrbState.SPEAKING);
            this.chatUI.show(response);
            
            speak(response).then(() => {
                if (this.orb.currentState === OrbState.SPEAKING) {
                    this.orb.setState(OrbState.IDLE);
                }
            });

        } catch (err) {
            console.error("[AI] Error:", err);
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
        const elapsedTime = this.clock.getElapsedTime();
        if (this.aiCooldown > 0) this.aiCooldown -= deltaTime;

        // --- Proactive Interaction ---
        this.idleTimer += deltaTime;
        if (this.idleTimer > this.idleThreshold) {
            this.idleTimer = 0;
            this.triggerProactiveComment();
        }

        // --- Movement ---
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
        
        const offset = camDir.clone().multiplyScalar(this.orb.targetDistance)
            .add(camRight.multiplyScalar(0.8))
            .add(new THREE.Vector3(0, 0.2, 0));

        const targetOrbPos = camPos.clone().add(offset).add(this.orb.jitter);
        this.orb.group.position.lerp(targetOrbPos, 3.0 * deltaTime);
        this.orb.group.lookAt(camPos);
        this.orb.update(deltaTime);

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
            const prompt = "The user has been quiet. Say something to encourage them to stay focused. One short sentence.";
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
