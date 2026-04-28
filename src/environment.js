import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.setup();
    }

    setup() {
        // 1. Background and Fog
        this.scene.background = new THREE.Color(0x050508);
        this.scene.fog = new THREE.Fog(0x050508, 1, 15);

        // 2. Ground Plane
        const groundGeo = new THREE.PlaneGeometry(50, 50);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x111115, 
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.6; // Assuming user height is ~1.6m
        this.scene.add(ground);

        // 3. Simple Grid on Ground
        const grid = new THREE.GridHelper(50, 50, 0x444455, 0x222233);
        grid.position.y = -1.59;
        this.scene.add(grid);

        // 4. Decorative Primitives (Pillars & Floating Cubes)
        this.createDecorations();
    }

    createDecorations() {
        const pillarGeo = new THREE.BoxGeometry(0.5, 4, 0.5);
        const cubeGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshStandardMaterial({ color: 0x222233 });

        for (let i = 0; i < 12; i++) {
            // Pillars at a distance
            const angle = (i / 12) * Math.PI * 2;
            const radius = 6 + Math.random() * 2;
            
            const pillar = new THREE.Mesh(pillarGeo, material);
            pillar.position.set(Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius);
            pillar.userData.type = "pillar"; // Mark for detection
            this.scene.add(pillar);

            // Floating Cubes
            const cube = new THREE.Mesh(cubeGeo, material.clone());
            cube.position.set(
                (Math.random() - 0.5) * 10,
                Math.random() * 2,
                (Math.random() - 0.5) * 10
            );
            cube.userData.rotationSpeed = Math.random() * 0.02;
            this.elements.push(cube);
            this.scene.add(cube);
        }
    }

    update(time) {
        this.elements.forEach(el => {
            el.rotation.x += el.userData.rotationSpeed;
            el.rotation.y += el.userData.rotationSpeed;
            el.position.y += Math.sin(time + el.position.x) * 0.001;
        });
    }
}
