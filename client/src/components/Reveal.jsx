import { useRef } from 'react';
import { gsap, useGSAP } from '../lib/gsap.js';

// Wraps content and fades/slides it in once it scrolls into view (ScrollTrigger).
// Honours prefers-reduced-motion (no movement, no opacity flash). Cleanup is
// automatic via useGSAP. `as` lets the wrapper render a semantic tag.
export default function Reveal({
  children,
  y = 24,
  delay = 0,
  start = 'top 85%',
  as: Tag = 'div',
  className,
  style,
}) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(ref.current, {
          autoAlpha: 0,
          y,
          delay,
          scrollTrigger: {
            trigger: ref.current,
            start,
            once: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
