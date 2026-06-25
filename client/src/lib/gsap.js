// Central GSAP setup: register plugins once and set project-wide tween defaults.
// Import { gsap, useGSAP, ScrollTrigger } from here rather than registering
// plugins ad-hoc in components (per the GSAP React/ScrollTrigger guidance).
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

gsap.defaults({ duration: 0.6, ease: 'power2.out' });

export { gsap, useGSAP, ScrollTrigger };
