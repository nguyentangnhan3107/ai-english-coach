import { useEffect } from 'react';
import { playClick } from '../utils/soundManager';

export default function SoundEffects() {
  useEffect(() => {
    const onPointerDown = (event) => {
      const target = event.target.closest('button, a[role="button"], [data-sound-click]');
      if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
      playClick();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);
  return null;
}
