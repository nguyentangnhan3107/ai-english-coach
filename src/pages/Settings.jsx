import { useA11y } from '../contexts/A11yContext';
import { getProgress, resetProgress } from '../utils/progressManager';
import { useState } from 'react';
import './Settings.css';

export default function Settings() {
  const { preferences, toggleMode, announce } = useA11y();
  const [progress, setProgress] = useState(getProgress());
  const reset = () => {
    if (!window.confirm('Bạn có chắc muốn đặt lại tiến độ học tập?')) return;
    const next = resetProgress();
    setProgress(next);
    announce('Đã đặt lại tiến độ học tập.', { force: true, lang: 'vi-VN' });
  };
  return <main className="settings-page">
    <h1 className="page-title">Cài đặt</h1>
    <p className="page-subtitle">Điều chỉnh trải nghiệm AI English Coach.</p>
    <section className="settings-card">
      <h2>♿ Trợ năng</h2>
      <button className="setting-row" type="button" onClick={toggleMode} aria-pressed={preferences.mode === 'accessibility'}>
        <span><strong>Hỗ trợ người khiếm thị</strong><small>Điều hướng bàn phím, đọc nội dung và phản hồi bằng giọng nói.</small></span>
        <b>{preferences.mode === 'accessibility' ? 'BẬT' : 'TẮT'}</b>
      </button>
      <div className="setting-row static"><span><strong>Trạng thái tiến độ</strong><small>{progress.xp} XP • {progress.streak} ngày streak • {progress.pronunciationCount} chủ đề phát âm</small></span></div>
      <button className="danger-button" type="button" onClick={reset}>↺ Đặt lại tiến độ</button>
    </section>
  </main>;
}
