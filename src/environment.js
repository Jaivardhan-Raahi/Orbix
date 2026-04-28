import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.elements = [];
        this.setup();
    }

    setup() {
        // Background and Fog
        this.scene.background = new THREE.Color(0x050508);
        this.scene.fog = new THREE.Fog(0x050508, 1, 15);

        // Ground Plane
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.8 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.6;
        this.scene.add(ground);

        // Grid for spatial reference
        const grid = new THREE.GridHelper(50, 50, 0x444455, 0x222233);
        grid.position.y = -1.59;
        this.scene.add(grid);

        this.createMeaningfulObjects();
    }

    createMeaningfulObjects() {
        const createObj = (geo, color, pos, type) => {
            const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ 
                color,
                emissive: color,
                emissiveIntensity: 0.1
            }));
            mesh.position.set(...pos);
            mesh.userData.type = type;
            this.scene.add(mesh);
            this.elements.push(mesh);
            return mesh;
        };

        // 1. Desk (Main focus area)
        createObj(new THREE.BoxGeometry(2.5, 0.1, 1.2), 0x332211, [0, -0.6, -3], "desk");

        // 2. Laptop (On the desk)
        createObj(new THREE.BoxGeometry(0.5, 0.05, 0.35), 0x555555, [0, -0.52, -3.2], "laptop");

        // 3. Book (Next to laptop)
        createObj(new THREE.BoxGeometry(0.25, 0.08, 0.3), 0xaa2222, [0.7, -0.52, -3.0], "book");

        // 4. Coffee Cup (Small cube as placeholder)
        createObj(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 16), 0xffffff, [-0.6, -0.51, -2.9], "coffee");

        // 5. Background Floating Cubes (for depth)
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 5 + Math.random() * 5;
            const height = Math.random() * 3;
            const size = 0.1 + Math.random() * 0.2;
            
            const cube = createObj(
                new THREE.BoxGeometry(size, size, size),
                0x222233,
                [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
                "floating_cube"
            );
            cube.userData.rotationSpeed = (Math.random() - 0.5) * 0.02;
        }

        console.log("[Environment] Objects created and tagged with semantic types.");
    }

    update(time) {
        // Animate floating cubes
        this.elements.forEach(el => {
            if (el.userData.rotationSpeed) {
                el.rotation.x += el.userData.rotationSpeed;
                el.rotation.y += el.userData.rotationSpeed;
                el.position.y += Math.sin(time + el.position.x) * 0.001;
            }
        });
    }
}
