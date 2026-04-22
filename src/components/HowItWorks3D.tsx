import { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, MeshTransmissionMaterial } from "@react-three/drei";
import { motion, useScroll, useTransform } from "framer-motion";
import * as THREE from "three";
import { useIsMobile } from "@/hooks/use-mobile";
import pawFallback from "@/assets/paw-3d-fallback.png";

/**
 * A stylized "paw orb": a soft sphere with 4 small bean-shaped pads
 * forming a paw print silhouette. Built procedurally — no GLTF needed.
 */
function PawOrb({ scrollScale }: { scrollScale: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    // Continuous slow rotation, scroll accelerates it
    const speed = 0.3 + scrollScale.current * 0.8;
    group.current.rotation.y += delta * speed;
    // Subtle scale response to scroll
    const target = 1 + scrollScale.current * 0.15;
    group.current.scale.lerp(new THREE.Vector3(target, target, target), 0.08);
  });

  return (
    <group ref={group}>
      {/* Main palm pad */}
      <mesh position={[0, -0.35, 0]}>
        <sphereGeometry args={[0.95, 64, 64]} />
        <MeshTransmissionMaterial
          color="#ffd6e0"
          thickness={0.6}
          roughness={0.15}
          transmission={0.6}
          ior={1.3}
          chromaticAberration={0.05}
          backside
        />
      </mesh>
      {/* Toe beans */}
      {[
        [-0.7, 0.55, 0.2],
        [-0.25, 0.85, 0.2],
        [0.25, 0.85, 0.2],
        [0.7, 0.55, 0.2],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.32, 48, 48]} />
          <meshPhysicalMaterial
            color="#ffb3c7"
            roughness={0.25}
            metalness={0.05}
            clearcoat={0.8}
            clearcoatRoughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

interface HowItWorks3DProps {
  containerRef?: React.RefObject<HTMLElement>;
}

export const HowItWorks3D = ({ containerRef }: HowItWorks3DProps) => {
  const isMobile = useIsMobile();
  const [webglOk, setWebglOk] = useState(true);
  const scrollScale = useRef(0);

  // Only use scroll tracking if containerRef is provided
  const { scrollYProgress } = useScroll(
    containerRef
      ? {
          target: containerRef,
          offset: ["start end", "end start"],
        }
      : undefined
  );

  // Map scroll progress (0-1) into a scaled influence value
  const influence = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);

  useEffect(() => {
    if (!containerRef) return;
    const unsub = influence.on("change", (v) => {
      scrollScale.current = v;
    });
    return () => unsub();
  }, [influence, containerRef]);

  // WebGL feature detection
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      if (!gl) setWebglOk(false);
    } catch {
      setWebglOk(false);
    }
  }, []);

  if (isMobile) return null;

  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="pointer-events-none absolute right-0 top-24 z-0 hidden lg:block"
      style={{ width: 380, height: 380 }}
    >
      {/* Glassmorphism backdrop */}
      <div
        className="absolute inset-4 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.15), transparent 70%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid hsl(var(--border) / 0.4)",
          boxShadow: "0 20px 60px -20px hsl(var(--primary) / 0.25)",
        }}
      />

      {webglOk ? (
        <Canvas
          dpr={[1, 1.6]}
          camera={{ position: [0, 0, 4.2], fov: 40 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              setWebglOk(false);
            });
          }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[3, 4, 2]} intensity={0.8} />
          <Suspense fallback={null}>
            <Float speed={1.6} rotationIntensity={0.3} floatIntensity={1.2}>
              <PawOrb scrollScale={scrollScale} />
            </Float>
            <Environment preset="studio" />
          </Suspense>
        </Canvas>
      ) : (
        <img
          src={pawFallback}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
    </motion.div>
  );
};
