import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useA11y } from '../contexts/A11yContext';
import './Navbar.css';

const PAGE_NAMES = {
  '/': 'Home',
  '/translation': 'Translation',
  '/pronunciation': 'Pronunciation',
  '/conversation': 'Conversation',
};

export default function Navbar() {
  const { preferences, toggleMode, announce } = useA11y();

  const location = useLocation();
  const previousPathRef = useRef(location.pathname);

  const isAccessibility =
    preferences.mode === 'accessibility';


  useEffect(() => {
    if (previousPathRef.current === location.pathname) {
      return;
    }

    previousPathRef.current = location.pathname;

    if (!isAccessibility) {
      return;
    }

    const pageName =
      PAGE_NAMES[location.pathname] ||
      'Trang hiện tại';

    announce(`Đã chuyển đến ${pageName}.`, {
      lang: 'vi-VN',
      force: true,
    });
  }, [
    location.pathname,
    isAccessibility,
    announce,
  ]);


  const handleToggleAccessibility = () => {
    const willEnable = !isAccessibility;

    toggleMode();

    const message = willEnable
      ? 'Đã bật chế độ hỗ trợ người khiếm thị.'
      : 'Đã tắt chế độ hỗ trợ người khiếm thị.';

    announce(message, {
      force: true,
      lang: 'vi-VN',
    });
  };


  return (
    <nav
      className="navbar"
      aria-label="Điều hướng chính"
    >

      {/* NAVIGATION */}

      <div className="navbar-links">

        <NavLink
          to="/"
          end
          className="navbar-link"
          aria-label="Home"
          data-a11y-lang="en-US"
        >
          🏠
          <span>Home</span>
        </NavLink>


        <NavLink
          to="/translation"
          className="navbar-link"
          aria-label="Translation"
          data-a11y-lang="en-US"
        >
          🌐
          <span>Translation</span>
        </NavLink>


        <NavLink
          to="/pronunciation"
          className="navbar-link"
          aria-label="Pronunciation"
          data-a11y-lang="en-US"
        >
          🎙️
          <span>Pronunciation</span>
        </NavLink>


        <NavLink
          to="/conversation"
          className="navbar-link"
          aria-label="Conversation"
          data-a11y-lang="en-US"
        >
          💬
          <span>Conversation</span>
        </NavLink>

      </div>


      {/* ACCESSIBILITY */}

      <button
        type="button"
        className={`accessibility-toggle ${
          isAccessibility ? 'enabled' : ''
        }`}
        onClick={handleToggleAccessibility}
        aria-label={
          isAccessibility
            ? 'Tắt chế độ hỗ trợ người khiếm thị'
            : 'Bật chế độ hỗ trợ người khiếm thị'
        }
        aria-pressed={isAccessibility}
        data-a11y-lang="vi-VN"
      >
        {isAccessibility
          ? '🔊 Hỗ trợ: BẬT'
          : '👁️ Hỗ trợ người khiếm thị'}
      </button>

    </nav>
  );
}