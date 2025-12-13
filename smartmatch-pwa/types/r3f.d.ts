import { Object3DNode } from '@react-three/fiber';
import * as THREE from 'three';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            mesh: any;
            group: any;
            planeGeometry: any;
            shaderMaterial: any;
            pointLight: any;
            ambientLight: any;
            primitive: any;
        }
    }
}
