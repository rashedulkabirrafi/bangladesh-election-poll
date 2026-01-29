import React, { useMemo, useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import './App.css';
import constituencyData from './assets/constituencies.json';
import candidatesData from './assets/candidates.json';

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

const makeKey = (division, district, constituency) =>
  `${division}||${district}||${constituency}`;

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
      const currentIndex = stepOrder.findIndex((item) => item.key === current);
      const isActive = step.key === current;
      const isDone = currentIndex > index;
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
  const [step, setStep] = useState('select');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState(null);
  const [verificationQ, setVerificationQ] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [votes, setVotes] = useState({});
  const [fingerprint, setFingerprint] = useState('');
  const [blocked, setBlocked] = useState(false);

  const constituencyRows = useMemo(() => constituencyData || [], []);

  const divisions = useMemo(
    () => [...new Set(constituencyRows.map((row) => row.division))],
    [constituencyRows]
  );

  const districtsByDivision = useMemo(() => {
    const map = new Map();
    constituencyRows.forEach(({ division, district }) => {
      if (!map.has(division)) map.set(division, new Set());
      map.get(division).add(district);
    });
    return map;
  }, [constituencyRows]);

  const constituenciesByDistrict = useMemo(() => {
    const map = new Map();
    constituencyRows.forEach(({ division, district, constituency }) => {
      const key = `${division}||${district}`;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key).add(constituency);
    });
    return map;
  }, [constituencyRows]);

  const districts = selectedDivision
    ? [...(districtsByDivision.get(selectedDivision) || [])]
    : [];

  const constituencyOptions =
    selectedDivision && selectedDistrict
      ? [
          ...(constituenciesByDistrict.get(
            `${selectedDivision}||${selectedDistrict}`
          ) || [])
        ]
      : [];

  useEffect(() => {
    const savedVotes = localStorage.getItem('pollVotes');
    if (savedVotes) {
      setVotes(JSON.parse(savedVotes));
    }

    const fp = generateFingerprint();
    setFingerprint(fp);

    const voted = localStorage.getItem(`voted_${fp}`);
    if (voted) {
      setBlocked(true);
      setStep('results');
    }
  }, []);

  const selectConstituency = () => {
    if (!selectedDivision || !selectedDistrict || !selectedConstituency) return;
    const randomQ =
      verificationQuestions[Math.floor(Math.random() * verificationQuestions.length)];
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
    if (!selectedCandidate || !selectedConstituency) {
      setError('অনুগ্রহ করে একজন প্রার্থী নির্বাচন করুন');
      return;
    }

    const key = selectedConstituency.key;
    const newVotes = { ...votes };
    if (!newVotes[key]) {
      newVotes[key] = {};
    }

    const label = `${selectedCandidate.name} (${selectedCandidate.party || 'স্বতন্ত্র'})`;
    newVotes[key][label] = (newVotes[key][label] || 0) + 1;

    setVotes(newVotes);
    localStorage.setItem('pollVotes', JSON.stringify(newVotes));
    localStorage.setItem(`voted_${fingerprint}`, Date.now().toString());

    setStep('results');
  };

  const getTotalVotes = (key) => {
    if (!votes[key]) return 0;
    return Object.values(votes[key]).reduce((a, b) => a + b, 0);
  };

  const getPercentage = (key, candidate) => {
    const total = getTotalVotes(key);
    if (total === 0) return 0;
    return ((votes[key]?.[candidate] || 0) / total * 100).toFixed(1);
  };

  const resetToSelect = () => {
    setSelectedConstituency(null);
    setSelectedCandidate(null);
    setSelectedAnswer(null);
    setError('');
    setStep('select');
  };

  const candidatesForConstituency = selectedConstituency
    ? candidatesData[selectedConstituency.name] || []
    : [];

  if (step === 'select') {
    const hasData = divisions.length > 0;
    return (
      <div className="page">
        <div className="container">
          <div className="card">
            <div className="header">
              <h1 className="headline">বাংলাদেশ নির্বাচন জরিপ ২০২৬</h1>
              <p className="subtitle">প্রথমে বিভাগ, এরপর জেলা ও আসন নির্বাচন করুন</p>
            </div>

            <Stepper current={step} />

            {!hasData && (
              <div className="alert" role="alert">
                নির্বাচনী আসনের তালিকা লোড করা যাচ্ছে না। Excel ফাইলটি ঠিক আছে কিনা যাচাই করুন।
              </div>
            )}

            <div className="form-grid">
              <label className="field">
                <span>বিভাগ</span>
                <select
                  value={selectedDivision}
                  onChange={(e) => {
                    setSelectedDivision(e.target.value);
                    setSelectedDistrict('');
                    setSelectedConstituency(null);
                  }}
                >
                  <option value="">বিভাগ নির্বাচন করুন</option>
                  {divisions.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>জেলা</span>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedConstituency(null);
                  }}
                  disabled={!selectedDivision}
                >
                  <option value="">জেলা নির্বাচন করুন</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>নির্বাচনী আসন</span>
                <select
                  value={selectedConstituency?.name || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    if (!name) {
                      setSelectedConstituency(null);
                      return;
                    }
                    setSelectedConstituency({
                      division: selectedDivision,
                      district: selectedDistrict,
                      name,
                      key: makeKey(selectedDivision, selectedDistrict, name)
                    });
                  }}
                  disabled={!selectedDivision || !selectedDistrict}
                >
                  <option value="">আসন নির্বাচন করুন</option>
                  {constituencyOptions.map((constituency) => (
                    <option key={constituency} value={constituency}>
                      {constituency}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedConstituency && (
              <div className="preview">
                <div>
                  <div className="preview-title">নির্বাচিত এলাকা</div>
                  <div className="preview-name">{selectedConstituency.name}</div>
                  <div className="preview-meta">
                    {selectedConstituency.division} · {selectedConstituency.district}
                  </div>
                </div>
                <div className="preview-votes">
                  মোট ভোট: {getTotalVotes(selectedConstituency.key)}
                </div>
              </div>
            )}

            <div className="actions">
              <button
                onClick={selectConstituency}
                disabled={!selectedDivision || !selectedDistrict || !selectedConstituency}
                className="btn btn-primary"
              >
                যাচাইকরণ শুরু করুন
              </button>
            </div>
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
              <button onClick={resetToSelect} className="btn btn-secondary">
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
        <div className="container">
          <div className="card">
            <div className="header">
              <h2 className="title">প্রার্থী তালিকা</h2>
              <p className="subtitle">{selectedConstituency.name}</p>
            </div>

            <Stepper current={step} />

            {candidatesForConstituency.length === 0 ? (
              <div className="alert" role="alert">
                এই আসনের জন্য প্রার্থী তালিকা পাওয়া যায়নি।
              </div>
            ) : (
              <div className="table-wrap">
                <table className="candidate-table">
                  <thead>
                    <tr>
                      <th>ক্রম</th>
                      <th>প্রার্থী</th>
                      <th>ছবি</th>
                      <th>দল/স্বতন্ত্র</th>
                      <th>প্রতীক</th>
                      <th>হলফনামা</th>
                      <th>ব্যয় বিবরণী</th>
                      <th>কর রিটার্ন</th>
                      <th>ভোট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidatesForConstituency.map((candidate, index) => (
                      <tr key={`${candidate.name}-${index}`}>
                        <td>{index + 1}</td>
                        <td>{candidate.name}</td>
                        <td>
                          {candidate.photo ? (
                            <img
                              src={candidate.photo}
                              alt={candidate.name}
                              className="candidate-photo"
                            />
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{candidate.party || '-'}</td>
                        <td>{candidate.symbol || '-'}</td>
                        <td>
                          {candidate.affidavit ? (
                            <a href={candidate.affidavit} target="_blank" rel="noreferrer">
                              ডাউনলোড
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {candidate.expense ? (
                            <a href={candidate.expense} target="_blank" rel="noreferrer">
                              ডাউনলোড
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {candidate.tax ? (
                            <a href={candidate.tax} target="_blank" rel="noreferrer">
                              ডাউনলোড
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <button
                            className={`btn btn-small ${
                              selectedCandidate === candidate ? 'btn-primary' : 'btn-secondary'
                            }`}
                            onClick={() => setSelectedCandidate(candidate)}
                          >
                            {selectedCandidate === candidate ? 'নির্বাচিত' : 'ভোট দিন'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}

            <div className="actions">
              <button onClick={() => setStep('verify')} className="btn btn-secondary">
                পিছনে
              </button>
              <button onClick={submitVote} className="btn btn-primary" disabled={!selectedCandidate}>
                ভোট জমা দিন
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'results') {
    const resultKey = selectedConstituency?.key;
    return (
      <div className="page">
        <div className="container narrow">
          <div className="card">
            <div className="header centered">
              <div className="success-icon">
                <Check className="icon-check" />
              </div>
              <h2 className="title">{blocked ? 'আপনি ইতিমধ্যে ভোট দিয়েছেন' : 'ধন্যবাদ!'}</h2>
              <p className="subtitle">
                {blocked
                  ? 'প্রতি ডিভাইস থেকে একবার মাত্র ভোট দেওয়া যাবে।'
                  : 'আপনার ভোট সফলভাবে জমা হয়েছে'}
              </p>
            </div>

            <Stepper current={step} />

            {resultKey && (
              <div className="result-summary">
                <h3 className="section-title">{selectedConstituency.name} - বর্তমান ফলাফল</h3>
                {Object.keys(votes[resultKey] || {}).length === 0 ? (
                  <p className="muted">এখনো কোনো ভোট পড়েনি</p>
                ) : (
                  Object.keys(votes[resultKey] || {}).map((candidate) => (
                    <div key={candidate} className="result-row">
                      <div className="result-label">
                        <span>{candidate}</span>
                        <span className="result-value">
                          {getPercentage(resultKey, candidate)}%
                          <span className="result-count">({votes[resultKey]?.[candidate] || 0})</span>
                        </span>
                      </div>
                      <div className="bar">
                        <div
                          className="bar-fill"
                          style={{ width: `${getPercentage(resultKey, candidate)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
                <p className="muted">মোট ভোট: {getTotalVotes(resultKey)}</p>
              </div>
            )}

            <div className="actions">
              <button onClick={resetToSelect} className="btn btn-primary">
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
