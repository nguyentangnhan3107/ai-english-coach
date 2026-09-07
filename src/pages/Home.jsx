import {
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  getProgress,
} from '../utils/progressManager';

import './Home.css';

const DEFAULT_PROGRESS = {
  xp: 0,
  streak: 0,
  goal: 450,
  translationCount: 0,
  pronunciationCount: 0,
  conversationCount: 0,
};

function buildAchievements(progress) {
  return [
    {
      id: 'streak',

      icon: '🔥',

      title: 'Streak',

      description:
        'Maintain a 7-day learning streak.',

      requirement:
        'Learn for 7 days in a row.',

      unlocked:
        progress.streak >= 7,
    },

    {
      id: 'learner',

      icon: '📚',

      title: 'Learner',

      description:
        'Keep learning every day.',

      requirement:
        'Complete your first learning session.',

      unlocked:
        progress.translationCount +
          progress.pronunciationCount +
          progress.conversationCount >=
        1,
    },

    {
      id: 'master',

      icon: '🎙️',

      title: 'Master',

      description:
        'Complete 10 pronunciation practices.',

      requirement:
        'Complete 10 pronunciation practices.',

      unlocked:
        progress.pronunciationCount >= 10,
    },
  ];
}

export default function Home() {
  const navigate = useNavigate();

  const [progress, setProgress] =
    useState(() => ({
      ...DEFAULT_PROGRESS,
      ...getProgress(),
    }));

  const [
    selectedAchievement,
    setSelectedAchievement,
  ] = useState(null);

  /* =====================================================
     UPDATE WHEN OTHER PAGES CHANGE PROGRESS
     ===================================================== */

  useEffect(() => {
    const handleProgressUpdate =
      (event) => {
        if (!event.detail) {
          return;
        }

        setProgress({
          ...DEFAULT_PROGRESS,
          ...event.detail,
        });
      };

    window.addEventListener(
      'englishCoachProgressUpdated',
      handleProgressUpdate
    );

    return () => {
      window.removeEventListener(
        'englishCoachProgressUpdated',
        handleProgressUpdate
      );
    };
  }, []);

  /* =====================================================
     REFRESH WHEN RETURNING TO HOME
     ===================================================== */

  useEffect(() => {
    const handleFocus = () => {
      setProgress({
        ...DEFAULT_PROGRESS,
        ...getProgress(),
      });
    };

    window.addEventListener(
      'focus',
      handleFocus
    );

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus
      );
    };
  }, []);

  const progressPercent =
    Math.min(
      100,
      Math.round(
        (progress.xp /
          progress.goal) *
          100
      )
    );

  const achievements =
    buildAchievements(progress);

  return (
    <main className="home">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="hero">

        <div
          className="black-hole"
          aria-hidden="true"
        >

          <div className="black-hole-glow"></div>

          <div className="accretion-disk">

            <div className="disk-material"></div>

            <div className="disk-ring disk-ring-outer"></div>

            <div className="disk-ring disk-ring-middle"></div>

            <div className="disk-ring disk-ring-inner"></div>

          </div>

          <div className="orange-streak"></div>

          <div className="black-hole-core"></div>

        </div>


        <div className="hero-content">

          <h1>

            <span className="hero-emoji">
              🤖
            </span>

            AI English Coach

            <span className="hero-emoji">
              🧠
            </span>

          </h1>

          <p className="hero-subtitle">
            Your personal AI English tutor
          </p>

          <button
            className="start-button"
            onClick={() =>
              navigate('/translation')
            }
            aria-label="Start Learning"
            data-a11y-lang="en-US"
          >
            Start Learning →
          </button>

        </div>

      </section>


      {/* =====================================================
          YOUR PROGRESS
      ===================================================== */}

      <section className="progress-section">

        <h2>
          🎯 YOUR PROGRESS
        </h2>

        <div className="progress-card">

          <div className="progress-stats">

            <div className="progress-stat">

              <span className="progress-stat-icon">
                🔥
              </span>

              <div>

                <strong>
                  {progress.streak} days
                </strong>

                <span>
                  Streak
                </span>

              </div>

            </div>


            <div className="progress-stat">

              <span className="progress-stat-icon">
                ⭐
              </span>

              <div>

                <strong>
                  {progress.xp} XP
                </strong>

                <span>
                  Total XP
                </span>

              </div>

            </div>

          </div>


          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={
              progressPercent
            }
            aria-valuemin="0"
            aria-valuemax="100"
            aria-label={`Learning progress: ${progressPercent} percent`}
          >

            <div
              className="progress-bar-fill"
              style={{
                width:
                  `${progressPercent}%`,
              }}
            />

          </div>


          <div className="progress-bottom">

            <span>
              {progress.xp} /{' '}
              {progress.goal} XP
            </span>

            <strong>
              {progressPercent}%
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================================
          ACHIEVEMENTS
      ===================================================== */}

      <section className="achievements-section">

        <h2>
          🏆 ACHIEVEMENTS
        </h2>

        <div className="achievement-list">

          {achievements.map(
            (achievement) => (

              <button
                key={achievement.id}
                type="button"
                className={`achievement-card ${
                  achievement.unlocked
                    ? 'unlocked'
                    : 'locked'
                }`}
                onClick={() =>
                  setSelectedAchievement(
                    achievement
                  )
                }
                aria-label={`Achievement: ${achievement.title}`}
              >

                <div className="achievement-icon">
                  {achievement.icon}
                </div>

                <div className="achievement-info">

                  <h3>
                    {achievement.title}
                  </h3>

                  <p>
                    {achievement.description}
                  </p>

                </div>

                <span className="achievement-status">
                  {achievement.unlocked
                    ? '✓'
                    : '🔒'}
                </span>

              </button>

            )
          )}

        </div>

      </section>


      {/* =====================================================
          ACHIEVEMENT MODAL
      ===================================================== */}

      {selectedAchievement && (

        <div
          className="achievement-overlay"
          onClick={() =>
            setSelectedAchievement(null)
          }
        >

          <div
            className="achievement-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievement-title"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="achievement-close"
              onClick={() =>
                setSelectedAchievement(null)
              }
              aria-label="Close"
            >
              ×
            </button>


            <div className="achievement-modal-icon">
              {selectedAchievement.icon}
            </div>


            <h2 id="achievement-title">
              {selectedAchievement.title}
            </h2>


            <p className="achievement-modal-description">
              {selectedAchievement.description}
            </p>


            <div className="achievement-requirement">

              <span>
                Requirement
              </span>

              <strong>
                {selectedAchievement.requirement}
              </strong>

            </div>


            <div
              className={
                `achievement-modal-status ${
                  selectedAchievement.unlocked
                    ? 'is-unlocked'
                    : 'is-locked'
                }`
              }
            >
              {selectedAchievement.unlocked
                ? '✓ Unlocked'
                : '🔒 Locked'}
            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          FEATURES
      ===================================================== */}

      <section className="features">

        <h2>
          Learn English smarter with AI
        </h2>

        <div className="feature-list">

          <button
            className="feature-card"
            onClick={() =>
              navigate('/translation')
            }
            aria-label="Translation"
            data-a11y-lang="en-US"
          >

            <span className="feature-emoji">
              🌐
            </span>

            <h3>
              Translation
            </h3>

            <p>
              Translate Vietnamese into natural English.
            </p>

          </button>


          <button
            className="feature-card"
            onClick={() =>
              navigate('/pronunciation')
            }
            aria-label="Pronunciation"
            data-a11y-lang="en-US"
          >

            <span className="feature-emoji">
              🎙️
            </span>

            <h3>
              Pronunciation
            </h3>

            <p>
              Practice your English pronunciation.
            </p>

          </button>


          <button
            className="feature-card"
            onClick={() =>
              navigate('/conversation')
            }
            aria-label="Conversation"
            data-a11y-lang="en-US"
          >

            <span className="feature-emoji">
              💬
            </span>

            <h3>
              Conversation
            </h3>

            <p>
              Practice English through AI conversations.
            </p>

          </button>

        </div>

      </section>

    </main>
  );
}