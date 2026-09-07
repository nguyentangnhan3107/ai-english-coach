import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { useA11y } from '../contexts/A11yContext';

import {
  recordLearning,
} from '../utils/progressManager';

import './Translation.css';

export default function Translation() {
  const {
    preferences,
    announce,
    speak,
    stopSpeaking,
  } = useA11y();

  const [sourceText, setSourceText] =
    useState('');

  const [translatedText, setTranslatedText] =
    useState('');

  const [sourceLanguage, setSourceLanguage] =
    useState('vi');

  const [targetLanguage, setTargetLanguage] =
    useState('en');

  const [isTranslating, setIsTranslating] =
    useState(false);

  const [isRecording, setIsRecording] =
    useState(false);

  const [isConvertingSpeech, setIsConvertingSpeech] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState('');

  const mediaRecorderRef =
    useRef(null);

  const audioChunksRef =
    useRef([]);

  const isRecordingRef =
    useRef(false);

  const startCancelledRef =
    useRef(false);

  const sourceLanguageName =
    sourceLanguage === 'vi'
      ? 'Tiếng Việt'
      : 'Tiếng Anh';

  const targetLanguageName =
    targetLanguage === 'vi'
      ? 'Tiếng Việt'
      : 'Tiếng Anh';

  const sourceSpeechLanguage =
    sourceLanguage === 'vi'
      ? 'vi-VN'
      : 'en-US';

  const targetSpeechLanguage =
    targetLanguage === 'vi'
      ? 'vi-VN'
      : 'en-US';

  const safeAnnounce =
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

        announce(text, options);
      },
      [announce]
    );

  const convertSpeechToText =
    useCallback(
      async (audioBlob) => {
        setIsConvertingSpeech(true);

        const loadingMessage =
          'AI đang nhận dạng giọng nói. Vui lòng chờ.';

        setStatusMessage(
          `🤖 ${loadingMessage}`
        );

        safeAnnounce(
          loadingMessage,
          {
            lang: 'vi-VN',
          }
        );

        try {
          const formData =
            new FormData();

          const extension =
            audioBlob.type.includes(
              'webm'
            )
              ? 'webm'
              : 'audio';

          formData.append(
            'audio',
            audioBlob,
            `speech.${extension}`
          );

          formData.append(
            'language',
            sourceLanguage
          );

          const response =
            await fetch(
              'http://localhost:3001/api/speech-to-text',
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
                'Không thể nhận dạng giọng nói.'
            );
          }

          const transcript =
            result.transcript?.trim();

          if (!transcript) {
            throw new Error(
              'Không nhận được nội dung giọng nói.'
            );
          }

          setSourceText(
            (previousText) => {
              if (
                !previousText.trim()
              ) {
                return transcript;
              }

              return `${previousText.trim()} ${transcript}`;
            }
          );

          setStatusMessage(
            '✅ Đã nhận dạng giọng nói.'
          );

          safeAnnounce(
            'Đã nhận dạng giọng nói thành công.',
            {
              lang: 'vi-VN',
            }
          );
        } catch (error) {
          console.error(
            'Speech to text error:',
            error
          );

          const message =
            error.message ||
            'Không thể nhận dạng giọng nói.';

          setStatusMessage(
            `❌ ${message}`
          );

          safeAnnounce(message, {
            lang: 'vi-VN',
          });
        } finally {
          setIsConvertingSpeech(
            false
          );
        }
      },
      [
        sourceLanguage,
        safeAnnounce,
      ]
    );

  const startRecording =
    useCallback(async () => {
      try {
        startCancelledRef.current =
          false;

        stopSpeaking();

        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !==
            'inactive'
        ) {
          try {
            mediaRecorderRef.current.stop();
          } catch (error) {
            console.warn(
              'Could not stop old recorder:',
              error
            );
          }
        }

        if (
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          const message =
            'Trình duyệt không hỗ trợ microphone.';

          setStatusMessage(
            `❌ ${message}`
          );

          safeAnnounce(message, {
            lang: 'vi-VN',
          });

          return;
        }

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: {
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }
          );

        if (
          startCancelledRef.current
        ) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          return;
        }

        audioChunksRef.current = [];

        let mimeType =
          'audio/webm;codecs=opus';

        if (
          !MediaRecorder.isTypeSupported(
            mimeType
          )
        ) {
          mimeType =
            'audio/webm';
        }

        if (
          !MediaRecorder.isTypeSupported(
            mimeType
          )
        ) {
          mimeType = '';
        }

        const recorder =
          mimeType
            ? new MediaRecorder(
                stream,
                { mimeType }
              )
            : new MediaRecorder(
                stream
              );

        mediaRecorderRef.current =
          recorder;

        recorder.ondataavailable = (
          event
        ) => {
          if (
            event.data &&
            event.data.size > 0
          ) {
            audioChunksRef.current.push(
              event.data
            );
          }
        };

        recorder.onstop = async () => {
          try {
            isRecordingRef.current =
              false;

            setIsRecording(false);

            stream
              .getTracks()
              .forEach((track) =>
                track.stop()
              );

            const blob =
              new Blob(
                audioChunksRef.current,
                {
                  type:
                    recorder.mimeType ||
                    'audio/webm',
                }
              );

            audioChunksRef.current =
              [];

            mediaRecorderRef.current =
              null;

            if (blob.size === 0) {
              const message =
                'Không thu được âm thanh.';

              setStatusMessage(
                `❌ ${message}`
              );

              safeAnnounce(message, {
                lang: 'vi-VN',
              });

              return;
            }

            setStatusMessage(
              '⏳ Đang xử lý bản ghi.'
            );

            await convertSpeechToText(
              blob
            );
          } catch (error) {
            console.error(
              'Audio processing error:',
              error
            );

            setIsConvertingSpeech(
              false
            );

            const message =
              'Có lỗi khi xử lý bản ghi.';

            setStatusMessage(
              `❌ ${message}`
            );

            safeAnnounce(message, {
              lang: 'vi-VN',
            });
          }
        };

        stopSpeaking();

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              350
            )
        );

        if (
          startCancelledRef.current
        ) {
          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          return;
        }

        recorder.start();

        isRecordingRef.current =
          true;

        setIsRecording(true);

        const recordingMessage =
          sourceLanguage === 'vi'
            ? 'Đang nghe. Hãy nói tiếng Việt.'
            : 'Đang nghe. Hãy nói tiếng Anh.';

        setStatusMessage(
          `🎤 ${recordingMessage}`
        );
      } catch (error) {
        console.error(
          'Microphone error:',
          error
        );

        isRecordingRef.current =
          false;

        setIsRecording(false);

        let message =
          'Không thể khởi động microphone.';

        if (
          error.name ===
          'NotAllowedError'
        ) {
          message =
            'Microphone bị từ chối. Hãy cho phép microphone trên trình duyệt.';
        } else if (
          error.name ===
          'NotFoundError'
        ) {
          message =
            'Không tìm thấy microphone.';
        } else if (
          error.name ===
          'NotReadableError'
        ) {
          message =
            'Microphone đang được sử dụng bởi ứng dụng khác.';
        }

        setStatusMessage(
          `❌ ${message}`
        );

        safeAnnounce(message, {
          lang: 'vi-VN',
        });
      }
    }, [
      sourceLanguage,
      safeAnnounce,
      stopSpeaking,
      convertSpeechToText,
    ]);

  const stopRecording =
    useCallback(() => {
      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !==
          'inactive'
      ) {
        isRecordingRef.current =
          false;

        setIsRecording(false);

        setStatusMessage(
          '⏳ Đã dừng ghi âm. Đang xử lý bản ghi.'
        );

        try {
          recorder.stop();
        } catch (error) {
          console.error(
            'Stop recording error:',
            error
          );
        }

        return;
      }

      isRecordingRef.current =
        false;

      setIsRecording(false);
    }, []);

  const toggleRecording =
    useCallback(() => {
      if (
        isRecording ||
        isConvertingSpeech
      ) {
        if (isRecording) {
          stopRecording();
        }

        return;
      }

      startRecording();
    }, [
      isRecording,
      isConvertingSpeech,
      startRecording,
      stopRecording,
    ]);

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        event.ctrlKey &&
        event.code === 'Space'
      ) {
        event.preventDefault();

        toggleRecording();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [toggleRecording]);

  const handlePlayTTS =
    useCallback(
      (textToRead) => {
        if (
          isRecordingRef.current
        ) {
          return;
        }

        const text =
          textToRead ||
          translatedText;

        if (!text?.trim()) {
          const message =
            'Chưa có bản dịch để đọc.';

          setStatusMessage(message);

          safeAnnounce(message, {
            lang: 'vi-VN',
          });

          return;
        }

        stopSpeaking();

        setStatusMessage(
          '🔊 Đang đọc bản dịch...'
        );

        speak(text, {
          lang:
            targetSpeechLanguage,

          rate:
            preferences?.ttsRate || 1,

          onEnd: () => {
            setStatusMessage(
              '✅ Đã đọc xong.'
            );
          },
        });
      },
      [
        translatedText,
        targetSpeechLanguage,
        preferences?.ttsRate,
        safeAnnounce,
        speak,
        stopSpeaking,
      ]
    );

  const handleTranslate =
    async () => {
      if (!sourceText.trim()) {
        const message =
          'Vui lòng nhập văn bản cần dịch.';

        setStatusMessage(message);

        safeAnnounce(message, {
          lang: 'vi-VN',
        });

        return;
      }

      if (isRecording) {
        stopRecording();
        return;
      }

      if (isConvertingSpeech) {
        return;
      }

      stopSpeaking();

      setIsTranslating(true);

      const loadingMessage =
        'AI đang dịch. Vui lòng chờ.';

      setStatusMessage(
        `🤖 ${loadingMessage}`
      );

      safeAnnounce(
        loadingMessage,
        {
          lang: 'vi-VN',
        }
      );

      try {
        const response =
          await fetch(
            'http://localhost:3001/api/translation',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                text:
                  sourceText.trim(),

                sourceLanguage,

                targetLanguage,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              'Dịch thất bại.'
          );
        }

        const translation =
          result.translation ||
          '';

        setTranslatedText(
          translation
        );

        /* =====================================
           REAL PROGRESS
           ===================================== */

        if (translation.trim()) {
          recordLearning(
            'translation',
            10
          );
        }

        setStatusMessage(
          '✅ Đã dịch xong.'
        );

        safeAnnounce(
          'Đã dịch xong.',
          {
            lang: 'vi-VN',
          }
        );

        if (
          preferences?.autoTTS &&
          translation
        ) {
          setTimeout(() => {
            if (
              !isRecordingRef.current
            ) {
              handlePlayTTS(
                translation
              );
            }
          }, 200);
        }
      } catch (error) {
        console.error(
          'Translation error:',
          error
        );

        const message =
          error.message ||
          'Lỗi kết nối Server.';

        setStatusMessage(
          `❌ ${message}`
        );

        safeAnnounce(message, {
          lang: 'vi-VN',
        });
      } finally {
        setIsTranslating(false);
      }
    };

  const handleSwapLanguages =
    () => {
      if (isRecording) {
        stopRecording();
      }

      if (isConvertingSpeech) {
        return;
      }

      stopSpeaking();

      const oldSource =
        sourceLanguage;

      const oldTarget =
        targetLanguage;

      const oldSourceText =
        sourceText;

      const oldTranslatedText =
        translatedText;

      setSourceLanguage(
        oldTarget
      );

      setTargetLanguage(
        oldSource
      );

      setSourceText(
        oldTranslatedText
      );

      setTranslatedText(
        oldSourceText
      );

      const message =
        'Đã đổi chiều dịch.';

      setStatusMessage(
        `🔄 ${message}`
      );

      safeAnnounce(message, {
        lang: 'vi-VN',
      });
    };

  const handleClear = () => {
    if (isRecording) {
      stopRecording();
    }

    if (isConvertingSpeech) {
      return;
    }

    stopSpeaking();

    setSourceText('');
    setTranslatedText('');

    const message =
      'Đã xóa nội dung.';

    setStatusMessage(message);

    safeAnnounce(message, {
      lang: 'vi-VN',
    });
  };

  useEffect(() => {
    return () => {
      startCancelledRef.current =
        true;

      isRecordingRef.current =
        false;

      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !==
          'inactive'
      ) {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.warn(
            'Cleanup recorder error:',
            error
          );
        }
      }

      stopSpeaking();
    };
  }, [stopSpeaking]);

  return (
    <main
      className="translation-container"
      aria-label="Trang dịch thuật Việt Anh"
    >

      <h1 className="page-title">
        Dịch thuật Việt ↔ Anh
      </h1>

      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {statusMessage}
      </div>

      <div className="translation-grid">

        <section
          className="trans-box source-box"
          aria-labelledby="label-source"
        >

          <div className="box-header">

            <span
              id="label-source"
              className="lang-label"
            >
              <span className="badge">
                NGUỒN
              </span>

              {sourceLanguageName}
            </span>

            <button
              type="button"
              className={`btn-mic ${
                isRecording
                  ? 'recording'
                  : ''
              }`}
              onClick={
                toggleRecording
              }
              disabled={
                isTranslating ||
                isConvertingSpeech
              }
              aria-label={
                isConvertingSpeech
                  ? 'Đang xử lý giọng nói'
                  : isRecording
                  ? 'Dừng ghi âm'
                  : `Bắt đầu nói bằng ${sourceLanguageName}`
              }
              aria-pressed={
                isRecording
              }
              data-a11y-lang="vi-VN"
            >
              {isConvertingSpeech
                ? '🤖 Đang xử lý...'
                : isRecording
                ? '⏹ Dừng'
                : '🎤 Nói'}
            </button>

          </div>

          <textarea
            id="source-input"
            className="trans-textarea"
            placeholder={
              sourceLanguage === 'vi'
                ? 'Nhập tiếng Việt hoặc bấm microphone để nói...'
                : 'Nhập tiếng Anh hoặc bấm microphone để nói...'
            }
            value={sourceText}
            onChange={(event) =>
              setSourceText(
                event.target.value
              )
            }
            rows={6}
            aria-label={`Nội dung nguồn, ${sourceLanguageName}`}
            data-a11y-lang={
              sourceSpeechLanguage
            }
          />

          <div className="box-actions">

            <button
              type="button"
              className="btn-primary"
              onClick={
                handleTranslate
              }
              disabled={
                isTranslating ||
                isRecording ||
                isConvertingSpeech ||
                !sourceText.trim()
              }
              aria-label={`Dịch từ ${sourceLanguageName} sang ${targetLanguageName}`}
              data-a11y-lang="vi-VN"
            >
              {isTranslating
                ? '🤖 Đang dịch...'
                : `Dịch sang ${targetLanguageName}`}
            </button>

          </div>

        </section>


        <section
          className="trans-box target-box"
          aria-labelledby="label-target"
        >

          <div className="box-header">

            <span
              id="label-target"
              className="lang-label"
            >
              <span className="badge">
                KẾT QUẢ
              </span>

              {targetLanguageName}
            </span>

            {translatedText && (
              <button
                type="button"
                className="btn-tts"
                onClick={() =>
                  handlePlayTTS()
                }
                aria-label="Đọc bản dịch bằng giọng nói"
                data-a11y-lang="vi-VN"
              >
                🔊 Đọc
              </button>
            )}

          </div>

          <div
            className="trans-result-display"
            tabIndex={0}
            role="region"
            aria-label="Khung hiển thị kết quả bản dịch"
            aria-live="polite"
          >

            {translatedText ? (
              <p
                className="result-text"
                lang={
                  targetLanguage === 'vi'
                    ? 'vi'
                    : 'en'
                }
              >
                {translatedText}
              </p>
            ) : (
              <p className="placeholder-text">
                Bản dịch sẽ hiển thị ở đây.
              </p>
            )}

          </div>

        </section>

      </div>


      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginTop: '20px',
          flexWrap: 'wrap',
        }}
      >

        <button
          type="button"
          className="btn-tts"
          onClick={
            handleSwapLanguages
          }
          aria-label="Đổi chiều dịch Việt Anh"
          data-a11y-lang="vi-VN"
        >
          🔄 Đổi Việt ↔ Anh
        </button>

        <button
          type="button"
          className="btn-tts"
          onClick={
            handleClear
          }
          aria-label="Xóa toàn bộ nội dung dịch"
          data-a11y-lang="vi-VN"
        >
          🗑 Xóa
        </button>

      </div>

    </main>
  );
}