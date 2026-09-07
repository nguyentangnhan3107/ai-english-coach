import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

const A11yContext = createContext();

const DEFAULT_PREFERENCES = {
  mode: 'standard',
  highContrast: false,
  fontSize: 'medium',
  autoTTS: false,
  ttsRate: 1,
  voiceNavigation: false,
};

export function A11yProvider({ children }) {
  const [preferences, setPreferences] = useState(
    DEFAULT_PREFERENCES
  );

  const lastSpeechRef = useRef({
    text: '',
    lang: '',
    time: 0,
  });

  const focusTimerRef = useRef(null);
  const keyboardNavigationRef = useRef(false);

  // =====================================================
  // UPDATE PREFERENCE
  // =====================================================

  const updatePreference = useCallback(
    (key, value) => {
      setPreferences((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  // =====================================================
  // TOGGLE ACCESSIBILITY MODE
  // =====================================================

  const toggleMode = useCallback(() => {
    setPreferences((prev) => {
      const accessibility =
        prev.mode !== 'accessibility';

      return {
        ...prev,
        mode: accessibility
          ? 'accessibility'
          : 'standard',
        voiceNavigation: accessibility,
      };
    });
  }, []);

  // =====================================================
  // GET VOICE
  // =====================================================

  const getBestVoice = useCallback(
    (lang) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        return null;
      }

      const voices =
        window.speechSynthesis.getVoices();

      if (!voices.length) {
        return null;
      }

      const wanted =
        lang
          ?.toLowerCase()
          .startsWith('vi')
          ? 'vi'
          : 'en';

      // -------------------------------------------------
      // Ưu tiên voice đúng ngôn ngữ
      // -------------------------------------------------

      const exactVoice = voices.find(
        (voice) =>
          voice.lang
            ?.toLowerCase()
            .startsWith(wanted)
      );

      if (exactVoice) {
        return exactVoice;
      }

      // -------------------------------------------------
      // Fallback theo tên voice
      // -------------------------------------------------

      const namedVoice = voices.find(
        (voice) => {
          const name =
            voice.name?.toLowerCase() || '';

          if (wanted === 'vi') {
            return (
              name.includes('vietnam') ||
              name.includes('việt') ||
              name.includes('hoai') ||
              name.includes('nam')
            );
          }

          return (
            name.includes('english') ||
            name.includes('united states') ||
            name.includes('google us') ||
            name.includes('us english')
          );
        }
      );

      return namedVoice || null;
    },
    []
  );

  // =====================================================
  // SPEAK
  // =====================================================

  const speak = useCallback(
    (
      text,
      {
        lang = 'vi-VN',
        rate,
        onStart,
        onEnd,
        force = false,
      } = {}
    ) => {
      if (!text?.trim()) {
        return;
      }

      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        return;
      }

      const cleanText = text
        .replace(/\s+/g, ' ')
        .trim();

      const now = Date.now();

      // =================================================
      // CHỐNG ĐỌC TRÙNG
      // =================================================

      if (!force) {
        const last =
          lastSpeechRef.current;

        if (
          last.text === cleanText &&
          last.lang === lang &&
          now - last.time < 1500
        ) {
          return;
        }
      }

      lastSpeechRef.current = {
        text: cleanText,
        lang,
        time: now,
      };

      /*
       * speak() là chế độ đọc bình thường.
       * Nó hủy câu trước để tránh đọc chồng.
       */
      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(
          cleanText
        );

      utterance.lang = lang;

      const defaultRate =
        preferences?.ttsRate || 1;

      utterance.rate =
        rate ??
        (
          preferences?.mode ===
          'accessibility'
            ? Math.min(
                defaultRate,
                0.95
              )
            : defaultRate
        );

      utterance.pitch = 1;
      utterance.volume = 1;

      const voice =
        getBestVoice(lang);

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        onEnd?.();
      };

      utterance.onerror = () => {
        onEnd?.();
      };

      window.speechSynthesis.speak(
        utterance
      );
    },
    [
      preferences?.ttsRate,
      preferences?.mode,
      getBestVoice,
    ]
  );

  // =====================================================
  // SPEAK SEQUENCE
  //
  // Đọc nhiều đoạn khác ngôn ngữ theo thứ tự.
  //
  // QUAN TRỌNG:
  // Không cancel giữa các đoạn.
  // Browser sẽ tự xếp hàng.
  // =====================================================

  const speakSequence = useCallback(
    (
      items,
      {
        force = false,
        onComplete,
      } = {}
    ) => {
      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return;
      }

      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        return;
      }

      /*
       * Xóa hàng đợi cũ một lần duy nhất.
       */
      window.speechSynthesis.cancel();

      lastSpeechRef.current = {
        text: '',
        lang: '',
        time: 0,
      };

      const validItems =
        items.filter(
          (item) =>
            item?.text?.trim()
        );

      if (!validItems.length) {
        return;
      }

      let completed = 0;

      validItems.forEach(
        (item, index) => {
          const cleanText =
            item.text
              .replace(/\s+/g, ' ')
              .trim();

          const lang =
            item.lang || 'vi-VN';

          const utterance =
            new SpeechSynthesisUtterance(
              cleanText
            );

          utterance.lang = lang;

          const defaultRate =
            preferences?.ttsRate || 1;

          utterance.rate =
            item.rate ??
            (
              preferences?.mode ===
              'accessibility'
                ? Math.min(
                    defaultRate,
                    0.95
                  )
                : defaultRate
            );

          utterance.pitch =
            item.pitch ?? 1;

          utterance.volume =
            item.volume ?? 1;

          const voice =
            getBestVoice(lang);

          if (voice) {
            utterance.voice = voice;
          }

          utterance.onstart = () => {
            item.onStart?.();
          };

          utterance.onend = () => {
            item.onEnd?.();

            completed += 1;

            if (
              completed ===
              validItems.length
            ) {
              onComplete?.();
            }
          };

          utterance.onerror = () => {
            item.onEnd?.();

            completed += 1;

            if (
              completed ===
              validItems.length
            ) {
              onComplete?.();
            }
          };

          /*
           * Không gọi cancel() ở đây.
           *
           * speechSynthesis sẽ xếp các utterance
           * vào queue theo đúng thứ tự.
           */
          window.speechSynthesis.speak(
            utterance
          );
        }
      );
    },
    [
      preferences?.ttsRate,
      preferences?.mode,
      getBestVoice,
    ]
  );

  // =====================================================
  // STOP SPEAKING
  // =====================================================

  const stopSpeaking = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.cancel();
    }

    lastSpeechRef.current = {
      text: '',
      lang: '',
      time: 0,
    };
  }, []);

  // =====================================================
  // ANNOUNCE
  // =====================================================

  const announce = useCallback(
    (
      text,
      {
        lang = 'vi-VN',
        force = false,
        rate,
      } = {}
    ) => {
      if (!text?.trim()) {
        return;
      }

      if (
        !force &&
        preferences?.mode !==
          'accessibility'
      ) {
        return;
      }

      speak(text, {
        lang,
        force,
        rate,
      });
    },
    [
      preferences?.mode,
      speak,
    ]
  );

  // =====================================================
  // KEYBOARD DETECTION
  // =====================================================

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === 'Tab' ||
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        keyboardNavigationRef.current =
          true;
      }

      if (event.key === 'Escape') {
        stopSpeaking();
      }
    };

    const handlePointerDown = () => {
      keyboardNavigationRef.current =
        false;
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    window.addEventListener(
      'pointerdown',
      handlePointerDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );

      window.removeEventListener(
        'pointerdown',
        handlePointerDown
      );
    };
  }, [stopSpeaking]);

  // =====================================================
  // ACCESSIBILITY FOCUS READING
  // =====================================================

  useEffect(() => {
    if (
      preferences?.mode !==
      'accessibility'
    ) {
      return;
    }

    if (
      !preferences?.voiceNavigation
    ) {
      return;
    }

    const handleFocus = (event) => {
      const element =
        event.target;

      if (
        !element ||
        !element.matches
      ) {
        return;
      }

      if (
        !keyboardNavigationRef.current
      ) {
        return;
      }

      if (
        element.hasAttribute(
          'data-a11y-silent'
        )
      ) {
        return;
      }

      const label =
        element.getAttribute(
          'aria-label'
        );

      const labelledBy =
        element.getAttribute(
          'aria-labelledby'
        );

      let text = label || '';

      if (
        !text &&
        labelledBy
      ) {
        const labelElement =
          document.getElementById(
            labelledBy
          );

        text =
          labelElement?.textContent ||
          '';
      }

      if (!text) {
        text =
          element.textContent?.trim() ||
          '';
      }

      if (!text) {
        return;
      }

      text = text
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 220);

      if (!text) {
        return;
      }

      clearTimeout(
        focusTimerRef.current
      );

      focusTimerRef.current =
        setTimeout(() => {
          const lang =
            element.getAttribute(
              'data-a11y-lang'
            ) ||
            'vi-VN';

          speak(text, {
            lang,
            rate: 0.9,
          });
        }, 180);
    };

    document.addEventListener(
      'focusin',
      handleFocus
    );

    return () => {
      document.removeEventListener(
        'focusin',
        handleFocus
      );

      clearTimeout(
        focusTimerRef.current
      );
    };
  }, [
    preferences?.mode,
    preferences?.voiceNavigation,
    speak,
  ]);

  // =====================================================
  // SPEECH VOICES READY
  // =====================================================

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window)
    ) {
      return;
    }

    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();

    window.speechSynthesis.addEventListener(
      'voiceschanged',
      loadVoices
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        loadVoices
      );
    };
  }, []);

  // =====================================================
  // BODY ATTRIBUTES
  // =====================================================

  useEffect(() => {
    document.body.setAttribute(
      'data-mode',
      preferences.mode
    );

    document.body.setAttribute(
      'data-high-contrast',
      preferences.highContrast
        ? 'true'
        : 'false'
    );

    document.body.setAttribute(
      'data-font-size',
      preferences.fontSize
    );

    document.body.setAttribute(
      'data-voice-navigation',
      preferences.voiceNavigation
        ? 'true'
        : 'false'
    );
  }, [
    preferences.mode,
    preferences.highContrast,
    preferences.fontSize,
    preferences.voiceNavigation,
  ]);

  // =====================================================
  // CLEANUP
  // =====================================================

  useEffect(() => {
    return () => {
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
      }

      clearTimeout(
        focusTimerRef.current
      );
    };
  }, []);

  // =====================================================
  // CONTEXT
  // =====================================================

  return (
    <A11yContext.Provider
      value={{
        preferences,
        updatePreference,
        toggleMode,
        announce,
        speak,
        speakSequence,
        stopSpeaking,
      }}
    >
      {children}
    </A11yContext.Provider>
  );
}

export const useA11y = () =>
  useContext(A11yContext);