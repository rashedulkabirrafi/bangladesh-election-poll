import React, { useMemo, useState, useEffect } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import './App.css';
import constituencyData from './assets/constituencies.json';

const API_BASE = '/api';

const candidatesByName = {
  'ঢাকা-৮': [
    'মির্জা আব্বাস (বিএনপি)',
    'নাসিরউদ্দিন পাটোয়ারী (এনসিপি)',
    'কেফায়েত উল্লাহ (ইসলামী আন্দোলন)',
    'মেঘনা আলম (গণ অধিকার পরিষদ)'
  ],
  'ঢাকা-৯': [
    'হাবিবুর রশিদ হাবিব (বিএনপি)',
    'কবির আহমেদ (জামায়াত)',
    'জাবেদ রাসিন (এনসিপি)',
    'তাসনিম জারা (স্বতন্ত্র)',
    'কাজী আবুল খায়ের (জাতীয় পার্টি)',
    'শাহ ইফতেখার আহসান (ইসলামী আন্দোলন)'
  ],
  'ঢাকা-১৫': [
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

const makeKey = (division, district, constituency) =>
  `${division}||${district}||${constituency}`;

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
  const [customCandidate, setCustomCandidate] = useState('');
  const [votes, setVotes] = useState({});
  const [resultsDivision, setResultsDivision] = useState('');
  const [resultsDistrict, setResultsDistrict] = useState('');

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

  const mergeVotes = (items) => {
    setVotes((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        const key = makeKey(item.division, item.district, item.constituency);
        next[key] = item.votes || {};
      });
      return next;
    });
  };

  const loadVotesForDistrict = async (division, district) => {
    if (!division || !district) return;
    try {
      const res = await fetch(
        `${API_BASE}/results?division=${encodeURIComponent(division)}&district=${encodeURIComponent(district)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.items) {
        mergeVotes(data.items);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.voted) {
          setStep('blocked');
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkStatus();
  }, []);

  useEffect(() => {
    if (selectedDivision && selectedDistrict) {
      loadVotesForDistrict(selectedDivision, selectedDistrict);
    }
  }, [selectedDivision, selectedDistrict]);

  useEffect(() => {
    if (!resultsDivision && divisions.length) {
      setResultsDivision(divisions[0]);
    }
  }, [divisions, resultsDivision]);

  useEffect(() => {
    if (!resultsDivision) return;
    const districtList = [...(districtsByDivision.get(resultsDivision) || [])];
    if (districtList.length && !districtList.includes(resultsDistrict)) {
      setResultsDistrict(districtList[0]);
    }
  }, [resultsDivision, resultsDistrict, districtsByDivision]);

  useEffect(() => {
    if (resultsDivision && resultsDistrict) {
      loadVotesForDistrict(resultsDivision, resultsDistrict);
    }
  }, [resultsDivision, resultsDistrict]);

  const selectConstituency = () => {
    if (!selectedDivision || !selectedDistrict || !selectedConstituency) return;
    const randomQ =
      verificationQuestions[Math.floor(Math.random() * verificationQuestions.length)];
    setVerificationQ(randomQ);
    setSelectedAnswer(null);
    setSelectedCandidate(null);
    setCustomCandidate('');
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

  const submitVote = async () => {
    const candidate = selectedCandidate || customCandidate.trim();
    if (!candidate) {
      setError('অনুগ্রহ করে একজন প্রার্থী নির্বাচন করুন');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          division: selectedConstituency.division,
          district: selectedConstituency.district,
          constituency: selectedConstituency.name,
          candidate
        })
      });

      if (res.status === 409) {
        setStep('blocked');
        return;
      }

      if (!res.ok) {
        setError('ভোট জমা দিতে সমস্যা হয়েছে। পরে চেষ্টা করুন।');
        return;
      }

      await loadVotesForDistrict(selectedConstituency.division, selectedConstituency.district);
      setStep('results');
    } catch (err) {
      console.error(err);
      setError('সার্ভার সংযোগ ব্যর্থ হয়েছে।');
    }
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
    setCustomCandidate('');
    setSelectedAnswer(null);
    setError('');
    setStep('select');
  };

  const selectedCandidates = selectedConstituency
    ? candidatesByName[selectedConstituency.name] || []
    : [];

  const resultsDistricts = resultsDivision
    ? [...(districtsByDivision.get(resultsDivision) || [])]
    : [];

  const resultsConstituencies =
    resultsDivision && resultsDistrict
      ? [
          ...(constituenciesByDistrict.get(
            `${resultsDivision}||${resultsDistrict}`
          ) || [])
        ]
      : [];

  if (step === 'blocked') {
    return (
      <div className="page">
        <div className="container">
          <div className="card centered">
            <AlertCircle className="icon-warning" />
            <h2 className="title">আপনি ইতিমধ্যে ভোট দিয়েছেন</h2>
            <p className="subtitle">প্রতি আইপি ঠিকানা থেকে একবার মাত্র ভোট দেওয়া যাবে।</p>
            <div className="actions">
              <button onClick={() => setStep('results')} className="btn btn-primary">
                ফলাফল দেখুন
              </button>
              <button onClick={resetToSelect} className="btn btn-secondary">
                এলাকা দেখুন
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <div className="container narrow">
          <div className="card">
            <div className="header">
              <h2 className="title">আপনার পছন্দ নির্বাচন করুন</h2>
              <p className="subtitle">{selectedConstituency.name}</p>
            </div>

            <Stepper current={step} />

            {selectedCandidates.length > 0 ? (
              <div className="stack">
                {selectedCandidates.map((candidate, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`option option-wide ${
                      selectedCandidate === candidate ? 'option-selected' : ''
                    }`}
                  >
                    <span>{candidate}</span>
                    {selectedCandidate === candidate && <Check className="icon-check" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="stack">
                <div className="muted">
                  এই আসনের জন্য প্রার্থী তালিকা নেই। আপনার পছন্দ লিখুন।
                </div>
                <input
                  className="text-input"
                  placeholder="প্রার্থীর নাম লিখুন"
                  value={customCandidate}
                  onChange={(e) => setCustomCandidate(e.target.value)}
                />
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
              <button onClick={submitVote} className="btn btn-primary">
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
              <h2 className="title">ধন্যবাদ!</h2>
              <p className="subtitle">আপনার ভোট সফলভাবে জমা হয়েছে</p>
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

            <div className="filter">
              <div className="section-title">অন্যান্য এলাকার ফলাফল দেখুন</div>
              <div className="form-grid">
                <label className="field">
                  <span>বিভাগ</span>
                  <select
                    value={resultsDivision}
                    onChange={(e) => setResultsDivision(e.target.value)}
                  >
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
                    value={resultsDistrict}
                    onChange={(e) => setResultsDistrict(e.target.value)}
                    disabled={!resultsDivision}
                  >
                    {resultsDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="stack">
                {resultsConstituencies.map((constituency) => {
                  const key = makeKey(resultsDivision, resultsDistrict, constituency);
                  return (
                    <div key={key} className="result-block">
                      <h4 className="result-title">{constituency}</h4>
                      {Object.keys(votes[key] || {}).length === 0 ? (
                        <p className="muted">এখনো কোনো ভোট পড়েনি</p>
                      ) : (
                        Object.keys(votes[key] || {}).map((candidate) => (
                          <div key={candidate} className="result-row">
                            <div className="result-label">
                              <span>{candidate}</span>
                              <span className="result-value">
                                {getPercentage(key, candidate)}%
                                <span className="result-count">({votes[key]?.[candidate] || 0})</span>
                              </span>
                            </div>
                            <div className="bar">
                              <div
                                className="bar-fill"
                                style={{ width: `${getPercentage(key, candidate)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      )}
                      <p className="muted">মোট ভোট: {getTotalVotes(key)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="actions">
              <button onClick={resetToSelect} className="btn btn-primary">
                আবার ভোট দিন
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
