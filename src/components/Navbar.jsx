import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useA11y } from '../contexts/A11yContext';
import { getProgress } from '../utils/progressManager';
import './Navbar.css';

const ITEMS = [
  ['/', '🏠', 'Home'],
  ['/translation', '🌐', 'Translation'],
  ['/pronunciation', '🎤', 'Pronunciation'],
  ['/conversation', '💬', 'Conversation'],
];

export default function Navbar() {
  const { preferences, toggleMode, announce } = useA11y();
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const progress = getProgress();
  const a11y = preferences.mode === 'accessibility';

  useEffect(() => {
    if (previousPathRef.current === location.pathname) return;
    previousPathRef.current = location.pathname;
    if (a11y) announce('Đã chuyển đến trang ' + (ITEMS.find(x => x[0] === location.pathname)?.[2] || 'hiện tại') + '.', { force: true, lang: 'vi-VN' });
  }, [location.pathname, a11y, announce]);

  const toggleA11y = () => {
    const next = !a11y;
    toggleMode();
    announce(next ? 'Đã bật hỗ trợ người khiếm thị.' : 'Đã tắt hỗ trợ người khiếm thị.', { force: true, lang: 'vi-VN' });
  };

  return (
    <>
      <aside className="sidebar" aria-label="Điều hướng chính">
        <NavLink to="/" className="brand" aria-label="AI English Coach - Trang chủ">
          <span className="brand-icon">🤖</span>
          <span><b>AI English</b><small>COACH</small></span>
        </NavLink>

        <nav className="sidebar-nav">
          <div className="nav-label">HỌC TẬP</div>
          {ITEMS.map(([path, icon, label]) => (
            <NavLink key={path} to={path} end={path === '/'} className="sidebar-link" data-a11y-lang="en-US">
              <span className="nav-icon">{icon}</span><span>{label}</span>
            </NavLink>
          ))}
          <div className="nav-label nav-label-spaced">KHÁM PHÁ</div>
          <button className="sidebar-link nav-demo" type="button" onClick={() => announce('Bảng xếp hạng đang hiển thị trên trang chủ.', { force: true })}>
            <span className="nav-icon">🏆</span><span>Leaderboard</span>
          </button>
          <button className="sidebar-link nav-demo" type="button" onClick={() => announce('Nhiệm vụ học tập đang được phát triển.', { force: true })}>
            <span className="nav-icon">🎯</span><span>Missions</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className={`sidebar-link a11y-link ${a11y ? 'enabled' : ''}`} onClick={toggleA11y} aria-pressed={a11y}>
            <span className="nav-icon">{a11y ? '🔊' : '👁️'}</span><span>{a11y ? 'Trợ năng: BẬT' : 'Hỗ trợ người khiếm thị'}</span>
          </button>
          <NavLink to="/settings" className="sidebar-link">
            <span className="nav-icon">⚙️</span><span>Settings</span>
          </NavLink>
        </div>
      </aside>

      <header className="coach-topbar">
        <div className="topbar-title">
          <span>AI English Coach</span>
          <small>Học tiếng Anh cùng AI</small>
        </div>
        <div className="topbar-stats" aria-label="Tiến độ học tập">
          <div className="stat-pill streak"><span>🔥</span><b>{progress.streak}</b><small>Streak</small></div>
          <div className="stat-pill xp"><span>⭐</span><b>{progress.xp}</b><small>XP</small></div>
          <div className="stat-pill gems"><span>💎</span><b>{Math.floor(progress.xp / 20)}</b><small>Gems</small></div>
          <button className={`a11y-top ${a11y ? 'enabled' : ''}`} onClick={toggleA11y} aria-label={a11y ? 'Tắt hỗ trợ người khiếm thị' : 'Bật hỗ trợ người khiếm thị'}>{a11y ? '🔊' : '👁️'} <span>Hỗ trợ</span></button>
        </div>
      </header>

      <nav className="mobile-nav" aria-label="Điều hướng trên điện thoại">
        {ITEMS.map(([path, icon, label]) => <NavLink key={path} to={path} end={path === '/'}><span>{icon}</span><small>{label}</small></NavLink>)}
      </nav>
    </>
  );
}
