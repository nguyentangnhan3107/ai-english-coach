import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';

import { useA11y } from '../contexts/A11yContext';

import { WavRecorder } from '../audio/recorder';

import {
  pronunciationData,
} from '../data/pronunciationData';

import {
  recordLearning,
} from '../utils/progressManager';

import './Pronunciation.css';

function shuffleArray(items) {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled;
}

export default function Pronunciation() {
  const {
    preferences,
    announce,
    speak,
    speakSequence,
    stopSpeaking,
  } = useA11y();

  const levels = [
    'A1',
    'A2',
    'B1',
    'B2',
  ];

  const [
    selectedLevel,
    setSelectedLevel,
  ] = useState('');

  const [
    selectedTopic,
    setSelectedTopic,
  ] = useState('');

  const [
    practiceSentences,
    setPracticeSentences,
  ] = useState([]);

  const [
    isStarted,
    setIsStarted,
  ] = useState(false);

  const [
    isCompleted,
    setIsCompleted,
  ] = useState(false);

  const [
    currentSentence,
    setCurrentSentence,
  ] = useState(0);

  const [
    targetText,
    setTargetText,
  ] = useState('');

  const [
    targetMeaning,
    setTargetMeaning,
  ] = useState('');

  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    status,
    setStatus,
  ] = useState(
    'Nhấn nút để bắt đầu.'
  );

  const [
    audioUrl,
    setAudioUrl,
  ] = useState(null);

  const [
    score,
    setScore,
  ] = useState(null);

  const [
    transcript,
    setTranscript,
  ] = useState('');

  const [
    feedback,
    setFeedback,
  ] = useState('');

  const [
    pronunciationAdvice,
    setPronunciationAdvice,
  ] = useState('');

  const [
    isAnalyzing,
    setIsAnalyzing,
  ] = useState(false);

  const recorderRef =
    useRef(null);

  const streamRef =
    useRef(null);

  const isRecordingRef =
    useRef(false);

  const speechGenerationRef =
    useRef(0);

  const waitForTTSStop =
    useCallback(
      async (
        extraDelay = 250
      ) => {
        speechGenerationRef.current += 1;

        try {
          stopSpeaking();
        } catch {
          // ignore
        }

        try {
          if (
            'speechSynthesis' in window
          ) {
            window.speechSynthesis.cancel();
          }
        } catch {
          // ignore
        }

        await new Promise(
          (resolve) =>
            window.setTimeout(
              resolve,
              120
            )
        );

        if (
          'speechSynthesis' in window
        ) {
          const start =
            Date.now();

          while (
            (
              window.speechSynthesis
                .speaking ||
              window.speechSynthesis
                .pending
            ) &&
            Date.now() - start <
              1500
          ) {
            await new Promise(
              (resolve) =>
                window.setTimeout(
                  resolve,
                  50
                )
            );

            try {
              window.speechSynthesis.cancel();
            } catch {
              // ignore
            }
          }
        }

        await new Promise(
          (resolve) =>
            window.setTimeout(
              resolve,
              extraDelay
            )
        );
      },
      [stopSpeaking]
    );

  const announceVietnamese =
    useCallback(
      (
        text,
        options = {}
      ) => {
        if (
          isRecordingRef.current
        ) {
          return;
        }

        if (!text?.trim()) {
          return;
        }

        announce(text, {
          ...options,
          lang: 'vi-VN',
        });
      },
      [announce]
    );

  const announceEnglish =
    useCallback(
      (
        text,
        options = {}
      ) => {
        if (
          isRecordingRef.current
        ) {
          return;
        }

        if (!text?.trim()) {
          return;
        }

        speak(text, {
          ...options,
          lang: 'en-US',
        });
      },
      [speak]
    );

  const availableTopics =
    selectedLevel
      ? Object.keys(
          pronunciationData[
            selectedLevel
          ] || {}
        )
      : [];

  const sentences =
    selectedLevel &&
    selectedTopic
      ? pronunciationData[
          selectedLevel
        ]?.[selectedTopic] || []
      : [];

  const activeSentences =
    practiceSentences.length > 0
      ? practiceSentences
      : sentences;

  const resetResult = () => {
    setAudioUrl((oldUrl) => {
      if (oldUrl) {
        URL.revokeObjectURL(
          oldUrl
        );
      }

      return null;
    });

    setScore(null);
    setTranscript('');
    setFeedback('');
    setPronunciationAdvice('');
    setIsAnalyzing(false);
  };

  const cleanupRecording =
    () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        streamRef.current = null;
      }

      recorderRef.current = null;
      isRecordingRef.current =
        false;
    };

  const buildMixedSpeechSequence =
    useCallback(
      (text) => {
        if (!text?.trim()) {
          return [];
        }

        const pattern =
          /(\*\*[^*]+\*\*|'[^']+'|"[^"]+"|`[^`]+`)/g;

        const parts =
          text.split(pattern);

        return parts
          .map((part) => {
            if (!part?.trim()) {
              return null;
            }

            const raw =
              part.trim();

            const isEnglish =
              (
                raw.startsWith(
                  "'"
                ) &&
                raw.endsWith("'")
              ) ||
              (
                raw.startsWith(
                  '"'
                ) &&
                raw.endsWith('"')
              ) ||
              (
                raw.startsWith(
                  '**'
                ) &&
                raw.endsWith(
                  '**'
                )
              ) ||
              (
                raw.startsWith('`') &&
                raw.endsWith('`')
              );

            const cleanText =
              raw
                .replace(
                  /^\*\*|\*\*$/g,
                  ''
                )
                .replace(
                  /^['"`]|['"`]$/g,
                  ''
                )
                .trim();

            if (!cleanText) {
              return null;
            }

            return {
              text: cleanText,
              lang: isEnglish
                ? 'en-US'
                : 'vi-VN',
            };
          })
          .filter(Boolean);
      },
      []
    );

  const readAnalysisResult =
    useCallback(
      (result) => {
        if (!result) {
          return;
        }

        if (
          isRecordingRef.current
        ) {
          return;
        }

        const sequence = [];

        sequence.push({
          text:
            `Phân tích xong. Điểm của bạn là ${
              result.score ?? 0
            } trên 100.`,
          lang: 'vi-VN',
        });

        if (
          result.transcript?.trim()
        ) {
          sequence.push({
            text: 'Bạn nói.',
            lang: 'vi-VN',
          });

          sequence.push({
            text:
              result.transcript.trim(),
            lang: 'en-US',
          });
        }

        if (
          result.feedback?.trim()
        ) {
          sequence.push(
            ...buildMixedSpeechSequence(
              result.feedback
            )
          );
        }

        if (
          result.pronunciation?.trim()
        ) {
          sequence.push({
            text: 'Gợi ý.',
            lang: 'vi-VN',
          });

          sequence.push(
            ...buildMixedSpeechSequence(
              result.pronunciation
            )
          );
        }

        if (
          sequence.length > 0
        ) {
          speakSequence(sequence);
        }
      },
      [
        buildMixedSpeechSequence,
        speakSequence,
      ]
    );

  const handleLevelSelect =
    (level) => {
      cleanupRecording();

      stopSpeaking();

      setSelectedLevel(level);
      setSelectedTopic('');
      setPracticeSentences([]);

      setIsStarted(false);
      setIsCompleted(false);

      setCurrentSentence(0);

      setTargetText('');
      setTargetMeaning('');

      resetResult();

      setIsRecording(false);

      const message =
        `Đã chọn trình độ ${level}.`;

      setStatus(
        `📚 ${message}`
      );

      announceVietnamese(message);
    };

  const handleTopicSelect =
    (topic) => {
      cleanupRecording();

      stopSpeaking();

      setSelectedTopic(topic);
      setPracticeSentences([]);

      setIsStarted(false);
      setIsCompleted(false);

      setCurrentSentence(0);

      setTargetText('');
      setTargetMeaning('');

      resetResult();

      setIsRecording(false);

      setStatus(
        `📚 Đã chọn chủ đề: ${topic}.`
      );

      announceEnglish(topic);
    };

  const handleStartPractice =
    async () => {
      if (
        !selectedLevel ||
        !selectedTopic
      ) {
        return;
      }

      if (sentences.length === 0) {
        const message =
          'Chủ đề này chưa có dữ liệu.';

        setStatus(message);

        announceVietnamese(message);

        return;
      }

      await waitForTTSStop(100);

      const shuffledSentences =
        shuffleArray(sentences);

      setPracticeSentences(
        shuffledSentences
      );

      const firstSentence =
        shuffledSentences[0];

      setCurrentSentence(0);

      setTargetText(
        firstSentence.sentence
      );

      setTargetMeaning(
        firstSentence.meaning || ''
      );

      resetResult();

      setIsStarted(true);
      setIsCompleted(false);

      setIsRecording(false);

      isRecordingRef.current =
        false;

      const message =
        'Bắt đầu luyện phát âm. Câu 1.';

      setStatus(
        `🎤 ${message}`
      );

      announceVietnamese(message);

      window.setTimeout(() => {
        if (
          isRecordingRef.current
        ) {
          return;
        }

        announceEnglish(
          firstSentence.sentence
        );
      }, 700);
    };

  const analyzePronunciation =
    async (blob) => {
      try {
        setIsAnalyzing(true);

        const loadingMessage =
          'AI đang phân tích phát âm. Vui lòng chờ.';

        setStatus(
          `🤖 ${loadingMessage}`
        );

        announceVietnamese(
          loadingMessage
        );

        const formData =
          new FormData();

        formData.append(
          'audio',
          blob,
          'pronunciation.wav'
        );

        formData.append(
          'targetText',
          targetText
        );

        const response =
          await fetch(
            'http://localhost:3001/api/pronunciation',
            {
              method: 'POST',
              body: formData,
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              'Phân tích thất bại.'
          );
        }

        setTranscript(
          result.transcript || ''
        );

        setScore(
          result.score ?? null
        );

        setFeedback(
          result.feedback || ''
        );

        setPronunciationAdvice(
          result.pronunciation || ''
        );

        const resultMessage =
          `Phân tích xong. Điểm của bạn là ${
            result.score ?? 0
          } trên 100.`;

        setStatus(
          `✅ ${resultMessage}`
        );

        readAnalysisResult(
          result
        );
      } catch (error) {
        console.error(
          'Analysis error:',
          error
        );

        const message =
          error.message ||
          'Không thể phân tích phát âm.';

        setStatus(
          `❌ ${message}`
        );

        announceVietnamese(message);
      } finally {
        setIsAnalyzing(false);
      }
    };

  const startRecording =
    async () => {
      try {
        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices
            .getUserMedia
        ) {
          const message =
            'Trình duyệt không hỗ trợ microphone.';

          setStatus(message);

          announceVietnamese(message);

          return;
        }

        if (isRecordingRef.current) {
          return;
        }

        await waitForTTSStop(300);

        if (
          'speechSynthesis' in window &&
          (
            window.speechSynthesis
              .speaking ||
            window.speechSynthesis
              .pending
          )
        ) {
          window.speechSynthesis.cancel();

          await new Promise(
            (resolve) =>
              window.setTimeout(
                resolve,
                300
              )
          );
        }

        resetResult();

        const stream =
          await navigator.mediaDevices
            .getUserMedia({
              audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });

        streamRef.current =
          stream;

        const recorder =
          new WavRecorder(
            stream
          );

        recorderRef.current =
          recorder;

        recorder.start();

        isRecordingRef.current =
          true;

        setIsRecording(true);

        setStatus(
          '🎤 Đang ghi âm. Hãy đọc câu tiếng Anh trên màn hình.'
        );
      } catch (error) {
        console.error(
          'Microphone error:',
          error
        );

        cleanupRecording();

        setIsRecording(false);

        const message =
          'Không thể sử dụng microphone. Hãy kiểm tra quyền microphone.';

        setStatus(
          `❌ ${message}`
        );

        announceVietnamese(message);
      }
    };

  const stopRecording =
    async () => {
      const recorder =
        recorderRef.current;

      if (!recorder) {
        return;
      }

      try {
        isRecordingRef.current =
          false;

        setIsRecording(false);

        const message =
          'Đã dừng ghi âm. Đang xử lý bản ghi.';

        setStatus(
          `⏳ ${message}`
        );

        const blob =
          await recorder.stop();

        cleanupRecording();

        announceVietnamese(
          message
        );

        if (
          !blob ||
          blob.size <= 44
        ) {
          const errorMessage =
            'Không tạo được bản ghi âm.';

          setStatus(
            `❌ ${errorMessage}`
          );

          announceVietnamese(
            errorMessage
          );

          return;
        }

        const url =
          URL.createObjectURL(
            blob
          );

        setAudioUrl(url);

        setStatus(
          '✅ Đã ghi âm. AI đang phân tích.'
        );

        await analyzePronunciation(
          blob
        );
      } catch (error) {
        console.error(
          'Recording error:',
          error
        );

        cleanupRecording();

        isRecordingRef.current =
          false;

        setIsRecording(false);

        const message =
          'Có lỗi khi xử lý bản ghi.';

        setStatus(
          `❌ ${message}`
        );

        announceVietnamese(message);
      }
    };

  const deleteRecording =
    () => {
      setAudioUrl((oldUrl) => {
        if (oldUrl) {
          URL.revokeObjectURL(
            oldUrl
          );
        }

        return null;
      });

      setScore(null);
      setTranscript('');
      setFeedback('');
      setPronunciationAdvice('');

      const message =
        'Đã xóa bản ghi. Nhấn nút để bắt đầu ghi âm.';

      setStatus(message);

      announceVietnamese(message);
    };

  const goToNextSentence =
    async () => {
      if (
        isRecordingRef.current ||
        isAnalyzing ||
        score === null ||
        currentSentence >=
          activeSentences.length - 1
      ) {
        return;
      }

      await waitForTTSStop(100);

      const nextIndex =
        currentSentence + 1;

      const nextSentence =
        activeSentences[nextIndex];

      setAudioUrl((oldUrl) => {
        if (oldUrl) {
          URL.revokeObjectURL(
            oldUrl
          );
        }

        return null;
      });

      setCurrentSentence(
        nextIndex
      );

      setTargetText(
        nextSentence.sentence
      );

      setTargetMeaning(
        nextSentence.meaning || ''
      );

      setScore(null);
      setTranscript('');
      setFeedback('');
      setPronunciationAdvice('');
      setIsAnalyzing(false);

      const message =
        `Câu ${nextIndex + 1}.`;

      setStatus(
        `🎤 ${message}`
      );

      announceVietnamese(message);

      window.setTimeout(() => {
        if (
          !isRecordingRef.current
        ) {
          announceEnglish(
            nextSentence.sentence
          );
        }
      }, 700);
    };

  const goToPreviousSentence =
    async () => {
      if (
        isRecordingRef.current ||
        isAnalyzing ||
        currentSentence === 0
      ) {
        return;
      }

      await waitForTTSStop(100);

      const previousIndex =
        currentSentence - 1;

      const previousSentence =
        activeSentences[
          previousIndex
        ];

      setAudioUrl((oldUrl) => {
        if (oldUrl) {
          URL.revokeObjectURL(
            oldUrl
          );
        }

        return null;
      });

      setCurrentSentence(
        previousIndex
      );

      setTargetText(
        previousSentence.sentence
      );

      setTargetMeaning(
        previousSentence.meaning ||
          ''
      );

      setScore(null);
      setTranscript('');
      setFeedback('');
      setPronunciationAdvice('');
      setIsAnalyzing(false);

      const message =
        `Câu ${previousIndex + 1}.`;

      setStatus(
        `🎤 ${message}`
      );

      announceVietnamese(message);

      window.setTimeout(() => {
        if (
          !isRecordingRef.current
        ) {
          announceEnglish(
            previousSentence.sentence
          );
        }
      }, 700);
    };

  const finishTopic = () => {
    if (
      isRecordingRef.current ||
      isAnalyzing
    ) {
      return;
    }

    /* =====================================
       REAL PROGRESS
       ===================================== */

    recordLearning(
      'pronunciation',
      15
    );

    setIsCompleted(true);

    const message =
      `Hoàn thành chủ đề ${selectedTopic}. Bạn đã luyện ${activeSentences.length} câu.`;

    announceVietnamese(message);
  };

  const backToTopics =
    () => {
      cleanupRecording();

      stopSpeaking();

      setAudioUrl((oldUrl) => {
        if (oldUrl) {
          URL.revokeObjectURL(
            oldUrl
          );
        }

        return null;
      });

      setSelectedTopic('');
      setPracticeSentences([]);

      setIsStarted(false);
      setIsCompleted(false);

      setCurrentSentence(0);

      setTargetText('');
      setTargetMeaning('');

      setIsRecording(false);

      setScore(null);
      setTranscript('');
      setFeedback('');
      setPronunciationAdvice('');
      setIsAnalyzing(false);

      const message =
        'Đã quay lại danh sách chủ đề.';

      setStatus(message);

      announceVietnamese(message);
    };

  useEffect(() => {
    return () => {
      isRecordingRef.current =
        false;

      cleanupRecording();

      try {
        stopSpeaking();
      } catch {
        // ignore
      }

      try {
        if (
          'speechSynthesis' in window
        ) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // ignore
      }
    };
  }, [stopSpeaking]);

  if (!selectedLevel) {
    return (
      <main className="pronunciation-page">

        <h1 className="page-title">
          Luyện phát âm
        </h1>

        <p className="page-subtitle">
          Chọn trình độ của bạn.
        </p>

        <section className="level-card">

          <div className="level-grid">

            {levels.map(
              (level) => (
                <button
                  key={level}
                  type="button"
                  className="level-button"
                  onClick={() =>
                    handleLevelSelect(
                      level
                    )
                  }
                  aria-label={
                    `Level ${level}`
                  }
                  data-a11y-lang="en-US"
                >

                  <span className="level-name">
                    {level}
                  </span>

                  <span className="level-description">

                    {level === 'A1' &&
                      'Cơ bản'}

                    {level === 'A2' &&
                      'Sơ cấp'}

                    {level === 'B1' &&
                      'Trung cấp'}

                    {level === 'B2' &&
                      'Trung cấp cao'}

                  </span>

                </button>
              )
            )}

          </div>

        </section>

      </main>
    );
  }

  if (!selectedTopic) {
    return (
      <main className="pronunciation-page">

        <button
          type="button"
          className="back-level-button"
          onClick={() => {
            stopSpeaking();

            setSelectedLevel('');
            setSelectedTopic('');

            announceVietnamese(
              'Đã quay lại chọn trình độ.'
            );
          }}
        >
          ← Đổi trình độ
        </button>

        <div className="selected-level">
          Trình độ:{' '}
          <strong>
            {selectedLevel}
          </strong>
        </div>

        <h1 className="page-title">
          Chọn chủ đề
        </h1>

        <p className="page-subtitle">
          Chọn một chủ đề để luyện phát âm.
        </p>

        {availableTopics.length ===
        0 ? (
          <section className="level-card">

            <h2>
              Chưa có dữ liệu
            </h2>

            <p>
              Trình độ{' '}
              {selectedLevel}{' '}
              hiện chưa có bài luyện
              phát âm.
            </p>

          </section>
        ) : (
          <section className="topic-grid">

            {availableTopics.map(
              (topic) => (

                <button
                  key={topic}
                  type="button"
                  className="topic-button"
                  onClick={() =>
                    handleTopicSelect(
                      topic
                    )
                  }
                  aria-label={topic}
                  data-a11y-lang="en-US"
                >
                  {topic}
                </button>

              )
            )}

          </section>
        )}

      </main>
    );
  }

  if (
    !isStarted &&
    !isCompleted
  ) {
    return (
      <main className="pronunciation-page">

        <button
          type="button"
          className="back-level-button"
          onClick={() => {
            stopSpeaking();

            setSelectedTopic('');
          }}
        >
          ← Đổi chủ đề
        </button>

        <div className="selected-level">
          {selectedLevel} •{' '}
          {selectedTopic}
        </div>

        <section className="level-card">

          <h2>
            {selectedTopic}
          </h2>

          <p>
            Chủ đề này có{' '}
            <strong>
              {sentences.length}
            </strong>{' '}
            câu luyện tập.
          </p>

          {sentences.length > 0 ? (
            <button
              type="button"
              className="start-practice-button"
              onClick={
                handleStartPractice
              }
            >
              Bắt đầu luyện
            </button>
          ) : (
            <p>
              Chủ đề này chưa có dữ liệu.
            </p>
          )}

        </section>

      </main>
    );
  }

  if (isCompleted) {
    return (
      <main className="pronunciation-page">

        <section className="completion-card">

          <div className="completion-icon">
            🎉
          </div>

          <h1>
            Hoàn thành!
          </h1>

          <p>
            Bạn đã hoàn thành chủ đề
          </p>

          <h2>
            {selectedTopic}
          </h2>

          <p>
            {sentences.length}{' '}
            câu luyện tập
          </p>

          <button
            type="button"
            className="start-practice-button"
            onClick={backToTopics}
          >
            ← Chọn chủ đề khác
          </button>

        </section>

      </main>
    );
  }

  const isLastSentence =
    currentSentence ===
    activeSentences.length - 1;

  const canGoNext =
    !isRecordingRef.current &&
    !isRecording &&
    !isAnalyzing &&
    score !== null;

  return (
    <main className="pronunciation-page">

      <button
        type="button"
        className="back-level-button"
        onClick={backToTopics}
        disabled={
          isRecording ||
          isAnalyzing
        }
      >
        ← Chọn chủ đề khác
      </button>

      <div className="selected-level">
        {selectedLevel} •{' '}
        {selectedTopic}
      </div>

      <div className="sentence-counter">
        Câu {currentSentence + 1} /{' '}
        {sentences.length}
      </div>

      <section className="pronunciation-card">

        <div
          className="word-display"
          aria-live="polite"
        >

          <span className="word-label">
            Câu cần đọc
          </span>

          <h2>
            {targetText}
          </h2>

          {targetMeaning && (
            <p className="target-meaning">
              {targetMeaning}
            </p>
          )}

        </div>


        <button
          type="button"
          className={`record-button ${
            isRecording
              ? 'recording'
              : ''
          }`}
          onClick={
            isRecording
              ? stopRecording
              : startRecording
          }
          disabled={isAnalyzing}
          aria-label={
            isRecording
              ? 'Dừng ghi âm'
              : `Bắt đầu ghi âm câu ${
                  currentSentence + 1
                }`
          }
          aria-pressed={
            isRecording
          }
        >
          {isRecording
            ? '⏹ Dừng ghi âm'
            : '🎤 Bắt đầu luyện nói'}
        </button>


        <p
          className="pronunciation-status"
          aria-live="polite"
          aria-atomic="true"
        >
          {status}
        </p>


        {audioUrl && (
          <div className="audio-preview">

            <p>
              🎧{' '}
              <strong>
                Bản ghi của bạn:
              </strong>
            </p>

            <audio
              controls
              src={audioUrl}
              className="audio-player"
            >
              Trình duyệt không hỗ trợ
              phát âm thanh.
            </audio>

            <button
              type="button"
              className="delete-audio-button"
              onClick={
                deleteRecording
              }
              disabled={isAnalyzing}
            >
              🗑 Xóa bản ghi
            </button>

          </div>
        )}


        {audioUrl && (
          <div
            className="pronunciation-result"
            aria-live="polite"
          >

            <div className="score-circle">

              <span className="score-number">
                {isAnalyzing
                  ? '--'
                  : score ?? '--'}
              </span>

              <span className="score-label">
                /100
              </span>

            </div>


            <div className="result-content">

              <h3>
                Kết quả phát âm
              </h3>

              {isAnalyzing ? (
                <p>
                  🤖 AI đang phân tích...
                </p>
              ) : (
                <>
                  {transcript && (
                    <p>
                      <strong>
                        Bạn nói:
                      </strong>{' '}
                      {transcript}
                    </p>
                  )}

                  {feedback && (
                    <p>
                      {feedback}
                    </p>
                  )}

                  {pronunciationAdvice && (
                    <p>
                      <strong>
                        Gợi ý:
                      </strong>{' '}
                      {pronunciationAdvice}
                    </p>
                  )}

                  {!transcript &&
                    !feedback &&
                    !pronunciationAdvice &&
                    score === null && (
                      <p>
                        Chưa có kết quả
                        phân tích.
                      </p>
                    )}

                </>
              )}

            </div>

          </div>
        )}


        <div className="sentence-navigation">

          <button
            type="button"
            onClick={
              goToPreviousSentence
            }
            disabled={
              currentSentence === 0 ||
              isRecording ||
              isAnalyzing
            }
            aria-label="Câu trước"
          >
            ← Câu trước
          </button>


          {isLastSentence ? (

            <button
              type="button"
              onClick={finishTopic}
              disabled={!canGoNext}
            >
              Hoàn thành 🎉
            </button>

          ) : (

            <button
              type="button"
              onClick={
                goToNextSentence
              }
              disabled={!canGoNext}
              aria-label="Câu tiếp theo"
            >
              Câu tiếp →
            </button>

          )}

        </div>

      </section>

    </main>
  );
}