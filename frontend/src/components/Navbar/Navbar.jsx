import React from 'react';
import './Navbar.css';

const Navbar = ({ step, setStep }) => {
  const handleNavClick = (newStep) => {
    setStep(newStep);
  };



  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => handleNavClick('home')}>
          <div className="logo-icon">🇧🇩</div>
          <span className="logo-text">নির্বাচন ২০২৬</span>
        </div>

        <div className="navbar-menu-desktop">
          <button 
            className={`nav-link ${step === 'select' || step === 'vote' ? 'active' : ''}`}
            onClick={() => handleNavClick('select')}
          >
            ভোট দিন
          </button>
          <button 
            className={`nav-link ${step === 'result' ? 'active' : ''}`}
            onClick={() => handleNavClick('result')}
          >
            ফলাফল (ম্যাপ)
          </button>
          <button 
            className={`nav-link ${step === 'all-results' || step === 'results' ? 'active' : ''}`}
            onClick={() => handleNavClick('all-results')}
          >
            সকল ফলাফল
          </button>
          <button 
            className={`nav-link ${step === 'alliances' ? 'active' : ''}`}
            onClick={() => handleNavClick('alliances')}
          >
            দল ও জোট
          </button>
          <button
            className={`nav-link ${step === 'guide' ? 'active' : ''}`}
            onClick={() => handleNavClick('guide')}
          >
            ভোট নির্দেশিকা
          </button>
          <button 
            className={`nav-link ${step === 'home' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            হোম
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
