/// <reference path="../../types/r3f.d.ts" />
"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Color, Vector2, Vector3 } from "three";

// Fix R3F Types Inline
declare global {
    namespace JSX {
        interface IntrinsicElements {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            mesh: any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            planeGeometry: any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shaderMaterial: any;
        }
    }
}

const FluidShader = {
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uResolution;
        uniform vec3 uColor1;
        uniform vec3 uColor2; // Void Black
        varying vec2 vUv;

        // Simplex Noise (Standard Implementation)
        vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        float snoise(vec2 v){
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
            vec2 uv = vUv;
            
            // Slow Morphing
            float noise = snoise(uv * 3.0 + uTime * 0.1);
            
            // Mouse Interaction (Ripples)
            float dist = distance(uv, uMouse);
            // Interactive glow falling off
            float interaction = smoothstep(0.5, 0.0, dist); 
            
            // Mix noise and interaction
            float pattern = noise + interaction * 0.5;

            // Deep Void gradients
            // Mix between Void (Color2) and Soul Cyan/Accent (Color1)
            vec3 finalColor = mix(uColor2, uColor1, smoothstep(-0.2, 0.8, pattern));
            
            // Vignette for depth
            float vignette = 1.0 - length(uv - 0.5) * 1.5;
            finalColor *= clamp(vignette + 0.5, 0.0, 1.0);

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};

const FluidPlane = ({ colors }: { colors: { primary: string; background: string } }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mesh = useRef<any>(null);
    const { viewport, mouse } = useThree();

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uMouse: { value: new Vector2(0.5, 0.5) },
            uResolution: { value: new Vector2(1, 1) },
            uColor1: { value: new Color(colors.primary) },
            uColor2: { value: new Color(colors.background) },
        }),
        [colors]
    );

    useFrame((state) => {
        if (mesh.current) {
            mesh.current.material.uniforms.uTime.value = state.clock.getElapsedTime();
            // Map normalized mouse (-1 to 1) to UV space (0 to 1)
            // Lerp for smoothness
            const targetX = (mouse.x + 1) / 2;
            const targetY = (mouse.y + 1) / 2;

            mesh.current.material.uniforms.uMouse.value.lerp(new Vector3(targetX, targetY, 0), 0.05);
        }
    });

    return (
        // @ts-ignore
        <mesh ref={mesh} scale={[viewport.width, viewport.height, 1]}>
            {/* @ts-ignore */}
            <planeGeometry args={[1, 1, 32, 32]} />
            {/* @ts-ignore */}
            <shaderMaterial
                vertexShader={FluidShader.vertexShader}
                fragmentShader={FluidShader.fragmentShader}
                uniforms={uniforms}
            />
            {/* @ts-ignore */}
        </mesh>
    );
};

interface LivingBackgroundProps {
    className?: string;
    primaryColor?: string; // Hex
}

export const LivingBackground: React.FC<LivingBackgroundProps> = ({
    className,
    primaryColor = "#00D4FF" // Soul Cyan default
}) => {
    return (
        <div className={className || "fixed inset-0 z-0 pointer-events-none"}>
            <Canvas camera={{ position: [0, 0, 1] }} dpr={[1, 2]}>
                <FluidPlane colors={{ primary: primaryColor, background: "#050510" }} />
            </Canvas>
        </div>
    );
};
