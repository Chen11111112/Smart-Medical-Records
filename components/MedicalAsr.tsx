'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from '@/styles/components/MedicalAsr.module.scss'; // 匯入 SCSS Module
import { transcribeAudio } from '@/lib/utils/transcribeAudio';
import { downloadSoapReportAsWord } from '@/lib/utils/downloadAiWord';
import { useTheme } from '@/context/ThemeContext';
import { logAiResponse } from '@/lib/utils/logAiResponse';
import {
  DEMO_WHISPER_DISABLED,
  DEMO_WHISPER_DISABLED_MESSAGE,
} from '@/lib/constants/demoIntegration';

const BACKEND_URL = process.env.NEXT_PUBLIC_WHISPER_API_URL ?? '/api/whisper';
const ACCEPTED_AUDIO_TYPES =
  'audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac,.amr,.wma';
const VOLUME_THRESHOLD = 0.08;
const SILENCE_DURATION = 2500;
const VISUAL_MULTIPLIER = 3;
const MIN_SPEAK_TIME = 1000;

interface Props {
  setIsWhisperModalOpen: (e: boolean)=> void;
  docid?: string;
  histno?: string;
  caseno?: string;
  transcript: string;
  setTranscript: (value: string) => void;
  summary: string;
  setSummary: (value: string) => void;
}
export default function  MedicalAsr({
  setIsWhisperModalOpen,
  docid = "",
  histno,
  caseno,
  transcript,
  setTranscript,
  summary,
  setSummary,
}: Props) {
  const { isDarkMode } = useTheme();
  const [isSystemActive, setIsSystemActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'speaking' | 'uploading'>('idle');
  const [sessionId] = useState(() => 
    typeof window !== 'undefined' && window.crypto?.randomUUID 
      ? window.crypto.randomUUID() 
      : Math.random().toString(36).substring(2, 11) // 備用方案
  );
  const [meterWidth, setMeterWidth] = useState(0);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isFileTranscribing, setIsFileTranscribing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceStartRef = useRef<number>(Date.now());
  const recordingStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const isRecordingRef = useRef(false); // 同步用的 ref

  // 監聽狀態變更同步 Ref
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  const getStatusText = () => {
    if (isFileTranscribing || status === 'uploading') {
      return '正在辨識語音，請稍候…';
    }
    if (status === 'speaking') {
      return '說完請停頓 2.5 秒後自動轉錄';
    }
    if (status === 'listening') {
      return '錄音中：請開始說話';
    }
    return '待機中：可「開始自動錄音」或「上傳語音檔」';
  };

  // --- 音量監測主迴圈 ---
  const checkVolumeLoop = () => {
    if (!analyserRef.current) return;

    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avgVolume = data.reduce((a, b) => a + b, 0) / data.length / 255;

    setMeterWidth(Math.min(avgVolume * 100 * VISUAL_MULTIPLIER, 100));

    if (avgVolume > VOLUME_THRESHOLD) {
      silenceStartRef.current = Date.now();
      if (!isRecordingRef.current) {
        startRecording();
      }
    } else {
      if (isRecordingRef.current && (Date.now() - silenceStartRef.current > SILENCE_DURATION)) {
        stopRecording();
      }
    }
    animationFrameRef.current = requestAnimationFrame(checkVolumeLoop);
  };

  const startRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      recordingStartTimeRef.current = Date.now();
      chunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStatus('speaking');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('uploading');
    }
  };

  // --- 按鈕事件 ---
  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = triggerUpload;
      mediaRecorderRef.current = recorder;

      setIsSystemActive(true);
      setStatus('listening');
      animationFrameRef.current = requestAnimationFrame(checkVolumeLoop);
    } catch (err) {
      alert("無法存取麥克風設備：" + (err as Error).message);
    }
  };

  const handleStop = () => {
    setIsSystemActive(false);
    if (isRecordingRef.current) stopRecording();

    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setStatus('idle');
    setMeterWidth(0);
  };

  const runTranscription = async (
    file: Blob,
    fileName: string,
    inputType: "record" | "upload"
  ) => {
    if (DEMO_WHISPER_DISABLED) {
      setTranscript(transcript + `[disabled]\n${DEMO_WHISPER_DISABLED_MESSAGE}\n\n`);
      return;
    }

    const result = await transcribeAudio(file, fileName, "demo", sessionId, {
      inputType,
      docid,
      histno,
      caseno,
    });

    if (result.success && result.text) {
      setTranscript(transcript + `${result.text}\n\n`);
      return;
    }

    setTranscript(transcript + `[error]\n${result.log || result.error || "轉錄失敗"}\n\n`
    );
  };

  const triggerUpload = async () => {
    if (chunksRef.current.length === 0) return;

    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const actualSpeakDuration =
      Date.now() - recordingStartTimeRef.current - SILENCE_DURATION;

    if (actualSpeakDuration < MIN_SPEAK_TIME) {
      setStatus('listening');
      return;
    }

    try {
      await runTranscription(blob, "clip.webm", "record");
    } catch (err) {
      const log =
        err instanceof Error ? err.stack || err.message : String(err);
      setTranscript(transcript + `[error]\n${log}\n\n`);
    } finally {
      setStatus((prev) => (prev === 'uploading' ? 'listening' : prev));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || isFileTranscribing) return;

    setSelectedFileName(file.name);
    setIsFileTranscribing(true);
    setStatus('uploading');

    try {
      await runTranscription(file, file.name, "upload");
    } catch (err) {
      const log =
        err instanceof Error ? err.stack || err.message : String(err);
      setTranscript(transcript + `[error]\n${log}\n\n`);
    } finally {
      setIsFileTranscribing(false);
      setStatus((prev) =>
        isSystemActive && prev === 'uploading' ? 'listening' : 'idle'
      );
    }
  };

  const handleDownloadSoapWord = () => {
    if (!summary.trim()) {
      alert('目前尚無 SOAP 報告可下載。');
      return;
    }
    downloadSoapReportAsWord(summary, 'SOAP結構化病歷');
  };

  const handleSummarize = async () => {
    if (DEMO_WHISPER_DISABLED) {
      setSummary(DEMO_WHISPER_DISABLED_MESSAGE);
      return;
    }

    if (!transcript.trim()) {
      alert("目前尚無對話紀錄。");
      return;
    }

    setIsSummarizing(true);
    setSummary(`正在進行 SOAP 結構化病歷分析...`);

    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('transcript', transcript);

    try {
      const resp = await fetch(`${BACKEND_URL}/summarize`, { method: 'POST', body: formData });
      const data = await resp.json();
      if (data.status === "success") {
        logAiResponse("MedicalAsr/summarize", data.report);
        setSummary(data.report);
      } else {
        setSummary("總結發生錯誤：" + (data.detail || "格式不正確"));
      }
    } catch (e) {
      setSummary("連線失敗：伺服器可能未啟動。");
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className={`${styles.container} ${isDarkMode ? styles.dark : ""}`}>
      <div style={{display:'flex', alignItems:'center' ,justifyContent:'space-between',margin:'0 0  16px 0'}}>
        <h2>醫病對話 ASR 與 智慧病歷整理</h2>
        <button style={{background:'none', border:'none', cursor:'pointer'}}onClick={()=> setIsWhisperModalOpen(false)}>✕</button>
      </div>

      {DEMO_WHISPER_DISABLED && (
        <p className={styles.fileHint}>{DEMO_WHISPER_DISABLED_MESSAGE}</p>
      )}

      <div className={styles.controls}>
        <div className={styles.configRow}>
          <div className={styles.btnGroup}>
            <button onClick={handleStart} disabled={DEMO_WHISPER_DISABLED || isSystemActive}>
              {isSystemActive ? '錄音運作中...' : '開始自動錄音'}
            </button>
            
            <button onClick={handleStop} disabled={DEMO_WHISPER_DISABLED || !isSystemActive}>
              停止錄音
            </button>
            
            <button onClick={handleSummarize} disabled={DEMO_WHISPER_DISABLED || isSummarizing}>
              {isSummarizing ? '整理中...' : '生成醫療報告'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_AUDIO_TYPES}
              className={styles.hiddenFileInput}
              onChange={handleFileSelect}
              disabled={DEMO_WHISPER_DISABLED || isFileTranscribing || status === 'uploading'}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={DEMO_WHISPER_DISABLED || isFileTranscribing || status === 'uploading'}
            >
              {isFileTranscribing ? '轉錄中...' : '上傳語音檔'}
            </button>
        </div>
        </div>

        {selectedFileName && (
          <p className={styles.fileHint}>
            最近上傳：{selectedFileName}
            {isFileTranscribing ? '（辨識中…）' : ''}
          </p>
        )}

        
      </div>

      {/* 動態狀態樣式綁定 */}
      <div className={`
        ${styles.statusBadge}
        ${status === 'idle' && !isFileTranscribing ? styles.idle : ''}
        ${status === 'listening' ? styles.listening : ''}
        ${status === 'speaking' ? styles.speaking : ''}
        ${status === 'uploading' || isFileTranscribing ? styles.uploading : ''}
      `}>
        {getStatusText()}
      </div>

      <div className={styles.meterContainer}>
        <div className={styles.meterLabel}>
          <span>音量偵測</span>
          <span>紅色門檻線 = 觸發錄音</span>
        </div>
        <div className={styles.meter}>
          <div 
            className={styles.thresholdLine} 
            style={{ left: `${Math.min(VOLUME_THRESHOLD * 100 * VISUAL_MULTIPLIER, 99)}%` }}
          ></div>
          <div className={styles.meterFill} style={{ width: `${meterWidth}%` }}></div>
        </div>
      </div>

      <div className={styles.outputSection}>
        <div className={styles.textBox}>
          <label>即時轉錄逐字稿 (對話流)</label>
          <textarea 
            value={transcript} 
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="可點「上傳語音檔」選擇 mp3、wav、m4a 等檔案轉成文字，或使用「開始自動錄音」即時錄音轉錄。" 
          />
        </div>
        <div className={styles.textBox}>
          <div className={styles.textBoxHeader}>
            <label>LLM 結構化報告 (SOAP 格式)</label>
            <button
              type="button"
              onClick={handleDownloadSoapWord}
              disabled={!summary.trim() || isSummarizing}
            >
              儲存 Word
            </button>
          </div>
          <textarea
            className={styles.summaryArea}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="完成對話後點擊「生成醫療報告」..."
          />
        </div>
      </div>
    </div>
  );
};
