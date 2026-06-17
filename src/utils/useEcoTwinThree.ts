import { useEffect, useRef } from 'react';

const treePositions = [
  { x: -2.0, z: 2.2 }, { x: -3.2, z: 3.5 }, { x: -4.0, z: 2.0 }, { x: -1.0, z: 3.8 },
  { x: 2.2, z: 2.2 }, { x: 3.2, z: 3.2 }, { x: 4.2, z: 1.5 }, { x: 1.5, z: 4.0 }, { x: -3.8, z: -2.0 }
];

interface EcoTwinThreeParams {
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  threeLib: typeof import('three') | null;
  simTransport: number;
  simDiet: number;
  simEnergy: number;
  simShopping: number;
  simScore: number;
  isHealthy: boolean;
  isModerate: boolean;
  treesCount: number;
  focusedItem: { x: number; z: number; type: string; id: string } | null;
}

/**
 * Custom React hook encapsulating the Three.js 3D WebGL simulator engine.
 * Decouples rendering pipeline and event loops from the UI component.
 */
export default function useEcoTwinThree({
  canvasContainerRef,
  threeLib,
  simTransport,
  simDiet,
  simEnergy,
  simShopping,
  simScore,
  isHealthy,
  isModerate,
  treesCount,
  focusedItem
}: EcoTwinThreeParams) {
  const focusedItemRef = useRef(focusedItem);

  useEffect(() => {
    focusedItemRef.current = focusedItem;
  }, [focusedItem]);

  useEffect(() => {
    if (!threeLib) return;
    const THREE = threeLib;

    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 280;

    // 1. Setup Scene, Camera, WebGLRenderer
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 11, 17);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Setup Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight1.position.set(10, 20, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.35); // fill light
    dirLight2.position.set(-10, -5, -10);
    scene.add(dirLight2);

    // 3. Create Pivot Group for Keyboard & Drag Rotation
    const worldGroup = new THREE.Group();
    worldGroup.rotation.x = 0.35;
    worldGroup.rotation.y = -0.4;
    scene.add(worldGroup);

    // Track resources for proper garbage collection on rebuild/unmount
    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(resource: T): T => {
      disposables.push(resource);
      return resource;
    };

    // Color states mapping
    const groundColor = isHealthy ? 0x10b981 : isModerate ? 0xeab308 : 0x64748b;
    const riverColor = isHealthy ? 0x06b6d4 : isModerate ? 0x0891b2 : 0x475569;

    // 4. Ground (Cylinder Island)
    const groundGeo = track(new THREE.CylinderGeometry(6.5, 6.5, 0.6, 32));
    const groundMat = track(new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.85,
      metalness: 0.1
    }));
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.3;
    worldGroup.add(groundMesh);

    // 5. River/Water Stream cutting across
    const riverGeo = track(new THREE.BoxGeometry(13.2, 0.1, 2.0));
    const riverMat = track(new THREE.MeshStandardMaterial({
      color: riverColor,
      roughness: 0.1,
      metalness: 0.7
    }));
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.position.set(0, 0.01, 0);
    worldGroup.add(riverMesh);

    // 6. Spawn Windmills (Utilities Slider < 60)
    const windRotors: import('three').Group[] = [];
    if (simEnergy < 60) {
      createWindmill(-2.8, -2.8, 'windmill-0');
      if (simEnergy < 35) {
        createWindmill(-4.2, 0.2, 'windmill-1');
      }
    }

    function createWindmill(x: number, z: number, id: string) {
      const wGroup = new THREE.Group();
      wGroup.position.set(x, 0, z);
      wGroup.userData = { focusId: id };

      // Pole
      const poleGeo = track(new THREE.CylinderGeometry(0.06, 0.1, 3.2, 8));
      const poleMat = track(new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.6;
      wGroup.add(pole);

      // Hub
      const hubGeo = track(new THREE.SphereGeometry(0.15, 8, 8));
      const hubMat = track(new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.position.set(0, 3.2, 0.1);
      wGroup.add(hub);

      // Blades
      const blades = new THREE.Group();
      blades.position.set(0, 3.2, 0.16);

      const bladeGeo = track(new THREE.BoxGeometry(0.08, 1.2, 0.02));
      const bladeMat = track(new THREE.MeshStandardMaterial({ color: 0xf8fafc }));

      for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.y = 0.6;
        const bladePivot = new THREE.Group();
        bladePivot.rotation.z = (i * Math.PI * 2) / 3;
        bladePivot.add(blade);
        blades.add(bladePivot);
      }

      wGroup.add(blades);
      worldGroup.add(wGroup);
      windRotors.push(blades);
    }

    // 7. Spawn Solar Panels (Utilities Slider < 45)
    if (simEnergy < 45) {
      createSolarPanel(2.2, -3.2, 'solar-0');
      createSolarPanel(3.6, -1.8, 'solar-1');
    }

    function createSolarPanel(x: number, z: number, id: string) {
      const pGroup = new THREE.Group();
      pGroup.position.set(x, 0, z);
      pGroup.rotation.y = 0.3;
      pGroup.userData = { focusId: id };

      const standGeo = track(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8));
      const standMat = track(new THREE.MeshStandardMaterial({ color: 0x64748b }));
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.y = 0.25;
      pGroup.add(stand);

      const faceGeo = track(new THREE.BoxGeometry(1.0, 0.05, 0.65));
      const faceMat = track(new THREE.MeshStandardMaterial({
        color: 0x1e3a8a,
        roughness: 0.15,
        metalness: 0.8
      }));
      const face = new THREE.Mesh(faceGeo, faceMat);
      face.position.set(0, 0.5, 0);
      face.rotation.x = 0.5; // slant angle
      pGroup.add(face);

      worldGroup.add(pGroup);
    }

    // 8. Spawn Trees (Count scales with environment health)
    for (let i = 0; i < Math.min(treesCount, treePositions.length); i++) {
      createTree(treePositions[i].x, treePositions[i].z, `tree-${i}`);
    }

    function createTree(x: number, z: number, id: string) {
      const tGroup = new THREE.Group();
      tGroup.position.set(x, 0, z);
      tGroup.userData = { focusId: id };

      // Trunk
      const trunkGeo = track(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 8));
      const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x78350f }));
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.35;
      tGroup.add(trunk);

      // Foliage Cones
      const leafGeo = track(new THREE.ConeGeometry(0.38, 1.1, 8));
      const leafMat = track(new THREE.MeshStandardMaterial({
        color: isHealthy ? 0x059669 : 0xa16207,
        roughness: 0.9
      }));
      const leaves = new THREE.Mesh(leafGeo, leafMat);
      leaves.position.y = 1.15;
      tGroup.add(leaves);

      if (isHealthy) {
        const leafGeo2 = track(new THREE.ConeGeometry(0.28, 0.8, 8));
        const leaves2 = new THREE.Mesh(leafGeo2, leafMat);
        leaves2.position.y = 1.65;
        tGroup.add(leaves2);
      }

      worldGroup.add(tGroup);
    }

    // 9. Spawn Factory & Smog (Polluted or high score utility)
    const smogSpheres: Array<{ mesh: import('three').Mesh; origin: import('three').Vector3 }> = [];
    if (simScore > 240) {
      createFactory(3.0, -1.0, 'factory-0');
    }

    function createFactory(x: number, z: number, id: string) {
      const fGroup = new THREE.Group();
      fGroup.position.set(x, 0, z);
      fGroup.userData = { focusId: id };

      // Base Structure
      const baseGeo = track(new THREE.BoxGeometry(2.0, 1.2, 1.5));
      const baseMat = track(new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 }));
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.6;
      fGroup.add(base);

      // Smokestack chimney
      const stackGeo = track(new THREE.CylinderGeometry(0.16, 0.2, 2.2, 8));
      const stackMat = track(new THREE.MeshStandardMaterial({ color: 0x334155 }));
      const stack = new THREE.Mesh(stackGeo, stackMat);
      stack.position.set(0.5, 1.1, 0);
      fGroup.add(stack);

      // Red band on smokestack
      const ringGeo = track(new THREE.CylinderGeometry(0.18, 0.18, 0.2, 8));
      const ringMat = track(new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0.5, 1.8, 0);
      fGroup.add(ring);

      const sourcePos = new THREE.Vector3(x + 0.5, 2.2, z);

      // Smokestack particle system
      const numParticles = 12;
      const partGeo = track(new THREE.SphereGeometry(0.15, 6, 6));
      const partMat = track(new THREE.MeshBasicMaterial({
        color: 0x64748b,
        transparent: true,
        opacity: 0.55
      }));

      for (let i = 0; i < numParticles; i++) {
        const sphere = new THREE.Mesh(partGeo, partMat);
        resetSmog(sphere, sourcePos);
        // stagger coordinates
        sphere.position.y += Math.random() * 1.5;
        scene.add(sphere);
        smogSpheres.push({ mesh: sphere, origin: sourcePos.clone() });
      }

      worldGroup.add(fGroup);
    }

    function resetSmog(sphere: import('three').Mesh, origin: import('three').Vector3) {
      sphere.position.copy(origin);
      sphere.position.x += (Math.random() - 0.5) * 0.15;
      sphere.position.z += (Math.random() - 0.5) * 0.15;
      sphere.scale.set(1, 1, 1);
      sphere.userData = {
        vy: 0.015 + Math.random() * 0.015,
        vx: (Math.random() - 0.5) * 0.01,
        vz: (Math.random() - 0.5) * 0.01,
        age: 0,
        maxAge: 70 + Math.random() * 50
      };
    }

    // 10. Floating spores (leaves / dust)
    const floaters: import('three').Mesh[] = [];
    const floaterGeo = track(new THREE.SphereGeometry(0.05, 4, 4));
    const floaterMat = track(new THREE.MeshBasicMaterial({
      color: isHealthy ? 0x10b981 : 0xeab308,
      transparent: true,
      opacity: 0.5
    }));
    const floaterCount = isHealthy ? 10 : isModerate ? 5 : 0;

    for (let i = 0; i < floaterCount; i++) {
      const fl = new THREE.Mesh(floaterGeo, floaterMat);
      fl.position.set(
        (Math.random() - 0.5) * 10,
        1 + Math.random() * 4,
        (Math.random() - 0.5) * 10
      );
      scene.add(fl);
      floaters.push(fl);
    }

    // 11. Mouse Drag Rotation Logic
    let isDragging = false;
    let prevMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMousePosition.x;
      const deltaY = e.clientY - prevMousePosition.y;

      worldGroup.rotation.y += deltaX * 0.007;
      worldGroup.rotation.x = Math.max(0.1, Math.min(1.1, worldGroup.rotation.x + deltaY * 0.007));

      prevMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    // Touch Support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMousePosition.x;
      const deltaY = e.touches[0].clientY - prevMousePosition.y;

      worldGroup.rotation.y += deltaX * 0.007;
      worldGroup.rotation.x = Math.max(0.1, Math.min(1.1, worldGroup.rotation.x + deltaY * 0.007));

      prevMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    const canvasDom = renderer.domElement;
    canvasDom.style.cursor = 'grab';
    canvasDom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvasDom.addEventListener('touchstart', onTouchStart);
    canvasDom.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);

    // 12. Handle Canvas Scaling
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW && newH) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 13. Animating Lifecycle
    let frameId: number;
    const timer = new THREE.Timer();
    timer.connect(document);

    const tick = (timestamp: DOMHighResTimeStamp) => {
      frameId = requestAnimationFrame(tick);
      
      if (document.hidden) {
        return;
      }
      
      timer.update(timestamp);
      const elapsed = timer.getElapsed();

      const prefersReducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

      // Spin windmills blades
      const bladeSpeed = prefersReducedMotion ? 0 : (100 - simEnergy) * 0.0016;
      windRotors.forEach(blades => {
        blades.rotation.z += bladeSpeed;
      });

      // River wavy motion
      if (!prefersReducedMotion) {
        riverMesh.position.y = 0.01 + Math.sin(elapsed * 2.0) * 0.01;
      }

      // Update smoke puffing particles
      if (!prefersReducedMotion) {
        smogSpheres.forEach(puff => {
          const m = puff.mesh;
          m.userData.age++;
          m.position.y += m.userData.vy;
          m.position.x += m.userData.vx;
          m.position.z += m.userData.vz;

          const growth = 1.0 + (m.userData.age / m.userData.maxAge) * 1.8;
          m.scale.set(growth, growth, growth);
          if (m.material instanceof THREE.Material) {
            m.material.opacity = 0.55 * (1.0 - m.userData.age / m.userData.maxAge);
          }

          if (m.userData.age >= m.userData.maxAge) {
            resetSmog(m, puff.origin);
          }
        });
      }

      // Float ambient spore particles
      if (!prefersReducedMotion) {
        floaters.forEach((p, idx) => {
          p.position.y += Math.sin(elapsed + idx) * 0.002;
          p.position.x += Math.cos(elapsed * 0.4 + idx) * 0.0015;
          if (p.position.y > 5.0) p.position.y = 1.0;
        });
      }

      // Smooth keyboard focus orientation
      const activeFocus = focusedItemRef.current;
      if (activeFocus && !prefersReducedMotion) {
        if (activeFocus.id !== 'base' && activeFocus.id !== 'river') {
          const targetAngle = -Math.atan2(activeFocus.x, activeFocus.z);
          const angleDiff = targetAngle - worldGroup.rotation.y;
          const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
          worldGroup.rotation.y += normalizedDiff * 0.08;
        }
      } else if (!isDragging && !prefersReducedMotion) {
        // Rotate group incrementally when idle
        worldGroup.rotation.y += 0.0015;
      }

      // Apply visual highlight to the focused item
      if (worldGroup && worldGroup.children) {
        worldGroup.children.forEach(child => {
          if (child.userData && child.userData.focusId) {
            const isFocused = activeFocus && activeFocus.id === child.userData.focusId;
            
            if (isFocused) {
              const scalePulse = 1.0 + Math.sin(elapsed * 6.0) * 0.08;
              child.scale.set(scalePulse, scalePulse, scalePulse);
              
              child.traverse((node) => {
                if (node instanceof THREE.Mesh) {
                  const material = node.material;
                  if (material && 'emissive' in material) {
                    const standardMat = material as import('three').MeshStandardMaterial;
                    if (standardMat.emissive && typeof standardMat.emissive.setHex === 'function') {
                      standardMat.emissive.setHex(0x3b82f6); // bright blue glow
                    }
                  }
                }
              });
            } else {
              child.scale.set(1, 1, 1);
              child.traverse((node) => {
                if (node instanceof THREE.Mesh) {
                  const material = node.material;
                  if (material && 'emissive' in material) {
                    const standardMat = material as import('three').MeshStandardMaterial;
                    if (standardMat.emissive && typeof standardMat.emissive.setHex === 'function') {
                      standardMat.emissive.setHex(0x000000); // restore default
                    }
                  }
                }
              });
            }
          }
        });
      }

      renderer.render(scene, camera);
    };

    frameId = requestAnimationFrame(tick);

    // Cleanup on slider changes / unmounts
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();

      canvasDom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvasDom.removeEventListener('touchstart', onTouchStart);
      canvasDom.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);

      // Scene elements removal
      smogSpheres.forEach(puff => scene.remove(puff.mesh));
      floaters.forEach(fl => scene.remove(fl));

      // Dispose webgl resource arrays
      disposables.forEach(resource => {
        if (resource.dispose) resource.dispose();
      });

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [simTransport, simDiet, simEnergy, simShopping, simScore, isHealthy, isModerate, threeLib, treesCount, canvasContainerRef]);
}
