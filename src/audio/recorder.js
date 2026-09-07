export class WavRecorder {
  constructor(stream) {
    this.stream = stream;
    this.audioContext = null;
    this.source = null;
    this.processor = null;

    this.chunks = [];
    this.sampleRate = 44100;
    this.isRecording = false;
  }

  start() {
    if (this.isRecording) return;

    this.audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    this.sampleRate = this.audioContext.sampleRate;

    this.source = this.audioContext.createMediaStreamSource(
      this.stream
    );

    // ScriptProcessor vẫn được hỗ trợ rộng rãi cho trường hợp
    // ghi âm đơn giản phía trình duyệt.
    this.processor = this.audioContext.createScriptProcessor(
      4096,
      1,
      1
    );

    this.chunks = [];
    this.isRecording = true;

    this.processor.onaudioprocess = (event) => {
      if (!this.isRecording) return;

      const input = event.inputBuffer.getChannelData(0);

      // Copy dữ liệu vì input buffer có thể được tái sử dụng.
      this.chunks.push(new Float32Array(input));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.isRecording) {
        resolve(null);
        return;
      }

      this.isRecording = false;

      if (this.source) {
        this.source.disconnect();
      }

      if (this.processor) {
        this.processor.disconnect();
        this.processor.onaudioprocess = null;
      }

      const samples = this.mergeChunks(this.chunks);

      const wavBuffer = this.encodeWav(
        samples,
        this.sampleRate
      );

      const blob = new Blob(
        [wavBuffer],
        { type: 'audio/wav' }
      );

      if (this.audioContext) {
        this.audioContext.close();
      }

      this.audioContext = null;
      this.source = null;
      this.processor = null;
      this.chunks = [];

      resolve(blob);
    });
  }

  mergeChunks(chunks) {
    let length = 0;

    for (const chunk of chunks) {
      length += chunk.length;
    }

    const result = new Float32Array(length);

    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  encodeWav(samples, sampleRate) {
    const buffer = new ArrayBuffer(
      44 + samples.length * 2
    );

    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(
      4,
      36 + samples.length * 2,
      true
    );

    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');

    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true);  // PCM format
    view.setUint16(22, 1, true);  // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(
      28,
      sampleRate * 2,
      true
    );

    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);

    this.writeString(view, 36, 'data');

    view.setUint32(
      40,
      samples.length * 2,
      true
    );

    this.floatTo16BitPCM(
      view,
      44,
      samples
    );

    return buffer;
  }

  floatTo16BitPCM(view, offset, samples) {
    for (let i = 0; i < samples.length; i++) {
      const sample = Math.max(
        -1,
        Math.min(1, samples[i])
      );

      const value =
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff;

      view.setInt16(
        offset + i * 2,
        value,
        true
      );
    }
  }

  writeString(view, offset, text) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(
        offset + i,
        text.charCodeAt(i)
      );
    }
  }
}