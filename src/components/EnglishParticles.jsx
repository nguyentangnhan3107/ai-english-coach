import { useEffect, useState } from 'react';
import './EnglishParticles.css';

const particles = [
  // ===== EMOJI =====
  { content: '🤖', x: 9, y: 22, size: 'large' },
  { content: '🧠', x: 87, y: 18, size: 'large' },
  { content: '🎙️', x: 91, y: 67, size: 'large' },
  { content: '🌎', x: 7, y: 72, size: 'large' },

  { content: '🎧', x: 78, y: 78, size: 'medium' },
  { content: '💬', x: 15, y: 45, size: 'medium' },
  { content: '📚', x: 24, y: 16, size: 'medium' },
  { content: '📝', x: 73, y: 27, size: 'medium' },
  { content: '🔤', x: 94, y: 40, size: 'medium' },
  { content: '🗣️', x: 19, y: 84, size: 'medium' },

  { content: '✨', x: 56, y: 13, size: 'small' },
  { content: '💡', x: 34, y: 83, size: 'small' },

  // ===== WORDS =====
  { content: 'Hello', x: 22, y: 31, size: 'word' },
  { content: 'Learn', x: 78, y: 13, size: 'word' },
  { content: 'Speak', x: 88, y: 48, size: 'word' },
  { content: 'Listen', x: 8, y: 57, size: 'word' },
  { content: 'Practice', x: 18, y: 62, size: 'word' },
  { content: 'Chat', x: 82, y: 57, size: 'word' },
];

export default function EnglishParticles() {
  const [mouse, setMouse] = useState({
    x: 50,
    y: 50,
  });

  useEffect(() => {
    let animationFrame;

    const handleMouseMove = (event) => {
      cancelAnimationFrame(animationFrame);

      animationFrame = requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth) * 100;
        const y = (event.clientY / window.innerHeight) * 100;

        setMouse({
          x,
          y,
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      className="english-particles"
      aria-hidden="true"
      style={{
        '--mouse-x': `${mouse.x}%`,
        '--mouse-y': `${mouse.y}%`,
      }}
    >
      {particles.map((particle, index) => (
        <span
          key={index}
          className="english-particle-position"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
        >
          <span
            className={`
              english-particle
              english-particle-${particle.size}
              ${
                particle.size === 'word'
                  ? 'english-particle-word'
                  : 'english-particle-emoji'
              }
            `}
            style={{
              '--particle-index': index,
            }}
          >
            {particle.content}
          </span>
        </span>
      ))}
    </div>
  );
}