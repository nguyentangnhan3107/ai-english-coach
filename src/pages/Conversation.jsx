import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';

import { useA11y } from '../contexts/A11yContext';

import {
  recordLearning,
} from '../utils/progressManager';

import './Conversation.css';

const API_URL =
  'http://localhost:3001';

const TOPICS = [
  {
    id: 'daily',
    icon: '🌱',
    name: 'Daily Life',
    description:
      'Talk about everyday life',
  },
  {
    id: 'school',
    icon: '📚',
    name: 'School',
    description:
      'Talk about school and studying',
  },
  {
    id: 'travel',
    icon: '✈️',
    name: 'Travel',
    description:
      'Talk about trips and places',
  },
  {
    id: 'hobbies',
    icon: '🎮',
    name: 'Hobbies',
    description:
      'Talk about your interests',
  },
];

const LEVELS = [
  {
    id: 'A1',
    name: 'A1',
    description: 'Beginner',
  },
  {
    id: 'A2',
    name: 'A2',
    description: 'Elementary',
  },
  {
    id: 'B1',
    name: 'B1',
    description: 'Intermediate',
  },
  {
    id: 'B2',
    name: 'B2',
    description:
      'Upper Intermediate',
  },
];

export default function Conversation() {
  const {
    preferences,
    announce,
    speak,
    stopSpeaking,
  } = useA11y();

  const [started, setStarted] =
    useState(false);

  const [
    selectedTopic,
    setSelectedTopic,
  ] = useState('daily');

  const [
    selectedLevel,
    setSelectedLevel,
  ] = useState('A1');

  const [message, setMessage] =
    useState('');

  const [messages, setMessages] =
    useState([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [
    conversations,
    setConversations,
  ] = useState([]);

  const [
    currentConversationId,
    setCurrentConversationId,
  ] = useState(null);

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    speakingIndex,
    setSpeakingIndex,
  ] = useState(null);

  const mediaRecorderRef =
    useRef(null);

  const audioChunksRef =
    useRef([]);

  const historyButtonRef =
    useRef(null);

  const sidebarCloseButtonRef =
    useRef(null);

  const announceVietnamese =
    useCallback(
      (
        text,
        options = {}
      ) => {
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

  const speakEnglish =
    useCallback(
      (
        text,
        options = {}
      ) => {
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

  useEffect(() => {
    const saved =
      localStorage.getItem(
        'conversationHistory'
      );

    if (saved) {
      try {
        const parsed =
          JSON.parse(saved);

        if (
          Array.isArray(parsed)
        ) {
          setConversations(parsed);
        } else {
          localStorage.removeItem(
            'conversationHistory'
          );
        }
      } catch {
        localStorage.removeItem(
          'conversationHistory'
        );
      }
    }
  }, []);

  useEffect(() => {
    if (
      !started ||
      messages.length === 0
    ) {
      return;
    }

    setConversations((prev) => {
      if (!currentConversationId) {
        return prev;
      }

      const updated =
        prev.map(
          (conversation) => {
            if (
              conversation.id !==
              currentConversationId
            ) {
              return conversation;
            }

            return {
              ...conversation,
              messages,
              updatedAt:
                Date.now(),
            };
          }
        );

      localStorage.setItem(
        'conversationHistory',
        JSON.stringify(updated)
      );

      return updated;
    });
  }, [
    messages,
    started,
    currentConversationId,
  ]);

  const startConversation =
    async () => {
      if (isLoading) {
        return;
      }

      stopSpeaking();
      setIsLoading(true);

      announceVietnamese(
        'Đang bắt đầu cuộc hội thoại. Vui lòng chờ.'
      );

      try {
        const response =
          await fetch(
            `${API_URL}/api/conversation/start`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                topic:
                  selectedTopic,

                level:
                  selectedLevel,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              'Không thể bắt đầu cuộc hội thoại.'
          );
        }

        const id =
          Date.now();

        const firstMessage = {
          sender: 'ai',
          text:
            result.reply || '',
        };

        const newConversation = {
          id,

          topic:
            selectedTopic,

          level:
            selectedLevel,

          messages: [
            firstMessage,
          ],

          createdAt:
            Date.now(),

          updatedAt:
            Date.now(),
        };

        setConversations(
          (prev) => {
            const updated = [
              newConversation,
              ...prev,
            ];

            localStorage.setItem(
              'conversationHistory',
              JSON.stringify(updated)
            );

            return updated;
          }
        );

        setCurrentConversationId(
          id
        );

        setMessages([
          firstMessage,
        ]);

        setStarted(true);

        announceVietnamese(
          `Cuộc hội thoại đã bắt đầu. Chủ đề ${selectedTopic}. Trình độ ${selectedLevel}.`
        );

        window.setTimeout(() => {
          speakEnglish(
            result.reply
          );
        }, 800);
      } catch (error) {
        console.error(
          'Start conversation error:',
          error
        );

        const errorMessage =
          error.message ||
          'Không thể bắt đầu cuộc hội thoại.';

        announceVietnamese(
          errorMessage,
          {
            force: true,
          }
        );
      } finally {
        setIsLoading(false);
      }
    };

  const handleSend =
    async () => {
      const text =
        message.trim();

      if (
        !text ||
        isLoading
      ) {
        return;
      }

      stopSpeaking();

      const oldMessages =
        messages;

      setMessages((prev) => [
        ...prev,

        {
          sender: 'user',
          text,
        },
      ]);

      setMessage('');
      setIsLoading(true);

      announceVietnamese(
        'AI đang xử lý câu trả lời của bạn.'
      );

      try {
        const response =
          await fetch(
            `${API_URL}/api/conversation`,
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                message: text,

                history:
                  oldMessages,

                topic:
                  selectedTopic,

                level:
                  selectedLevel,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              'Conversation thất bại.'
          );
        }

        const aiMessage = {
          sender: 'ai',
          text:
            result.reply || '',
        };

        setMessages((prev) => [
          ...prev,
          aiMessage,
        ]);

        /* =================================
           REAL PROGRESS
           ================================= */

        if (
          result.reply?.trim()
        ) {
          recordLearning(
            'conversation',
            20
          );
        }

        speakEnglish(
          result.reply
        );
      } catch (error) {
        console.error(
          'Conversation error:',
          error
        );

        const errorMessage =
          error.message ||
          'Không thể nhận được câu trả lời từ AI.';

        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: errorMessage,
          },
        ]);

        announceVietnamese(
          errorMessage,
          {
            force: true,
          }
        );
      } finally {
        setIsLoading(false);
      }
    };

  const handleKeyDown =
    (event) => {
      if (
        event.key === 'Enter' &&
        !event.shiftKey
      ) {
        event.preventDefault();

        handleSend();
      }
    };

  const speakText =
    useCallback(
      (
        text,
        index = null
      ) => {
        if (!text?.trim()) {
          return;
        }

        if (index !== null) {
          setSpeakingIndex(index);
        }

        const normalRate =
          preferences?.ttsRate ||
          0.9;

        const accessibilityRate =
          Math.min(
            normalRate,
            0.9
          );

        speakEnglish(text, {
          rate:
            preferences?.mode ===
            'accessibility'
              ? accessibilityRate
              : normalRate,

          onEnd: () => {
            if (
              index !== null
            ) {
              setSpeakingIndex(null);
            }
          },
        });
      },
      [
        preferences?.ttsRate,
        preferences?.mode,
        speakEnglish,
      ]
    );

  const handleStopSpeaking =
    () => {
      stopSpeaking();
      setSpeakingIndex(null);
    };

  const startRecording =
    async () => {
      if (
        isLoading ||
        isRecording
      ) {
        return;
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        announceVietnamese(
          'Trình duyệt không hỗ trợ microphone.',
          {
            force: true,
          }
        );

        return;
      }

      try {
        stopSpeaking();

        setSpeakingIndex(null);

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

        const recorder =
          new MediaRecorder(
            stream
          );

        mediaRecorderRef.current =
          recorder;

        audioChunksRef.current =
          [];

        recorder.ondataavailable =
          (event) => {
            if (
              event.data &&
              event.data.size > 0
            ) {
              audioChunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onstop =
          async () => {
            const audioBlob =
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

            stream
              .getTracks()
              .forEach((track) =>
                track.stop()
              );

            if (
              mediaRecorderRef.current ===
              recorder
            ) {
              mediaRecorderRef.current =
                null;
            }

            setIsRecording(false);

            announceVietnamese(
              'Đã dừng ghi âm. AI đang xử lý câu trả lời.'
            );

            await sendAudioToAI(
              audioBlob
            );
          };

        recorder.onerror =
          (event) => {
            console.error(
              'MediaRecorder error:',
              event
            );

            stream
              .getTracks()
              .forEach((track) =>
                track.stop()
              );

            mediaRecorderRef.current =
              null;

            audioChunksRef.current =
              [];

            setIsRecording(false);

            announceVietnamese(
              'Có lỗi khi ghi âm.',
              {
                force: true,
              }
            );
          };

        recorder.start();

        setIsRecording(true);
      } catch (error) {
        console.error(
          'Microphone error:',
          error
        );

        mediaRecorderRef.current =
          null;

        audioChunksRef.current =
          [];

        setIsRecording(false);

        announceVietnamese(
          'Không thể truy cập microphone. Hãy kiểm tra quyền microphone của trình duyệt.',
          {
            force: true,
          }
        );
      }
    };

  const stopRecording =
    () => {
      const recorder =
        mediaRecorderRef.current;

      if (
        !recorder ||
        recorder.state ===
          'inactive'
      ) {
        setIsRecording(false);

        return;
      }

      recorder.stop();
    };

  const sendAudioToAI =
    async (audioBlob) => {
      if (!audioBlob?.size) {
        announceVietnamese(
          'Không có bản ghi âm để xử lý.',
          {
            force: true,
          }
        );

        return;
      }

      setIsLoading(true);

      announceVietnamese(
        'AI đang xử lý câu trả lời bằng giọng nói.'
      );

      try {
        const formData =
          new FormData();

        formData.append(
          'audio',
          audioBlob,
          'conversation-audio.webm'
        );

        formData.append(
          'topic',
          selectedTopic
        );

        formData.append(
          'level',
          selectedLevel
        );

        formData.append(
          'history',
          JSON.stringify(messages)
        );

        const response =
          await fetch(
            `${API_URL}/api/conversation/audio`,
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
              'Không thể xử lý audio.'
          );
        }

        if (
          result.transcript
        ) {
          setMessages((prev) => [
            ...prev,

            {
              sender: 'user',
              text:
                result.transcript,
            },
          ]);

          announceVietnamese(
            `Bạn nói: ${result.transcript}`
          );
        }

        if (
          result.reply
        ) {
          setMessages((prev) => [
            ...prev,

            {
              sender: 'ai',
              text:
                result.reply,
            },
          ]);

          /* ===============================
             REAL PROGRESS
             =============================== */

          recordLearning(
            'conversation',
            20
          );

          speakText(
            result.reply
          );
        }
      } catch (error) {
        console.error(
          'Conversation audio error:',
          error
        );

        const errorMessage =
          error.message ||
          'Không thể xử lý audio.';

        setMessages((prev) => [
          ...prev,

          {
            sender: 'ai',
            text:
              errorMessage,
          },
        ]);

        announceVietnamese(
          errorMessage,
          {
            force: true,
          }
        );
      } finally {
        setIsLoading(false);
      }
    };

  const newConversation =
    () => {
      handleStopSpeaking();

      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !==
          'inactive'
      ) {
        recorder.stop();
      }

      setStarted(false);
      setMessages([]);
      setMessage('');
      setCurrentConversationId(
        null
      );
      setSidebarOpen(false);
      setIsRecording(false);

      if (
        !recorder ||
        recorder.state ===
          'inactive'
      ) {
        announceVietnamese(
          'Đã tạo cuộc hội thoại mới.'
        );
      }
    };

  const loadConversation =
    (conversation) => {
      handleStopSpeaking();

      setSelectedTopic(
        conversation.topic
      );

      setSelectedLevel(
        conversation.level
      );

      setMessages(
        conversation.messages
      );

      setCurrentConversationId(
        conversation.id
      );

      setStarted(true);
      setSidebarOpen(false);

      announceVietnamese(
        `Đã mở cuộc hội thoại ${conversation.topic}, trình độ ${conversation.level}.`
      );

      window.setTimeout(() => {
        historyButtonRef.current?.focus();
      }, 0);
    };

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const handleSidebarKeyDown =
      (event) => {
        if (
          event.key === 'Escape'
        ) {
          event.preventDefault();

          setSidebarOpen(false);

          window.setTimeout(() => {
            historyButtonRef.current?.focus();
          }, 0);
        }
      };

    window.addEventListener(
      'keydown',
      handleSidebarKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleSidebarKeyDown
      );
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    window.setTimeout(() => {
      sidebarCloseButtonRef.current?.focus();
    }, 0);
  }, [sidebarOpen]);

  const deleteConversation =
    (
      id,
      event
    ) => {
      event?.preventDefault();
      event?.stopPropagation();

      const isCurrent =
        currentConversationId === id;

      setConversations((prev) => {
        const updated =
          prev.filter(
            (item) =>
              item.id !== id
          );

        localStorage.setItem(
          'conversationHistory',
          JSON.stringify(updated)
        );

        return updated;
      });

      if (isCurrent) {
        handleStopSpeaking();

        setStarted(false);
        setMessages([]);
        setMessage('');

        setCurrentConversationId(
          null
        );

        setIsRecording(false);

        announceVietnamese(
          'Đã xóa cuộc hội thoại hiện tại.'
        );
      } else {
        announceVietnamese(
          'Đã xóa cuộc hội thoại.'
        );
      }
    };

  useEffect(() => {
    return () => {
      const recorder =
        mediaRecorderRef.current;

      if (
        recorder &&
        recorder.state !==
          'inactive'
      ) {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }

      stopSpeaking();
    };
  }, [stopSpeaking]);

  if (!started) {
    return (
      <main
        className="conversation-page"
        aria-label="Trang luyện hội thoại"
      >

        <h1 className="page-title">
          💬 Conversation Practice
        </h1>

        <p className="page-subtitle">
          Choose a topic and level to
          start practicing English.
        </p>

        <section
          className="setup-card"
          aria-label="Thiết lập Conversation"
        >

          <h2>
            Choose a topic
          </h2>

          <div
            className="topic-grid"
            aria-label="Chọn chủ đề"
          >
            {TOPICS.map(
              (topic) => (
                <button
                  key={topic.id}
                  type="button"
                  className={`topic-card ${
                    selectedTopic ===
                    topic.id
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => {
                    setSelectedTopic(
                      topic.id
                    );

                    announceVietnamese(
                      topic.name
                    );
                  }}
                  aria-label={`${topic.name}. ${topic.description}`}
                  aria-pressed={
                    selectedTopic ===
                    topic.id
                  }
                  data-a11y-lang="en-US"
                >

                  <span className="topic-icon">
                    {topic.icon}
                  </span>

                  <strong>
                    {topic.name}
                  </strong>

                  <small>
                    {topic.description}
                  </small>

                </button>
              )
            )}
          </div>

          <h2 className="level-title">
            Choose your level
          </h2>

          <div
            className="level-grid"
            aria-label="Chọn trình độ"
          >
            {LEVELS.map(
              (level) => (
                <button
                  key={level.id}
                  type="button"
                  className={`level-card ${
                    selectedLevel ===
                    level.id
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => {
                    setSelectedLevel(
                      level.id
                    );

                    announceVietnamese(
                      `${level.name}. ${level.description}`
                    );
                  }}
                  aria-label={`${level.name}. ${level.description}`}
                  aria-pressed={
                    selectedLevel ===
                    level.id
                  }
                  data-a11y-lang="en-US"
                >

                  <strong>
                    {level.name}
                  </strong>

                  <small>
                    {level.description}
                  </small>

                </button>
              )
            )}
          </div>

          <button
            type="button"
            className="start-conversation-button"
            onClick={
              startConversation
            }
            disabled={
              isLoading
            }
            aria-label="Bắt đầu cuộc hội thoại"
            data-a11y-lang="vi-VN"
          >
            {isLoading
              ? 'Đang bắt đầu...'
              : 'Bắt đầu cuộc hội thoại →'}
          </button>

        </section>

      </main>
    );
  }

  const topicInfo =
    TOPICS.find(
      (topic) =>
        topic.id ===
        selectedTopic
    );

  return (
    <main
      className="conversation-page chat-page"
      aria-label="Conversation Practice"
    >

      {sidebarOpen && (
        <>

          <aside
            className="conversation-sidebar sidebar-open"
            aria-label="Lịch sử hội thoại"
          >

            <div className="sidebar-header">

              <strong data-a11y-lang="en-US">
                Conversation History
              </strong>

              <button
                ref={
                  sidebarCloseButtonRef
                }
                type="button"
                onClick={() => {
                  setSidebarOpen(false);

                  window.setTimeout(() => {
                    historyButtonRef.current?.focus();
                  }, 0);
                }}
                aria-label="Đóng lịch sử hội thoại"
                data-a11y-lang="vi-VN"
              >
                ✕
              </button>

            </div>


            <button
              type="button"
              className="new-chat-button"
              onClick={
                newConversation
              }
              aria-label="Tạo cuộc hội thoại mới"
              data-a11y-lang="vi-VN"
            >
              ＋ New Conversation
            </button>


            <div
              className="history-list"
              aria-label="Danh sách lịch sử hội thoại"
            >

              {conversations.length ===
              0 ? (
                <p
                  className="empty-history"
                  data-a11y-lang="en-US"
                >
                  No conversations yet.
                </p>
              ) : (
                conversations.map(
                  (
                    conversation
                  ) => {
                    const historyTopic =
                      TOPICS.find(
                        (topic) =>
                          topic.id ===
                          conversation.topic
                      );

                    return (
                      <div
                        key={
                          conversation.id
                        }
                        className={`history-item-wrapper ${
                          conversation.id ===
                          currentConversationId
                            ? 'active'
                            : ''
                        }`}
                      >

                        <button
                          type="button"
                          className={`history-item ${
                            conversation.id ===
                            currentConversationId
                              ? 'active'
                              : ''
                          }`}
                          onClick={() =>
                            loadConversation(
                              conversation
                            )
                          }
                          aria-label={`Mở cuộc hội thoại ${historyTopic?.name}, trình độ ${conversation.level}`}
                          data-a11y-lang="vi-VN"
                        >

                          <div>

                            <strong
                              data-a11y-lang="en-US"
                            >
                              {historyTopic?.icon}{' '}
                              {
                                historyTopic?.name
                              }
                            </strong>

                            <small
                              data-a11y-lang="en-US"
                            >
                              {
                                conversation.level
                              }
                            </small>

                          </div>

                        </button>


                        <button
                          type="button"
                          className="delete-history"
                          onClick={(event) =>
                            deleteConversation(
                              conversation.id,
                              event
                            )
                          }
                          aria-label={`Xóa cuộc hội thoại ${historyTopic?.name}, trình độ ${conversation.level}`}
                          title="Xóa cuộc hội thoại"
                          data-a11y-lang="vi-VN"
                        >
                          🗑️
                        </button>

                      </div>
                    );
                  }
                )
              )}

            </div>

          </aside>


          <div
            className="sidebar-overlay"
            onClick={() => {
              setSidebarOpen(false);

              window.setTimeout(() => {
                historyButtonRef.current?.focus();
              }, 0);
            }}
            aria-hidden="true"
          />

        </>
      )}


      <section
        className="conversation-card"
        aria-label="Khu vực trò chuyện"
      >

        <header className="chat-header">

          <button
            type="button"
            ref={historyButtonRef}
            className="history-button"
            onClick={() =>
              setSidebarOpen(true)
            }
            aria-label="Mở lịch sử hội thoại"
            data-a11y-lang="vi-VN"
          >
            ☰
          </button>


          <div className="chat-info">

            <h1
              data-a11y-lang="en-US"
            >
              {topicInfo?.icon}{' '}
              {topicInfo?.name}
            </h1>

            <span
              data-a11y-lang="en-US"
            >
              Level {selectedLevel}
            </span>

          </div>


          <button
            type="button"
            className="new-chat-icon"
            onClick={
              newConversation
            }
            title="New Conversation"
            aria-label="Tạo cuộc hội thoại mới"
            data-a11y-lang="vi-VN"
          >
            ＋
          </button>

        </header>


        <div
          className="chat-box"
          role="log"
          aria-live="polite"
          aria-label="Nội dung cuộc hội thoại"
        >

          {messages.map(
            (
              msg,
              index
            ) => (

              <div
                key={index}
                className={`message ${
                  msg.sender ===
                  'ai'
                    ? 'ai-message'
                    : 'user-message'
                }`}
              >

                <span
                  className="message-label"
                  data-a11y-lang="vi-VN"
                >
                  {msg.sender ===
                  'ai'
                    ? 'AI Coach'
                    : 'Bạn'}
                </span>


                <p
                  data-a11y-lang={
                    msg.sender ===
                    'ai'
                      ? 'en-US'
                      : 'vi-VN'
                  }
                >
                  {msg.text}
                </p>


                {msg.sender ===
                  'ai' && (

                  <button
                    type="button"
                    className="speak-button"
                    onClick={() => {
                      if (
                        speakingIndex ===
                        index
                      ) {
                        handleStopSpeaking();
                      } else {
                        speakText(
                          msg.text,
                          index
                        );
                      }
                    }}
                    aria-label={
                      speakingIndex ===
                      index
                        ? 'Dừng đọc câu trả lời'
                        : 'Nghe câu trả lời của AI'
                    }
                    aria-pressed={
                      speakingIndex ===
                      index
                    }
                    data-a11y-lang="vi-VN"
                  >
                    {speakingIndex ===
                    index
                      ? '⏹ Dừng'
                      : '🔊 Nghe'}
                  </button>

                )}

              </div>

            )
          )}


          {isLoading && (

            <div
              className="message ai-message"
              aria-label="AI đang suy nghĩ"
              data-a11y-lang="vi-VN"
            >

              <span className="message-label">
                AI Coach
              </span>

              <p className="thinking">
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </p>

            </div>

          )}

        </div>


        <div
          className="conversation-input"
          role="form"
          aria-label="Nhập câu trả lời"
        >

          <button
            type="button"
            className={`mic-button ${
              isRecording
                ? 'recording'
                : ''
            }`}
            onClick={
              isRecording
                ? stopRecording
                : startRecording
            }
            disabled={
              isLoading
            }
            title={
              isRecording
                ? 'Dừng ghi âm'
                : 'Sử dụng microphone'
            }
            aria-label={
              isRecording
                ? 'Dừng ghi âm'
                : 'Bắt đầu nói với AI'
            }
            aria-pressed={
              isRecording
            }
            data-a11y-lang="vi-VN"
          >
            {isRecording
              ? '⏹'
              : '🎤'}
          </button>


          <input
            type="text"
            placeholder="Bắt đầu nhập"
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            disabled={
              isLoading ||
              isRecording
            }
            aria-label="Bắt đầu nhập"
            data-a11y-lang="vi-VN"
          />


          <button
            type="button"
            className="send-button"
            onClick={
              handleSend
            }
            disabled={
              isLoading ||
              !message.trim()
            }
            aria-label="Gửi câu trả lời"
            data-a11y-lang="vi-VN"
          >
            {isLoading
              ? '...'
              : 'Gửi'}
          </button>

        </div>


        {isRecording && (
          <p
            className="recording-status"
            aria-live="off"
            aria-atomic="true"
            data-a11y-lang="vi-VN"
          >
            🔴 Đang ghi âm... Bấm 🎤
            lần nữa để gửi.
          </p>
        )}

      </section>

    </main>
  );
}