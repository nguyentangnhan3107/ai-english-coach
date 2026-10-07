import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';

import Navbar from './components/Navbar';
import EnglishParticles from './components/EnglishParticles';
import SoundEffects from './components/SoundEffects';

import Home from './pages/Home';
import Translation from './pages/Translation';
import Pronunciation from './pages/Pronunciation';
import Conversation from './pages/Conversation';

import { A11yProvider } from './contexts/A11yContext';

import './styles/pageTransition.css';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className="page-transition-wrapper"
    >
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/translation" element={<Translation />} />
        <Route path="/pronunciation" element={<Pronunciation />} />
        <Route path="/conversation" element={<Conversation />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <A11yProvider>
      <BrowserRouter>

        <EnglishParticles />
        <SoundEffects />

        <div className="app-content">

          {/* TOP NAVBAR */}
          <Navbar />

          {/* PAGE CONTENT */}
          <main>
            <AnimatedRoutes />
          </main>

        </div>

      </BrowserRouter>
    </A11yProvider>
  );
}

export default App;