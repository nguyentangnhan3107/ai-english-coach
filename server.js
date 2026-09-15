import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// MULTER - NHẬN FILE AUDIO
// =====================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

// =====================================================
// GEMINI
// =====================================================

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    '❌ Không tìm thấy GEMINI_API_KEY trong file .env'
  );

  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
});

const MODEL = 'gemini-2.5-flash';

// =====================================================
// QUOTA ERROR HELPER
// =====================================================

const isQuotaError = (error) => {
  if (!error) return false;

  const message =
    error.message?.toLowerCase() || '';

  return (
    error.status === 429 ||
    message.includes('429') ||
    message.includes('resource_exhausted') ||
    message.includes('quota exceeded') ||
    message.includes('rate limit')
  );
};

const quotaResponse = (
  res,
  extraMessage = ''
) => {
  return res.status(429).json({
    error:
      'Gemini đang hết lượt sử dụng API. Vui lòng thử lại sau khi quota được cấp lại.',
    quotaExceeded: true,
    details: extraMessage,
  });
};

// =====================================================
// CONVERSATION DATA
// =====================================================

const TOPIC_NAMES = {
  daily: 'Daily Life',
  school: 'School',
  travel: 'Travel',
  hobbies: 'Hobbies',
};

const VALID_LEVELS = [
  'A1',
  'A2',
  'B1',
  'B2',
];

const getTopicName = (topic) => {
  return (
    TOPIC_NAMES[topic] ||
    'Daily Life'
  );
};

const getLevel = (level) => {
  return VALID_LEVELS.includes(level)
    ? level
    : 'A1';
};

const buildConversationHistory = (
  history
) => {
  if (!Array.isArray(history)) {
    return '';
  }

  return history
    .filter(
      (item) =>
        item &&
        typeof item.text === 'string' &&
        item.text.trim()
    )
    .map((item) => {
      const role =
        item.sender === 'ai'
          ? 'AI Coach'
          : 'Student';

      return `${role}: ${item.text.trim()}`;
    })
    .join('\n');
};

// =====================================================
// FALLBACK OPENERS
// =====================================================

const FALLBACK_OPENERS = {
  daily: {
    A1: 'Hi! What do you usually do every day?',
    A2: 'Hi! What do you usually do after school?',
    B1: 'Hi! Let’s talk about your daily life. What does a normal day look like for you?',
    B2: 'Hi! Let’s talk about your daily life. What part of your daily routine do you enjoy the most?',
  },

  school: {
    A1: 'Hi! Do you like your school?',
    A2: 'Hi! What is your favorite subject at school?',
    B1: 'Hi! What do you enjoy most about studying at school?',
    B2: 'Hi! What do you think makes a good learning environment?',
  },

  travel: {
    A1: 'Hi! Do you like traveling?',
    A2: 'Hi! Where would you like to travel?',
    B1: 'Hi! If you could travel anywhere, where would you go and why?',
    B2: 'Hi! What kind of travel experience do you think is the most memorable?',
  },

  hobbies: {
    A1: 'Hi! What is your favorite hobby?',
    A2: 'Hi! What do you like doing in your free time?',
    B1: 'Hi! Tell me about a hobby you really enjoy.',
    B2: 'Hi! How do you think your hobbies have influenced your interests?',
  },
};

const getFallbackOpener = (
  topic,
  level
) => {
  const safeTopic =
    FALLBACK_OPENERS[topic]
      ? topic
      : 'daily';

  const safeLevel =
    FALLBACK_OPENERS[safeTopic][level]
      ? level
      : 'A1';

  return FALLBACK_OPENERS[
    safeTopic
  ][safeLevel];
};

// =====================================================
// TRANSLATION
// =====================================================

app.post(
  '/api/translation',
  async (req, res) => {
    try {
      const {
        text,
        sourceLanguage,
        targetLanguage,
      } = req.body;

      if (!text?.trim()) {
        return res.status(400).json({
          error:
            'Vui lòng cung cấp văn bản cần dịch.',
        });
      }

      if (
        !['vi', 'en'].includes(
          sourceLanguage
        )
      ) {
        return res.status(400).json({
          error:
            'Ngôn ngữ nguồn không hợp lệ.',
        });
      }

      if (
        !['vi', 'en'].includes(
          targetLanguage
        )
      ) {
        return res.status(400).json({
          error:
            'Ngôn ngữ đích không hợp lệ.',
        });
      }

      if (
        sourceLanguage ===
        targetLanguage
      ) {
        return res.json({
          translation: text.trim(),
        });
      }

      const sourceName =
        sourceLanguage === 'vi'
          ? 'Vietnamese'
          : 'English';

      const targetName =
        targetLanguage === 'vi'
          ? 'Vietnamese'
          : 'English';

      const prompt = `
You are a professional translator.

Translate the following text from ${sourceName} to ${targetName}.

Requirements:
- Preserve the original meaning.
- Use natural and grammatically correct language.
- Do not add explanations.
- Do not add quotation marks.
- Return ONLY the translated text.

Text:
${text.trim()}
`;

      const response =
        await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
        });

      const translatedText =
        response.text?.trim();

      if (!translatedText) {
        throw new Error(
          'Gemini không trả về bản dịch.'
        );
      }

      res.json({
        translation:
          translatedText,
      });
    } catch (error) {
      console.error(
        '❌ Translation Server Error:',
        error
      );

      if (isQuotaError(error)) {
        return quotaResponse(
          res,
          error.message
        );
      }

      res.status(500).json({
        error:
          'Không thể dịch văn bản.',
        quotaExceeded: false,
        details:
          error.message,
      });
    }
  }
);

// =====================================================
// SPEECH TO TEXT
// =====================================================

app.post(
  '/api/speech-to-text',
  upload.single('audio'),
  async (req, res) => {
    try {
      console.log(
        '\n🎙️ ===== SPEECH TO TEXT ====='
      );

      if (!req.file) {
        return res.status(400).json({
          error:
            'Không nhận được file audio.',
          quotaExceeded: false,
        });
      }

      const language =
        req.body.language === 'en'
          ? 'en'
          : 'vi';

      const languageName =
        language === 'en'
          ? 'English'
          : 'Vietnamese';

      console.log(
        'Audio size:',
        req.file.size,
        'bytes'
      );

      console.log(
        'Audio MIME:',
        req.file.mimetype
      );

      console.log(
        'Language:',
        languageName
      );

      const audioBase64 =
        req.file.buffer.toString(
          'base64'
        );

      const prompt = `
You are a speech recognition system.

The user is speaking ${languageName}.

Carefully listen to the attached audio and transcribe exactly what the user says.

IMPORTANT RULES:
- The expected language is ${languageName}.
- Preserve the words actually spoken.
- Do not translate the speech.
- Do not add explanations.
- Do not correct grammar.
- Do not invent words that were not spoken.
- Return ONLY valid JSON.
- If the audio is unclear, return the best possible transcription.
- Do not return Markdown.
- Do not wrap the JSON in code fences.

Return exactly:

{
  "transcript": "what the user actually said"
}
`;

      console.log(
        '🤖 Sending speech audio to Gemini...'
      );

      const response =
        await ai.models.generateContent({
          model: MODEL,

          contents: [
            {
              inlineData: {
                mimeType:
                  req.file.mimetype ||
                  'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: prompt,
            },
          ],

          config: {
            responseMimeType:
              'application/json',
          },
        });

      const rawText =
        response.text?.trim();

      if (!rawText) {
        throw new Error(
          'Gemini không trả về kết quả nhận dạng giọng nói.'
        );
      }

      console.log(
        'Gemini raw response:',
        rawText
      );

      let result;

      try {
        result =
          JSON.parse(rawText);
      } catch (parseError) {
        console.error(
          '❌ Speech JSON parse error:',
          parseError
        );

        throw new Error(
          'Gemini trả về dữ liệu nhận dạng không hợp lệ.'
        );
      }

      const transcript =
        typeof result.transcript ===
        'string'
          ? result.transcript.trim()
          : '';

      if (!transcript) {
        throw new Error(
          'Không nhận được nội dung giọng nói.'
        );
      }

      console.log(
        'Transcript:',
        transcript
      );

      console.log(
        '✅ Speech to text complete'
      );

      return res.json({
        transcript,
        quotaExceeded: false,
      });
    } catch (error) {
      console.error(
        '❌ Speech to Text Server Error:',
        error
      );

      if (isQuotaError(error)) {
        return quotaResponse(
          res,
          error.message
        );
      }

      return res.status(500).json({
        error:
          'Không thể nhận dạng giọng nói.',
        quotaExceeded: false,
        details:
          error.message,
      });
    }
  }
);

// =====================================================
// PRONUNCIATION
// =====================================================

app.post(
  '/api/pronunciation',
  upload.single('audio'),
  async (req, res) => {
    try {
      console.log(
        '\n🎤 ===== PRONUNCIATION ====='
      );

      if (!req.file) {
        return res.status(400).json({
          error:
            'Không nhận được file audio.',
        });
      }

      const targetText =
        req.body.targetText?.trim();

      if (!targetText) {
        return res.status(400).json({
          error:
            'Thiếu câu cần luyện.',
        });
      }

      console.log(
        'Audio size:',
        req.file.size,
        'bytes'
      );

      console.log(
        'Audio MIME:',
        req.file.mimetype
      );

      console.log(
        'Target:',
        targetText
      );

      const audioBase64 =
        req.file.buffer.toString(
          'base64'
        );

      const prompt = `
You are an English pronunciation coach.

The learner was asked to say:

"${targetText}"

The attached audio is the learner's recording.

Analyze the audio carefully.

Tasks:

1. Transcribe what the learner actually said.
2. Compare it with the target sentence.
3. Give a pronunciation score from 0 to 100.
4. Give concise feedback in Vietnamese.
5. Give specific pronunciation advice in Vietnamese.
6. Focus on pronunciation clarity and whether the correct words were spoken.
7. Do not judge grammar unless it affects the spoken words.

Scoring:

90-100 = Excellent
75-89 = Good
50-74 = Needs improvement
0-49 = Needs significant practice

IMPORTANT:

- Do not automatically give a high score.
- Base the score on the actual audio.
- If the learner said different or missing words, mention it.
- If the audio is unclear, say so.
- Return ONLY valid JSON.

Return exactly:

{
  "transcript": "what the learner actually said",
  "score": 0,
  "feedback": "Vietnamese feedback",
  "pronunciation": "Vietnamese pronunciation advice"
}
`;

      console.log(
        '🤖 Sending audio to Gemini...'
      );

      const response =
        await ai.models.generateContent({
          model: MODEL,

          contents: [
            {
              inlineData: {
                mimeType:
                  req.file.mimetype ||
                  'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: prompt,
            },
          ],

          config: {
            responseMimeType:
              'application/json',
          },
        });

      const rawText =
        response.text?.trim();

      if (!rawText) {
        throw new Error(
          'Gemini không trả về kết quả.'
        );
      }

      let result;

      try {
        result =
          JSON.parse(rawText);
      } catch {
        throw new Error(
          'Gemini trả về JSON không hợp lệ.'
        );
      }

      const score = Number(
        result.score
      );

      const safeScore =
        Number.isFinite(score)
          ? Math.max(
              0,
              Math.min(100, score)
            )
          : null;

      res.json({
        transcript:
          result.transcript || '',

        score:
          safeScore,

        feedback:
          result.feedback || '',

        pronunciation:
          result.pronunciation || '',

        quotaExceeded: false,
      });

      console.log(
        '✅ Pronunciation analysis complete'
      );
    } catch (error) {
      console.error(
        '❌ Pronunciation Server Error:',
        error
      );

      if (isQuotaError(error)) {
        return quotaResponse(
          res,
          error.message
        );
      }

      res.status(500).json({
        error:
          'Không thể phân tích phát âm.',
        quotaExceeded: false,
        details:
          error.message,
      });
    }
  }
);

// =====================================================
// CONVERSATION - START
// =====================================================

app.post(
  '/api/conversation/start',
  async (req, res) => {
    try {
      const topic =
        TOPIC_NAMES[req.body.topic]
          ? req.body.topic
          : 'daily';

      const level =
        getLevel(req.body.level);

      const topicName =
        getTopicName(topic);

      console.log(
        '\n💬 ===== START CONVERSATION ====='
      );

      console.log(
        'Topic:',
        topicName
      );

      console.log(
        'Level:',
        level
      );

      const prompt = `
You are an English conversation coach for a student.

Start a conversation about:

Topic: ${topicName}
Student level: ${level}

Level guidelines:

A1:
- Very simple vocabulary.
- Very short sentences.
- Ask simple everyday questions.

A2:
- Simple everyday English.
- Slightly longer sentences.
- Basic follow-up questions.

B1:
- Natural intermediate English.
- More varied vocabulary.
- Ask questions that encourage the student to explain.

B2:
- Natural upper-intermediate English.
- Use varied vocabulary and sentence structures.
- Encourage opinions, explanations and discussion.

Rules:

- Start naturally.
- Speak only in English.
- Keep the opening reasonably short.
- Ask the student a question.
- Stay related to the selected topic.
- Be friendly and encouraging.
- Do not give grammar lessons.
- Do not pretend to be a real human.
- Return ONLY the message shown to the student.
`;

      const response =
        await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
        });

      const reply =
        response.text?.trim();

      if (!reply) {
        throw new Error(
          'Gemini không trả về câu mở đầu.'
        );
      }

      console.log(
        'AI:',
        reply
      );

      res.json({
        reply,
        quotaExceeded: false,
        fallback: false,
      });
    } catch (error) {
      console.error(
        '❌ Start Conversation Error:',
        error
      );

      if (isQuotaError(error)) {
        const topic =
          TOPIC_NAMES[req.body.topic]
            ? req.body.topic
            : 'daily';

        const level =
          getLevel(req.body.level);

        const fallback =
          getFallbackOpener(
            topic,
            level
          );

        console.log(
          '⚠️ Gemini hết quota → dùng fallback opener.'
        );

        return res.json({
          reply: fallback,
          quotaExceeded: true,
          fallback: true,
          message:
            'Gemini đang hết lượt. Conversation đã sử dụng câu mở đầu dự phòng.',
        });
      }

      res.status(500).json({
        error:
          'Không thể bắt đầu Conversation.',
        quotaExceeded: false,
        details:
          error.message,
      });
    }
  }
);

// =====================================================
// CONVERSATION - TEXT
// =====================================================

app.post(
  '/api/conversation',
  async (req, res) => {
    try {
      const {
        message,
        history = [],
        topic = 'daily',
        level = 'A1',
      } = req.body;

      if (!message?.trim()) {
        return res.status(400).json({
          error:
            'Vui lòng nhập tin nhắn.',
        });
      }

      const safeTopic =
        TOPIC_NAMES[topic]
          ? topic
          : 'daily';

      const topicName =
        getTopicName(safeTopic);

      const safeLevel =
        getLevel(level);

      const conversationHistory =
        buildConversationHistory(
          history
        );

      console.log(
        '\n💬 ===== CONVERSATION ====='
      );

      console.log(
        'Topic:',
        topicName
      );

      console.log(
        'Level:',
        safeLevel
      );

      console.log(
        'User:',
        message.trim()
      );

      const prompt = `
You are an English conversation coach for a student.

Selected topic:
${topicName}

Student English level:
${safeLevel}

Your goal is to help the student practice natural English conversation.

Level guidelines:

A1:
- Use very simple words.
- Use short sentences.
- Avoid difficult grammar.
- Ask easy everyday questions.

A2:
- Use simple natural English.
- Use slightly longer sentences.
- Introduce common vocabulary.

B1:
- Use natural intermediate English.
- Use a wider range of vocabulary.
- Encourage the student to explain ideas.

B2:
- Use natural upper-intermediate English.
- Use varied vocabulary and sentence structures.
- Encourage opinions and deeper discussion.

Rules:

- Reply naturally in English.
- Stay related to the selected topic.
- Keep your response reasonably short.
- Ask a question when appropriate.
- Adapt to the student's level.
- Be friendly and encouraging.
- If the student makes a small mistake, you may give a very short correction.
- Do not give long grammar explanations unless the student asks.
- Never be rude or discouraging.
- Do not pretend to be a real human.
- Return ONLY the response that should appear in the chat.

Conversation history:

${conversationHistory || '(No previous messages)'}

Student's latest message:

${message.trim()}

AI Coach:
`;

      console.log(
        '🤖 Sending conversation to Gemini...'
      );

      const response =
        await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
        });

      const reply =
        response.text?.trim();

      if (!reply) {
        throw new Error(
          'Gemini không trả về câu trả lời.'
        );
      }

      console.log(
        'AI:',
        reply
      );

      res.json({
        reply,
        quotaExceeded: false,
      });
    } catch (error) {
      console.error(
        '❌ Conversation Server Error:',
        error
      );

      if (isQuotaError(error)) {
        return quotaResponse(
          res,
          error.message
        );
      }

      res.status(500).json({
        error:
          'Không thể kết nối với AI Conversation.',
        quotaExceeded: false,
        details:
          error.message,
      });
    }
  }
);

// =====================================================
// CONVERSATION - AUDIO / MIC
// =====================================================

app.post(
  '/api/conversation/audio',
  upload.single('audio'),
  async (req, res) => {
    try {
      console.log(
        '\n🎤 ===== AUDIO CONVERSATION ====='
      );

      if (!req.file) {
        return res.status(400).json({
          error:
            'Không nhận được file audio.',
        });
      }

      const topic =
        TOPIC_NAMES[req.body.topic]
          ? req.body.topic
          : 'daily';

      const level =
        getLevel(req.body.level);

      const topicName =
        getTopicName(topic);

      let history = [];

      if (req.body.history) {
        try {
          history =
            JSON.parse(
              req.body.history
            );
        } catch {
          console.warn(
            '⚠️ Không thể đọc history audio.'
          );
        }
      }

      const conversationHistory =
        buildConversationHistory(
          history
        );

      console.log(
        'Audio size:',
        req.file.size,
        'bytes'
      );

      console.log(
        'Audio MIME:',
        req.file.mimetype
      );

      console.log(
        'Topic:',
        topicName
      );

      console.log(
        'Level:',
        level
      );

      const audioBase64 =
        req.file.buffer.toString(
          'base64'
        );

      const prompt = `
You are an English conversation coach for a student.

The student is practicing spoken English.

Topic:
${topicName}

Student level:
${level}

The attached audio is the student's latest spoken response.

Tasks:

1. Carefully understand the student's speech.
2. Transcribe what the student actually said.
3. Continue the conversation naturally.
4. Adapt your English to the student's level.
5. Stay related to the selected topic.
6. Keep your response reasonably short.
7. Ask a question when appropriate.
8. Be friendly and encouraging.
9. Do not give long grammar explanations.

Return ONLY valid JSON.

Return exactly:

{
  "transcript": "what the student said",
  "reply": "AI Coach response"
}

Conversation history:

${conversationHistory || '(No previous messages)'}
`;

      console.log(
        '🤖 Sending audio to Gemini...'
      );

      const response =
        await ai.models.generateContent({
          model: MODEL,

          contents: [
            {
              inlineData: {
                mimeType:
                  req.file.mimetype ||
                  'audio/webm',
                data: audioBase64,
              },
            },

            {
              text: prompt,
            },
          ],

          config: {
            responseMimeType:
              'application/json',
          },
        });

      const rawText =
        response.text?.trim();

      if (!rawText) {
        throw new Error(
          'Gemini không trả về kết quả audio.'
        );
      }

      let result;

      try {
        result =
          JSON.parse(rawText);
      } catch {
        throw new Error(
          'Gemini trả về JSON không hợp lệ.'
        );
      }

      const transcript =
        typeof result.transcript ===
        'string'
          ? result.transcript.trim()
          : '';

      const reply =
        typeof result.reply ===
        'string'
          ? result.reply.trim()
          : '';

      if (!reply) {
        throw new Error(
          'Gemini không tạo được câu trả lời.'
        );
      }

      res.json({
        transcript,
        reply,
        quotaExceeded: false,
      });

      console.log(
        'Transcript:',
        transcript
      );

      console.log(
        'AI:',
        reply
      );

      console.log(
        '✅ Audio conversation complete'
      );
    } catch (error) {
      console.error(
        '❌ Audio Conversation Server Error:',
        error
      );

      if (isQuotaError(error)) {
        return quotaResponse(
          res,
          error.message
        );
      }

      res.status(500).json({
        error:
          'Không thể xử lý audio Conversation.',
        quotaExceeded: false,
        details:
          error.message,
      });
    }
  }
);

// =====================================================
// HEALTH CHECK
// =====================================================
// ĐẶT TRƯỚC UNKNOWN API ROUTE
// để Express không bắt /api/health vào 404.
// =====================================================

app.get(
  '/api/health',
  (req, res) => {
    res.json({
      status: 'OK',
      message:
        'Server đang chạy bình thường!',
    });
  }
);

// =====================================================
// UNKNOWN API ROUTE
// =====================================================
// Không để Express trả HTML 404 cho các API.
// Frontend luôn nhận JSON.
// =====================================================

app.use(
  '/api',
  (req, res) => {
    res.status(404).json({
      error:
        `API không tồn tại: ${req.method} ${req.originalUrl}`,
      quotaExceeded: false,
    });
  }
);

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

app.use(
  (error, req, res, next) => {
    console.error(
      '❌ Global Server Error:',
      error
    );

    if (
      error instanceof multer.MulterError
    ) {
      return res.status(400).json({
        error:
          'Lỗi khi nhận file audio.',
        details:
          error.message,
        quotaExceeded: false,
      });
    }

    return res.status(500).json({
      error:
        'Lỗi server không xác định.',
      details:
        error.message,
      quotaExceeded: false,
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

app.listen(
  PORT,
  () => {
    console.log(
      `\n🚀 Backend đang chạy tại http://localhost:${PORT}`
    );

    console.log(
      '📌 Translation: /api/translation'
    );

    console.log(
      '📌 Speech to Text: /api/speech-to-text'
    );

    console.log(
      '📌 Pronunciation: /api/pronunciation'
    );

    console.log(
      '📌 Conversation: /api/conversation'
    );

    console.log(
      '📌 Conversation Start: /api/conversation/start'
    );

    console.log(
      '📌 Conversation Audio: /api/conversation/audio'
    );

    console.log(
      '📌 Health: /api/health\n'
    );
  }
);