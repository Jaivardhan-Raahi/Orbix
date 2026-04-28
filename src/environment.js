import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.setup();
    }

    setup() {
        this.scene.background = new THREE.Color(0x050508);
        this.scene.fog = new THREE.Fog(0x050508, 1, 15);

        // Ground
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(50, 50),
            new THREE.MeshStandardMaterial({ color: 0x111115 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.6;
        this.scene.add(ground);

        // Grid
        const grid = new THREE.GridHelper(50, 50, 0x444455, 0x222233);
        grid.position.y = -1.59;
        this.scene.add(grid);

        this.createMeaningfulObjects();
    }

    createMeaningfulObjects() {
        // Simple helper to create objects with types
        const createObj = (geo, color, pos, type) => {
            const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color }));
            mesh.position.set(...pos);
            mesh.userData.type = type;
            this.scene.add(mesh);
            return mesh;
        };

        // 1. Desk (a wider box)
        createObj(new THREE.BoxGeometry(2, 0.1, 1), 0x332211, [0, -0.6, -3], "desk");

        // 2. Laptop (on the desk)
        createObj(new THREE.BoxGeometry(0.4, 0.05, 0.3), 0x555555, [0, -0.52, -3.1], "laptop");

        // 3. Book (on the desk)
        createObj(new THREE.BoxGeometry(0.2, 0.08, 0.25), 0xaa2222, [0.5, -0.52, -2.8], "book");

        // 4. Pillars (background elements)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 7;
            createObj(new THREE.BoxGeometry(0.5, 4, 0.5), 0x222233, 
                [Math.cos(angle) * radius, 0.4, Math.sin(angle) * radius], "pillar");
        }
    }

    update(time) {
        // Minimal update logic for environment if needed
    }
}
