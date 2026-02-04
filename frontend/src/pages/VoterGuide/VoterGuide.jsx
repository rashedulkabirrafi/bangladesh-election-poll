import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import './VoterGuide.css';
import {
  votingSlides,
  voterRights,
  mythFactsBn,
  checklistItems,
  didYouKnow
} from './voterGuideData';

const VoterGuide = ({ step, setStep }) => {
  return (
    <div className="page guide-page">
      <Navbar step={step} setStep={setStep} />
      <div className="container">
        <div className="guide-header">
          <h1 className="guide-title">ভোটার নির্দেশিকা</h1>
          <p className="guide-subtitle">বাস্তব জীবনে ভোট দেওয়ার সঠিক পদ্ধতি</p>
        </div>

        <section className="guide-section">
          <h2 className="guide-section-title">ভোট দেওয়ার ধাপ (সংক্ষেপে)</h2>
          <div className="guide-grid">
            {votingSlides.map((slide, idx) => (
              <div className="step-card" key={`${slide.title}-${idx}`}>
                <div className="step-title">{slide.title}</div>
                <p className="muted">{slide.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="guide-section">
          <h2 className="guide-section-title">ভোটারের অধিকার</h2>
          <ul className="list">
            {voterRights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="guide-section">
          <h2 className="guide-section-title">মিথ বনাম সত্য</h2>
          <div className="guide-grid">
            {mythFactsBn.map((item, idx) => (
              <div className="myth-fact" key={`${item.myth}-${idx}`}>
                <p>
                  <strong>মিথ:</strong> {item.myth}
                </p>
                <p className="fact">
                  <strong>ফ্যাক্ট:</strong> {item.fact}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="guide-section">
          <h2 className="guide-section-title">ভোটিং ডে চেকলিস্ট</h2>
          <ul className="list">
            {checklistItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="guide-section">
          <h2 className="guide-section-title">জানেন কি?</h2>
          <div className="guide-grid">
            {didYouKnow.map((item, idx) => (
              <div className="tip-card" key={`${item.slice(0, 24)}-${idx}`}>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="guide-section">
          <div className="cta-note">
            ভোটের দিন সমস্যায় পড়লে পোলিং অফিসারের সাহায্য নিন। আপনার ভোট আপনার অধিকার।
          </div>
        </section>
      </div>
    </div>
  );
};

export default VoterGuide;
