import * as THREE from 'three';

export const OrbState = {
    IDLE: 'idle',
    THINKING: 'thinking',
    SPEAKING: 'speaking',
    INTERVENE: 'intervene'
};

export class Orb {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        
        // Colors for states
        this.colors = {
            [OrbState.IDLE]: new THREE.Color(0x00ffff),
            [OrbState.THINKING]: new THREE.Color(0xffaa00),
            [OrbState.SPEAKING]: new THREE.Color(0xffffff),
            [OrbState.INTERVENE]: new THREE.Color(0xff0055)
        };

        this.currentState = OrbState.IDLE;
        this.targetColor = this.colors[OrbState.IDLE].clone();
        this.currentColor = this.colors[OrbState.IDLE].clone();
        
        this.mesh = this.createMesh();
        this.glow = this.createGlow();
        
        this.group.add(this.mesh);
        this.group.add(this.glow);
        this.scene.add(this.group);
        
        this.mesh.userData.type = "orb";

        this.time = 0;
        this.baseScale = 1.0;
        this.pulseFrequency = 2.0;
        this.pulseIntensity = 0.05;

        // Locomotion/Interaction properties
        this.targetDistance = 1.5;
        this.jitter = new THREE.Vector3();
        this.jitterTimer = 0;
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(0.12, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color: this.colors[OrbState.IDLE],
            emissive: this.colors[OrbState.IDLE],
            emissiveIntensity: 1,
            roughness: 0.1,
            metalness: 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        const light = new THREE.PointLight(0x00ffff, 1, 2);
        mesh.add(light);
        
        return mesh;
    }

    createGlow() {
        const geometry = new THREE.SphereGeometry(0.15, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            color: this.colors[OrbState.IDLE],
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        
        return new THREE.Mesh(geometry, material);
    }

    setState(state) {
        if (this.currentState === state) return;
        console.log(`[Orb] State Change: ${this.currentState} -> ${state}`);
        this.currentState = state;
        this.targetColor.copy(this.colors[state]);

        // Adjust pulse parameters based on state
        switch (state) {
            case OrbState.THINKING:
                this.pulseFrequency = 6.0;
                this.pulseIntensity = 0.1;
                break;
            case OrbState.SPEAKING:
                this.pulseFrequency = 4.0;
                this.pulseIntensity = 0.08;
                break;
            case OrbState.INTERVENE:
                this.pulseFrequency = 10.0;
                this.pulseIntensity = 0.15;
                break;
            default: // IDLE
                this.pulseFrequency = 2.0;
                this.pulseIntensity = 0.05;
        }
    }

    update(deltaTime) {
        this.time += deltaTime;
        
        // 1. Smooth Color Transition (LERP)
        this.currentColor.lerp(this.targetColor, 5 * deltaTime);
        this.mesh.material.color.copy(this.currentColor);
        this.mesh.material.emissive.copy(this.currentColor);
        this.glow.material.color.copy(this.currentColor);

        // 2. Pulsing Animation (Scale)
        const pulse = 1.0 + Math.sin(this.time * this.pulseFrequency) * this.pulseIntensity;
        const targetScale = this.currentState === OrbState.SPEAKING ? 1.2 : 1.0;
        const currentScale = THREE.MathUtils.lerp(this.group.scale.x, targetScale * pulse, 5 * deltaTime);
        this.group.scale.set(currentScale, currentScale, currentScale);
        
        // 3. Autonomous Jitter
        this.jitterTimer += deltaTime;
        if (this.jitterTimer > 3.0) {
            const range = this.currentState === OrbState.INTERVENE ? 0.4 : 0.2;
            this.jitter.set(
                (Math.random() - 0.5) * range,
                (Math.random() - 0.5) * range,
                (Math.random() - 0.5) * range
            );
            this.jitterTimer = 0;
        }

        // 4. Floating Animation
        const floatFreq = this.currentState === OrbState.THINKING ? 3.0 : 1.5;
        this.group.position.y += Math.sin(this.time * floatFreq) * 0.0005;

        // 5. Dynamic Glow Pulse
        const glowBase = this.currentState === OrbState.SPEAKING ? 0.3 : 0.15;
        this.glow.material.opacity = glowBase + Math.sin(this.time * 4) * 0.05;
    }
    
    setDistance(d) {
        this.targetDistance = THREE.MathUtils.clamp(d, 0.5, 4.0);
    }
}
