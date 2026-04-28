import * as THREE from 'three';

export class Orb {
    constructor(scene) {
        this.scene = scene;
        this.mesh = this.createMesh();
        this.scene.add(this.mesh);
        
        this.baseY = 0;
        this.floatAmplitude = 0.05;
        this.floatSpeed = 1.5;
        this.time = 0;
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(0.1, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        
        const orb = new THREE.Mesh(geometry, material);
        orb.position.set(0, 0, -0.5); // Initial position in front
        return orb;
    }

    update(deltaTime) {
        this.time += deltaTime;
        
        // Idle floating animation
        this.mesh.position.y = this.baseY + Math.sin(this.time * this.floatSpeed) * this.floatAmplitude;
        
        // Pulse effect
        const pulse = 0.5 + Math.sin(this.time * 2.0) * 0.2;
        this.mesh.material.emissiveIntensity = pulse;
    }
    
    setColor(hex) {
        this.mesh.material.color.setHex(hex);
        this.mesh.material.emissive.setHex(hex);
    }
}
