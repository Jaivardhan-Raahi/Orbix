import * as THREE from 'three';

export class Orb {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        
        this.mesh = this.createMesh();
        this.glow = this.createGlow();
        
        this.group.add(this.mesh);
        this.group.add(this.glow);
        this.scene.add(this.group);
        
        this.mesh.userData.type = "orb"; // Allow self-detection

        this.time = 0;
        this.baseScale = 1.0;
        this.pulseFrequency = 2.0;
        this.pulseIntensity = 0.05;

        // Interaction state
        this.targetDistance = 1.5;
        this.jitter = new THREE.Vector3();
        this.jitterTimer = 0;
        this.isBeingLookedAt = false;
        this.lookAtTimer = 0;
    }

    createMesh() {
        // High resolution sphere
        const geometry = new THREE.SphereGeometry(0.12, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 1,
            roughness: 0.1,
            metalness: 0.5
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // Internal light for depth
        const light = new THREE.PointLight(0x00ffff, 1, 2);
        mesh.add(light);
        
        return mesh;
    }

    createGlow() {
        // Slightly larger sphere for halo effect
        const geometry = new THREE.SphereGeometry(0.15, 64, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide // Glow appears behind/around
        });
        
        return new THREE.Mesh(geometry, material);
    }

    update(deltaTime) {
        this.time += deltaTime;
        
        // 1. Pulsing Animation (Scale)
        const pulse = 1.0 + Math.sin(this.time * this.pulseFrequency) * this.pulseIntensity;
        this.group.scale.set(pulse, pulse, pulse);
        
        // 2. Autonomous Jitter (Move slightly on its own)
        this.jitterTimer += deltaTime;
        if (this.jitterTimer > 3.0) {
            this.jitter.set(
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2,
                (Math.random() - 0.5) * 0.2
            );
            this.jitterTimer = 0;
        }

        // 3. Floating Animation
        this.group.position.y += Math.sin(this.time * 1.5) * 0.0005;

        // 4. Dynamic Glow Pulse
        this.glow.material.opacity = 0.15 + Math.sin(this.time * 4) * 0.05;
    }
    
    setDistance(d) {
        this.targetDistance = THREE.MathUtils.clamp(d, 0.5, 4.0);
    }

    setColor(hex) {
        this.mesh.material.color.setHex(hex);
        this.mesh.material.emissive.setHex(hex);
        this.glow.material.color.setHex(hex);
    }
}
