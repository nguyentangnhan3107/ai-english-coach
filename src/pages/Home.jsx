import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProgress } from '../utils/progressManager';
import './Home.css';

const DEFAULT = { xp:0, streak:0, goal:450, translationCount:0, pronunciationCount:0, conversationCount:0 };

const lessons = [
  { path:'/translation', icon:'🌐', title:'Translation', text:'Biến câu tiếng Việt thành tiếng Anh tự nhiên.', color:'purple' },
  { path:'/pronunciation', icon:'🎤', title:'Pronunciation', text:'Luyện phát âm và theo dõi tiến bộ từng chủ đề.', color:'blue' },
  { path:'/conversation', icon:'💬', title:'Conversation', text:'Trò chuyện với AI để luyện phản xạ.', color:'green' },
];

export default function Home() {
  const navigate = useNavigate();
  const [progress,setProgress]=useState({...DEFAULT,...getProgress()});
  useEffect(() => {
    const refresh = () => setProgress({...DEFAULT,...getProgress()});
    window.addEventListener('englishCoachProgressUpdated',refresh);
    window.addEventListener('focus',refresh);
    return () => {
      window.removeEventListener('englishCoachProgressUpdated',refresh);
      window.removeEventListener('focus',refresh);
    };
  }, []);
  const percent = Math.min(100, Math.round((progress.xp / progress.goal) * 100));
  const total = progress.translationCount + progress.pronunciationCount + progress.conversationCount;
  const achievements = [
    ['🔥','7 Day Streak','Học 7 ngày liên tiếp',progress.streak >= 7],
    ['📚','First Lesson','Hoàn thành buổi học đầu tiên',total >= 1],
    ['🎤','Pronunciation Master','10 lượt luyện phát âm',progress.pronunciationCount >= 10],
  ];
  const rank = progress.xp >= 1000 ? 'Diamond' : progress.xp >= 500 ? 'Gold' : progress.xp >= 200 ? 'Silver' : 'Bronze';

  return <div className="home">
    <section className="welcome">
      <div>
        <span className="eyebrow">YOUR LEARNING HUB</span>
        <h1>Học tiếng Anh <span>thông minh hơn</span> cùng AI.</h1>
        <p>Luyện dịch, phát âm và hội thoại trong một nơi — với tiến độ được lưu tự động.</p>
        <button className="primary-cta" onClick={() => navigate('/translation')}>🚀 Bắt đầu học</button>
      </div>
      <div className="mascot" aria-hidden="true">🤖</div>
    </section>

    <section className="stat-grid" aria-label="Thống kê học tập">
      <div className="home-stat"><span>🔥</span><div><b>{progress.streak}</b><small>Ngày streak</small></div></div>
      <div className="home-stat"><span>⭐</span><div><b>{progress.xp}</b><small>XP tích lũy</small></div></div>
      <div className="home-stat"><span>💎</span><div><b>{Math.floor(progress.xp / 20)}</b><small>Gems</small></div></div>
      <div className="home-stat"><span>🏅</span><div><b>{rank}</b><small>Hạng hiện tại</small></div></div>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><span className="eyebrow">KEEP GOING</span><h2>Tiến độ hôm nay</h2></div><b>{percent}%</b></div>
      <div className="progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100" aria-label={`Tiến độ học tập ${percent}%`}><div style={{width:`${percent}%`}} /></div>
      <div className="progress-caption"><span>{progress.xp} / {progress.goal} XP</span><span>{total} lượt học hoàn thành</span></div>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><span className="eyebrow">LEARN</span><h2>Chọn bài học</h2></div></div>
      <div className="lesson-grid">{lessons.map(x => <button key={x.path} className={`lesson-card ${x.color}`} onClick={() => navigate(x.path)}><span className="lesson-icon">{x.icon}</span><h3>{x.title}</h3><p>{x.text}</p><span className="lesson-arrow">Học ngay →</span></button>)}</div>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><span className="eyebrow">ACHIEVEMENTS</span><h2>Thành tích</h2></div></div>
      <div className="achievement-grid">{achievements.map(([icon,title,text,unlocked]) => <div className={`achievement ${unlocked ? 'unlocked' : ''}`} key={title}><span>{icon}</span><div><b>{title}</b><small>{text}</small></div><strong>{unlocked ? '✓' : '🔒'}</strong></div>)}</div>
    </section>

    <section className="section-block leaderboard-card">
      <div className="section-heading"><div><span className="eyebrow">WEEKLY</span><h2>🏆 Bảng xếp hạng</h2></div><span className="you-rank">Bạn</span></div>
      {[['🥇','Minh',1240],['🥈','An',950],['🥉','Khoa',870],['4.','Bạn',progress.xp]].map(([medal,name,xp]) => <div className={`leader-row ${name === 'Bạn' ? 'you' : ''`} key={name}><span>{medal}</span><b>{name}</b><strong>{xp} XP</strong></div>)}
    </section>
  </div>;
}