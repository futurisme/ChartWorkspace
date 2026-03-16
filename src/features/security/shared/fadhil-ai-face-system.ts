export type FaceMode = 'Idle' | 'Reading' | 'Thinking' | 'Listening' | 'Speaking' | 'Surprised' | 'Happy' | 'Confused';

export type EmotionVector = {
  joy: number;
  focus: number;
  curiosity: number;
  confusion: number;
  thinking: number;
  surprise: number;
};

export type FaceParams = {
  eye_open: number;
  eye_squint: number;
  gaze_x: number;
  gaze_y: number;
  mouth_open: number;
  mouth_smile: number;
  jaw_rotation: number;
  lip_width: number;
  lip_height: number;
  brow_height: number;
  head_tilt: number;
  head_shift_x: number;
  head_shift_y: number;
  breath: number;
  blink: number;
};

export type DetectionPacket = {
  normalizedText: string;
  tokens: string[];
  mode: FaceMode;
  emotion: EmotionVector;
};

type SpeechFrame = {
  phoneme: string;
  index: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

class DetectionEngine {
  async analyze(input: string): Promise<{ normalized: string; tokens: string[]; mode: FaceMode }> {
    const normalized = input.replace(/\s+/g, ' ').trim();
    const chunks = normalized.split(' ');
    const tokens: string[] = [];

    for (let i = 0; i < chunks.length; i += 12) {
      const slice = chunks.slice(i, i + 12).filter(Boolean);
      if (slice.length > 0) tokens.push(...slice);
      await Promise.resolve();
    }

    const mode = /\?/.test(normalized)
      ? 'Thinking'
      : /!/.test(normalized)
        ? 'Surprised'
        : /great|success|good|clear/.test(normalized.toLowerCase())
          ? 'Happy'
          : tokens.length > 24
            ? 'Reading'
            : 'Listening';

    return { normalized, tokens, mode };
  }
}

class EmotionAnalyzer {
  analyze(text: string, mode: FaceMode): EmotionVector {
    const l = text.toLowerCase();
    const exclaim = (l.match(/!/g) ?? []).length;
    const query = (l.match(/\?/g) ?? []).length;
    const longness = clamp01(text.length / 520);

    return {
      joy: clamp01((/good|great|success|pass|clear|safe/.test(l) ? 0.5 : 0.12) + exclaim * 0.05),
      focus: clamp01(0.35 + longness * 0.5 + (mode === 'Reading' ? 0.12 : 0)),
      curiosity: clamp01(0.2 + query * 0.08),
      confusion: clamp01(/error|fail|warn|unknown|blocked/.test(l) ? 0.6 : 0.06),
      thinking: clamp01(mode === 'Thinking' ? 0.68 : 0.2 + query * 0.04),
      surprise: clamp01(exclaim * 0.12 + (mode === 'Surprised' ? 0.28 : 0)),
    };
  }
}

class SpeechAnalyzer {
  private phonemeTable: Record<string, string> = {
    a: 'A',
    o: 'O',
    e: 'E',
    m: 'M', b: 'M', p: 'M',
    f: 'F', v: 'F',
  };

  toSpeechFrames(text: string): SpeechFrame[] {
    const chars = text.toLowerCase().replace(/\s+/g, '');
    const frames: SpeechFrame[] = new Array(chars.length);
    for (let i = 0; i < chars.length; i += 1) {
      const c = chars[i];
      frames[i] = { phoneme: this.phonemeTable[c] ?? 'N', index: i };
    }
    return frames;
  }
}

class LipSyncEngine {
  targetFor(phoneme: string) {
    switch (phoneme) {
      case 'A': return { open: 0.92, jaw: 0.8, width: 0.84, height: 0.95 };
      case 'O': return { open: 0.78, jaw: 0.7, width: 0.58, height: 0.98 };
      case 'E': return { open: 0.58, jaw: 0.5, width: 0.96, height: 0.45 };
      case 'M': return { open: 0.05, jaw: 0.03, width: 0.52, height: 0.16 };
      case 'F': return { open: 0.24, jaw: 0.15, width: 0.72, height: 0.24 };
      default: return { open: 0.32, jaw: 0.24, width: 0.72, height: 0.38 };
    }
  }
}

class EyeMovementEngine {
  private nextBlinkAt = 0;
  private blinkPhase = 0;
  private driftX = 0;
  private driftY = 0;
  private glanceTargetX = 0;

  step(nowMs: number, mode: FaceMode, emotion: EmotionVector) {
    if (this.nextBlinkAt <= 0) this.nextBlinkAt = nowMs + 800 + Math.random() * 1500;
    if (nowMs >= this.nextBlinkAt) {
      this.blinkPhase = 1;
      this.nextBlinkAt = nowMs + 850 + Math.random() * 1650 - emotion.focus * 350;
    }

    const scanWave = Math.sin(nowMs * 0.0045) * (mode === 'Reading' ? 1.5 : 0.7);
    this.glanceTargetX = lerp(this.glanceTargetX, scanWave + (Math.random() - 0.5) * 1.3, 0.12);
    this.driftX = lerp(this.driftX, this.glanceTargetX * 2.8, 0.18);
    this.driftY = lerp(this.driftY, Math.sin(nowMs * 0.0032) * 0.9 + (Math.random() - 0.5) * 0.6, 0.14);

    if (this.blinkPhase > 0) {
      this.blinkPhase = Math.max(0, this.blinkPhase - 0.32);
    }

    const speakingBias = mode === 'Speaking' ? 0.12 : 0;
    const squint = clamp01(emotion.focus * 0.42 + emotion.confusion * 0.23 + speakingBias);
    const open = clamp01(1 - this.blinkPhase - squint * 0.52);

    return {
      eye_open: open,
      eye_squint: squint,
      gaze_x: this.driftX,
      gaze_y: this.driftY,
      blink: this.blinkPhase,
    };
  }
}

class ExpressionController {
  compose(nowMs: number, mode: FaceMode, emotion: EmotionVector) {
    const baseBrow = mode === 'Surprised' ? -0.28 : mode === 'Confused' ? 0.14 : -0.08;
    const brow_height = baseBrow - emotion.surprise * 0.24 + emotion.confusion * 0.18;

    const shakeRate = mode === 'Speaking' ? 0.018 : 0.012;
    const shake = Math.sin(nowMs * shakeRate) * (mode === 'Speaking' ? 1 : 0.55);
    const head_tilt = (emotion.curiosity - emotion.focus) * 0.18 + shake * 0.22;
    const head_shift_x = shake * 8.8 + (emotion.joy - emotion.confusion) * 4.5;
    const head_shift_y = (emotion.thinking - emotion.surprise) * 2 + Math.cos(nowMs * 0.004) * 0.8;
    const mouth_smile = clamp01(emotion.joy * 0.95 - emotion.confusion * 0.3 + (mode === 'Happy' ? 0.2 : 0));

    return { brow_height, head_tilt, head_shift_x, head_shift_y, mouth_smile };
  }
}

class FaceAnimationCore {
  params: FaceParams = {
    eye_open: 0.9,
    eye_squint: 0.08,
    gaze_x: 0,
    gaze_y: 0,
    mouth_open: 0.1,
    mouth_smile: 0.28,
    jaw_rotation: 0.05,
    lip_width: 0.75,
    lip_height: 0.25,
    brow_height: -0.08,
    head_tilt: 0,
    head_shift_x: 0,
    head_shift_y: 0,
    breath: 0,
    blink: 0,
  };

  update(target: Partial<FaceParams>, dt: number) {
    const smooth = clamp01(dt * 11.5);
    (Object.keys(this.params) as Array<keyof FaceParams>).forEach((key) => {
      const next = target[key];
      if (typeof next === 'number') this.params[key] = lerp(this.params[key], next, smooth);
    });
  }
}

class RenderPipeline {
  private prev: FaceParams | null = null;

  diff(next: FaceParams) {
    if (!this.prev) {
      this.prev = { ...next };
      return { dirty: true };
    }

    let dirty = false;
    (Object.keys(next) as Array<keyof FaceParams>).forEach((k) => {
      if (Math.abs(next[k] - this.prev![k]) > 0.002) dirty = true;
    });

    if (dirty) this.prev = { ...next };
    return { dirty };
  }
}

export class FadhilAiFaceSystem {
  private detector = new DetectionEngine();
  private emotion = new EmotionAnalyzer();
  private speech = new SpeechAnalyzer();
  private eye = new EyeMovementEngine();
  private lips = new LipSyncEngine();
  private expression = new ExpressionController();
  private core = new FaceAnimationCore();
  private renderer = new RenderPipeline();

  private packet: DetectionPacket | null = null;
  private speechFrames: SpeechFrame[] = [];
  private speechCursor = 0;

  async runDetection(input: string): Promise<DetectionPacket> {
    const base = await this.detector.analyze(input);
    const emotion = this.emotion.analyze(base.normalized, base.mode);
    this.packet = { normalizedText: base.normalized, tokens: base.tokens, mode: base.mode, emotion };
    this.speechFrames = this.speech.toSpeechFrames(base.normalized);
    this.speechCursor = 0;
    return this.packet;
  }

  step(nowMs: number, dtSec: number, speaking: boolean) {
    const packet = this.packet;
    const mode: FaceMode = speaking ? 'Speaking' : packet?.mode ?? 'Idle';
    const emotion = packet?.emotion ?? this.emotion.analyze('', 'Idle');

    const eye = this.eye.step(nowMs, mode, emotion);
    const expr = this.expression.compose(nowMs, mode, emotion);

    const speechFrame = this.speechFrames.length > 0 ? this.speechFrames[this.speechCursor % this.speechFrames.length] : null;
    const lipTarget = this.lips.targetFor(speaking && speechFrame ? speechFrame.phoneme : 'M');
    if (speaking) this.speechCursor += 1;

    const breath = Math.sin(nowMs * 0.0019) * 0.5 + 0.5;

    this.core.update({
      ...eye,
      ...expr,
      mouth_open: lipTarget.open,
      jaw_rotation: lipTarget.jaw,
      lip_width: lipTarget.width,
      lip_height: lipTarget.height,
      breath,
    }, dtSec);

    const render = this.renderer.diff(this.core.params);
    return { params: this.core.params, dirty: render.dirty, packet };
  }
}
