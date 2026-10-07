const STORAGE_KEY = 'englishCoachProgress_v2';

const DEFAULT_PROGRESS = {
  xp: 0,
  streak: 0,
  lastStudyDate: null,

  translationCount: 0,
  pronunciationCount: 0,
  conversationCount: 0,
  pronunciationTopics: {},
};


/* =========================================================
   DATE
   ========================================================= */

function getDateKey(date = new Date()) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}


/* =========================================================
   LOAD
   ========================================================= */

export function getProgress() {
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return {
        ...DEFAULT_PROGRESS,
      };
    }

    const parsed = JSON.parse(saved);

    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
    };
  } catch {
    return {
      ...DEFAULT_PROGRESS,
    };
  }
}


/* =========================================================
   SAVE
   ========================================================= */

function saveProgress(progress) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(progress)
    );
  } catch {
    // Ignore storage errors
  }
}


/* =========================================================
   RECORD LEARNING
   ========================================================= */

export function recordLearning(
  type,
  xpAmount = 0
) {
  const progress = getProgress();

  const today =
    getDateKey();

  /*
   * Streak chỉ tăng một lần trong một ngày.
   */
  if (
    progress.lastStudyDate !== today
  ) {
    const previousDate =
      progress.lastStudyDate;

    if (!previousDate) {
      /*
       * Lần học đầu tiên.
       */
      progress.streak = 1;
    } else {
      const previous =
        new Date(
          `${previousDate}T00:00:00`
        );

      const current =
        new Date(
          `${today}T00:00:00`
        );

      const difference =
        Math.round(
          (
            current - previous
          ) /
            (1000 * 60 * 60 * 24)
        );

      if (difference === 1) {
        progress.streak += 1;
      } else {
        progress.streak = 1;
      }
    }

    progress.lastStudyDate =
      today;
  }


  /* =====================================================
     XP
     ===================================================== */

  progress.xp +=
    Number(xpAmount) || 0;


  /* =====================================================
     COUNTERS
     ===================================================== */

  if (type === 'translation') {
    progress.translationCount += 1;
  }

  if (type === 'pronunciation') {
    progress.pronunciationCount += 1;
  }

  if (type === 'conversation') {
    progress.conversationCount += 1;
  }


  saveProgress(progress);


  /* =====================================================
     NOTIFY HOME
     ===================================================== */

  window.dispatchEvent(
    new CustomEvent(
      'englishCoachProgressUpdated',
      {
        detail: progress,
      }
    )
  );


  return progress;
}

export function recordPronunciationTopic(level, topic, totalSentences = 0) {
  const progress = getProgress();
  const key = `${level}::${topic}`;
  const existing = progress.pronunciationTopics?.[key] || {};
  const alreadyCompleted = Boolean(existing.completedAt);

  progress.pronunciationTopics = {
    ...(progress.pronunciationTopics || {}),
    [key]: {
      level, topic,
      completed: Math.max(Number(existing.completed) || 0, Number(totalSentences) || 0),
      total: Number(totalSentences) || Number(existing.total) || 0,
      completedAt: existing.completedAt || new Date().toISOString(),
    },
  };

  if (!alreadyCompleted) {
    progress.xp += 15;
    progress.pronunciationCount += 1;
  }

  const today = getDateKey();
  if (progress.lastStudyDate !== today) {
    const previousDate = progress.lastStudyDate;
    if (!previousDate) progress.streak = 1;
    else {
      const previous = new Date(`${previousDate}T00:00:00`);
      const current = new Date(`${today}T00:00:00`);
      const difference = Math.round((current - previous) / (1000 * 60 * 60 * 24));
      progress.streak = difference === 1 ? progress.streak + 1 : 1;
    }
    progress.lastStudyDate = today;
  }

  saveProgress(progress);
  window.dispatchEvent(new CustomEvent('englishCoachProgressUpdated', { detail: progress }));
  return { progress, firstCompletion: !alreadyCompleted };
}

/* =========================================================
   RESET
   ========================================================= */

export function resetProgress() {
  const progress = {
    ...DEFAULT_PROGRESS,
  };

  saveProgress(progress);

  window.dispatchEvent(
    new CustomEvent(
      'englishCoachProgressUpdated',
      {
        detail: progress,
      }
    )
  );

  return progress;
}