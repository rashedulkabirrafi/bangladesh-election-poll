import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ step, setStep }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavClick = (newStep) => {
    setStep(newStep);
    setIsMenuOpen(false);
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
            className={`nav-link ${step === 'home' || step === 'select' || step === 'vote' ? 'active' : ''}`}
            onClick={() => handleNavClick('home')}
          >
            হোম
          </button>
          <button 
            className={`nav-link ${step === 'alliances' ? 'active' : ''}`}
            onClick={() => handleNavClick('alliances')}
          >
            দল ও জোট
          </button>         
        </div>

        <div className="navbar-menu-mobile-toggle" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </div>
      </div>

      {isMenuOpen && (
        <div className="navbar-mobile-overlay">
          <div className="navbar-mobile-menu">
            <button 
              className={`mobile-nav-link ${step === 'home' ? 'active' : ''}`}
              onClick={() => handleNavClick('home')}
            >
              হোম
            </button>
            <button 
              className={`mobile-nav-link ${step === 'alliances' ? 'active' : ''}`}
              onClick={() => handleNavClick('alliances')}
            >
              দল ও জোট
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
