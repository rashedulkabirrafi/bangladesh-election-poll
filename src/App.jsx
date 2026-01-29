import React, { useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import './App.css';

const constituencies = [
  { id: 'dhaka-8', name: 'ঢাকা-৮', nameEn: 'Dhaka-8' },
  { id: 'dhaka-9', name: 'ঢাকা-৯', nameEn: 'Dhaka-9' },
  { id: 'dhaka-15', name: 'ঢাকা-১৫', nameEn: 'Dhaka-15' }
];

// Real candidates for 2026 election
const candidates = {
  'dhaka-8': [
    'মির্জা আব্বাস (বিএনপি)',
    'নাসিরউদ্দিন পাটোয়ারী (এনসিপি)',
    'কেফায়েত উল্লাহ (ইসলামী আন্দোলন)',
    'মেঘনা আলম (গণ অধিকার পরিষদ)'
  ],
  'dhaka-9': [
    'হাবিবুর রশিদ হাবিব (বিএনপি)',
    'কবির আহমেদ (জামায়াত)',
    'জাবেদ রাসিন (এনসিপি)',
    'তাসনিম জারা (স্বতন্ত্র)',
    'কাজী আবুল খায়ের (জাতীয় পার্টি)',
    'শাহ ইফতেখার আহসান (ইসলামী আন্দোলন)'
  ],
  'dhaka-15': [
    'ড. শফিকুর রহমান (জামায়াত আমীর)',
    'শফিকুল ইসলাম খান (বিএনপি)',
    'শামসুল হক (জাতীয় পার্টি)',
    'এ কে এম শফিকুল ইসলাম (গণফোরাম)',
    'আশফাকুর রহমান (জাসদ)',
    'খান শোয়েব আমান উল্লাহ (জনতার দল)'
  ]
};

const verificationQuestions = [
  {
    question: 'বাংলাদেশের জাতীয় ফুল কী?',
    options: ['শাপলা', 'গোলাপ', 'বেলি', 'জবা'],
    correct: 0
  },
  {
    question: 'বাংলাদেশের রাজধানী কোথায়?',
    options: ['চট্টগ্রাম', 'ঢাকা', 'সিলেট', 'রাজশাহী'],
    correct: 1
  },
  {
    question: 'বাংলাদেশের স্বাধীনতা দিবস কবে?',
    options: ['২১শে ফেব্রুয়ারি', '১৬ই ডিসেম্বর', '২৬শে মার্চ', '৭ই মার্চ'],
    correct: 2
  }
];

const stepOrder = [
  { key: 'select', label: 'এলাকা নির্বাচন' },
  { key: 'verify', label: 'যাচাইকরণ' },
  { key: 'vote', label: 'ভোট দিন' },
  { key: 'results', label: 'ফলাফল' }
];

// Simple browser fingerprinting
const generateFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);
  const canvasData = canvas.toDataURL();

  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvas: canvasData.slice(-50)
  };

  return btoa(JSON.stringify(fingerprint));
};

const Stepper = ({ current }) => (
  <div className="stepper" aria-label="প্রক্রিয়া অগ্রগতি">
    {stepOrder.map((step, index) => {
      const isActive = step.key === current;
      const isDone = stepOrder.findIndex(s => s.key === current) > index;
      return (
        <div
          key={step.key}
          className={`step ${isActive ? 'step-active' : ''} ${isDone ? 'step-done' : ''}`}
        >
          <div className="step-dot">{index + 1}</div>
          <span className="step-label">{step.label}</span>
        </div>
      );
    })}
  </div>
);

const ElectionPoll = () => {
  const [step, setStep] = useState('select'); // select, verify, vote, results, blocked
  const [selectedConstituency, setSelectedConstituency] = useState(null);
  const [verificationQ, setVerificationQ] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [votes, setVotes] = useState({});
  const [fingerprint, setFingerprint] = useState('');

  useEffect(() => {
    const savedVotes = localStorage.getItem('pollVotes');
    if (savedVotes) {
      setVotes(JSON.parse(savedVotes));
    }

    const fp = generateFingerprint();
    setFingerprint(fp);

    const voted = localStorage.getItem(`voted_${fp}`);
    if (voted) {
      setStep('blocked');
    }
  }, []);

  const selectConstituency = (constituency) => {
    setSelectedConstituency(constituency);
    const randomQ = verificationQuestions[Math.floor(Math.random() * verificationQuestions.length)];
    setVerificationQ(randomQ);
    setSelectedAnswer(null);
    setSelectedCandidate(null);
    setError('');
    setStep('verify');
  };

  const verifyAnswer = () => {
    if (selectedAnswer === verificationQ.correct) {
      setStep('vote');
      setError('');
    } else {
      setError('ভুল উত্তর। অনুগ্রহ করে আবার চেষ্টা করুন।');
      setSelectedAnswer(null);
    }
  };

  const submitVote = () => {
    if (!selectedCandidate) {
      setError('অনুগ্রহ করে একজন প্রার্থী নির্বাচন করুন');
      return;
    }

    const newVotes = { ...votes };
    if (!newVotes[selectedConstituency.id]) {
      newVotes[selectedConstituency.id] = {};
    }
    newVotes[selectedConstituency.id][selectedCandidate] =
      (newVotes[selectedConstituency.id][selectedCandidate] || 0) + 1;

    setVotes(newVotes);
    localStorage.setItem('pollVotes', JSON.stringify(newVotes));
    localStorage.setItem(`voted_${fingerprint}`, Date.now().toString());

    setStep('results');
  };

  const getTotalVotes = (constituencyId) => {
    if (!votes[constituencyId]) return 0;
    return Object.values(votes[constituencyId]).reduce((a, b) => a + b, 0);
  };

  const getPercentage = (constituencyId, candidate) => {
    const total = getTotalVotes(constituencyId);
    if (total === 0) return 0;
    return ((votes[constituencyId]?.[candidate] || 0) / total * 100).toFixed(1);
  };

  const resetToSelect = () => {
    setSelectedConstituency(null);
    setSelectedCandidate(null);
    setSelectedAnswer(null);
    setError('');
    setStep('select');
  };

  if (step === 'blocked') {
    return (
      <div className="page">
        <div className="container">
          <div className="card centered">
            <AlertCircle className="icon-warning" />
            <h2 className="title">আপনি ইতিমধ্যে ভোট দিয়েছেন</h2>
            <p className="subtitle">প্রতি ডিভাইস থেকে একবার মাত্র ভোট দেওয়া যাবে।</p>
            <div className="actions">
              <button
                onClick={() => setStep('results')}
                className="btn btn-primary"
              >
                ফলাফল দেখুন
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'select') {
    return (
      <div className="page">
        <div className="container">
          <div className="card">
            <div className="header">
              <h1 className="headline">বাংলাদেশ নির্বাচন জরিপ ২০২৬</h1>
              <p className="subtitle">আপনার এলাকার জন্য ভোট দিন এবং ফলাফল দেখুন</p>
            </div>

            <Stepper current={step} />

            <div className="grid">
              {constituencies.map(constituency => (
                <button
                  key={constituency.id}
                  onClick={() => selectConstituency(constituency)}
                  className="select-card"
                >
                  <div>
                    <h3 className="card-title">{constituency.name}</h3>
                    <p className="card-meta">{constituency.nameEn}</p>
                  </div>
                  <div className="badge">
                    মোট ভোট: {getTotalVotes(constituency.id)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title">সব এলাকার ফলাফল</div>
            {constituencies.map(constituency => (
              <div key={constituency.id} className="result-block">
                <h4 className="result-title">{constituency.name}</h4>
                {getTotalVotes(constituency.id) === 0 ? (
                  <p className="muted">এখনো কোনো ভোট পড়েনি</p>
                ) : (
                  candidates[constituency.id].map(candidate => (
                    <div key={candidate} className="result-row">
                      <div className="result-label">
                        <span>{candidate}</span>
                        <span className="result-value">
                          {getPercentage(constituency.id, candidate)}%
                        </span>
                      </div>
                      <div className="bar">
                        <div
                          className="bar-fill"
                          style={{ width: `${getPercentage(constituency.id, candidate)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="page">
        <div className="container narrow">
          <div className="card">
            <div className="header">
              <h2 className="title">যাচাইকরণ</h2>
              <p className="subtitle">{selectedConstituency.name}</p>
            </div>

            <Stepper current={step} />

            <div className="question">
              <p className="question-text">{verificationQ.question}</p>
              <div className="stack">
                {verificationQ.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(index)}
                    className={`option ${selectedAnswer === index ? 'option-selected' : ''}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}

            <div className="actions">
              <button
                onClick={resetToSelect}
                className="btn btn-secondary"
              >
                বাতিল
              </button>
              <button
                onClick={verifyAnswer}
                disabled={selectedAnswer === null}
                className="btn btn-primary"
              >
                এগিয়ে যান
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'vote') {
    return (
      <div className="page">
        <div className="container narrow">
          <div className="card">
            <div className="header">
              <h2 className="title">আপনার পছন্দ নির্বাচন করুন</h2>
              <p className="subtitle">{selectedConstituency.name}</p>
            </div>

            <Stepper current={step} />

            <div className="stack">
              {candidates[selectedConstituency.id].map((candidate, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedCandidate(candidate)}
                  className={`option option-wide ${selectedCandidate === candidate ? 'option-selected' : ''}`}
                >
                  <span>{candidate}</span>
                  {selectedCandidate === candidate && <Check className="icon-check" />}
                </button>
              ))}
            </div>

            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}

            <div className="actions">
              <button
                onClick={() => setStep('verify')}
                className="btn btn-secondary"
              >
                পিছনে
              </button>
              <button
                onClick={submitVote}
                className="btn btn-primary"
              >
                ভোট জমা দিন
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results') {
    const showAll = !selectedConstituency;
    return (
      <div className="page">
        <div className="container narrow">
          <div className="card">
            <div className="header centered">
              {!showAll && (
                <div className="success-icon">
                  <Check className="icon-check" />
                </div>
              )}
              <h2 className="title">{showAll ? 'সব এলাকার ফলাফল' : 'ধন্যবাদ!'}</h2>
              <p className="subtitle">
                {showAll ? 'সর্বশেষ ভোটের সারাংশ' : 'আপনার ভোট সফলভাবে জমা হয়েছে'}
              </p>
            </div>

            <Stepper current={step} />

            {showAll ? (
              <div className="stack">
                {constituencies.map(constituency => (
                  <div key={constituency.id} className="result-block">
                    <h4 className="result-title">{constituency.name}</h4>
                    {getTotalVotes(constituency.id) === 0 ? (
                      <p className="muted">এখনো কোনো ভোট পড়েনি</p>
                    ) : (
                      candidates[constituency.id].map(candidate => (
                        <div key={candidate} className="result-row">
                          <div className="result-label">
                            <span>{candidate}</span>
                            <span className="result-value">
                              {getPercentage(constituency.id, candidate)}%
                              <span className="result-count">
                                ({votes[constituency.id]?.[candidate] || 0})
                              </span>
                            </span>
                          </div>
                          <div className="bar">
                            <div
                              className="bar-fill"
                              style={{ width: `${getPercentage(constituency.id, candidate)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                    <p className="muted">মোট ভোট: {getTotalVotes(constituency.id)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="result-summary">
                <h3 className="section-title">{selectedConstituency.name} - বর্তমান ফলাফল</h3>
                {candidates[selectedConstituency.id].map(candidate => (
                  <div key={candidate} className="result-row">
                    <div className="result-label">
                      <span>{candidate}</span>
                      <span className="result-value">
                        {getPercentage(selectedConstituency.id, candidate)}%
                        <span className="result-count">
                          ({votes[selectedConstituency.id]?.[candidate] || 0})
                        </span>
                      </span>
                    </div>
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{ width: `${getPercentage(selectedConstituency.id, candidate)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="muted">মোট ভোট: {getTotalVotes(selectedConstituency.id)}</p>
              </div>
            )}

            <div className="actions">
              {!showAll && (
                <button
                  onClick={() => setSelectedConstituency(null)}
                  className="btn btn-secondary"
                >
                  সব এলাকার ফলাফল
                </button>
              )}
              <button
                onClick={resetToSelect}
                className="btn btn-primary"
              >
                শুরুর পৃষ্ঠা
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ElectionPoll;
