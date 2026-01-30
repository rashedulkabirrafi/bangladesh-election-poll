import React, { useMemo, useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import './App.css';
import constituencyData from './assets/constituencies.json';
import candidatesData from './assets/candidates.json';

const stepOrder = [
  { key: 'division', label: 'বিভাগ' },
  { key: 'district', label: 'জেলা' },
  { key: 'constituency', label: 'আসন' },
  { key: 'candidates', label: 'প্রার্থী' }
];

const makeKey = (division, district, constituency) =>
  `${division}||${district}||${constituency}`;

const normalizeConstituencyName = (value = '') =>
  value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[–—]/g, '-')
    .replace(/ড়/g, 'ড়')
    .replace(/ঢ়/g, 'ঢ়')
    .replace(/য়/g, 'য়')
    .replace(/য়া/g, 'য়া')
    .replace(/চট্রগ্রাম/g, 'চট্টগ্রাম')
    .replace(/টাংগাইল/g, 'টাঙ্গাইল')
    .replace(/নেত্রকোণা/g, 'নেত্রকোনা')
    .replace(/লক্ষীপুর/g, 'লক্ষ্মীপুর')
    .replace(/নোয়াখালী/g, 'নোয়াখালী')
    .replace(/মাদারিপুর/g, 'মাদারীপুর')
    .replace(/রাঙ্গামাটি/g, 'রাঙামাটি')
    .replace(/ব্রাক্ষণ/g, 'ব্রাহ্মণ');

const normalizePartyName = (value = '') =>
  value
    .trim()
    .replace(/[().\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/জাতীয়/g, 'জাতীয়')
    .replace(/ইসলামী/g, 'ইসলামী')
    .replace(/জামায়াতে/g, 'জামায়াতে')
    .replace(/বি\.?এন\.?পি/g, 'বিএনপি')
    .replace(/এল\.?ডি\.?পি/g, 'এলডিপি')
    .replace(/এবি পার্টি/g, 'এবি পার্টি')
    .replace(/এনসিপি/g, 'এনসিপি')
    .trim();

const partyGroups = {
  bnpAlliance: {
    label: 'বিএনপি জোট',
    color: '#1f8f4f',
    parties: [
      'বাংলাদেশ জাতীয়তাবাদী দল',
      'বিএনপি',
      'বাংলাদেশ জাতীয় পার্টি',
      'জাতীয়তাবাদী গণতান্ত্রিক আন্দোলন',
      'এনডিএম',
      'জমিয়তে উলামায়ে ইসলাম বাংলাদেশ',
      'গণঅধিকার পরিষদ',
      'গণসংহতি আন্দোলন',
      'বাংলাদেশের বিপ্লবী ওয়ার্কার্স পার্টি',
      'নাগরিক ঐক্য',
      'ন্যাশনাল পিপলস পার্টি',
      'ইসলামী ঐক্যজোট'
    ]
  },
  elevenParty: {
    label: 'এগারো দলীয় জোট',
    color: '#d14b3f',
    parties: [
      'বাংলাদেশ জামায়াতে ইসলামী',
      'জাতীয় নাগরিক পার্টি',
      'এনসিপি',
      'বাংলাদেশ খেলাফত মজলিস',
      'বাংলাদেশ খেলাফত আন্দোলন',
      'খেলাফত মজলিস',
      'বাংলাদেশ নেজামে ইসলাম পার্টি',
      'বাংলাদেশ ডেভেলপমেন্ট পার্টি',
      'জাতীয় গণতান্ত্রিক পার্টি',
      'জাগপা',
      'লিবারেল ডেমোক্রেটিক পার্টি',
      'এলডিপি',
      'আমার বাংলাদেশ পার্টি',
      'এবি পার্টি',
      'বাংলাদেশ লেবার পার্টি'
    ]
  },
  sunniAlliance: {
    label: 'বৃহত্তর সুন্নী জোট',
    color: '#f2b705',
    parties: [
      'বাংলাদেশ ইসলামী ফ্রন্ট',
      'ইসলামিক ফ্রন্ট বাংলাদেশ',
      'বাংলাদেশ সুপ্রিম পার্টি'
    ]
  },
  democraticLeft: {
    label: 'গণতান্ত্রিক যুক্তফ্রন্ট',
    color: '#6b5bd2',
    parties: [
      'বাংলাদেশের কমিউনিস্ট পার্টি',
      'বাংলাদেশের সমাজতান্ত্রিক দল–বাসদ',
      'বাংলাদেশের সমাজতান্ত্রিক দল-বাসদ',
      'বাংলাদেশের সমাজতান্ত্রিক দল (মার্কসবাদী)',
      'বাংলাদেশ জাতীয় সমাজতান্ত্রিক দল'
    ]
  },
  nationalDemocratic: {
    label: 'জাতীয় গণতান্ত্রিক ফ্রন্ট',
    color: '#2d9cdb',
    parties: [
      'জাতীয় পার্টি (এরশাদ) একাংশ',
      'জাতীয় পার্টি একাংশ',
      'বাংলাদেশ সাংস্কৃতিক মুক্তিজোট',
      'জাতীয় পার্টি–জেপি',
      'জাতীয় পার্টি জেপি',
      'বাংলাদেশ মুসলিম লীগ-বিএমএল'
    ]
  }
};

const otherPartyColor = '#9aa5b1';

const buildPartyIndex = () => {
  const index = new Map();
  Object.entries(partyGroups).forEach(([key, group]) => {
    group.parties.forEach((name) => {
      index.set(normalizePartyName(name), key);
    });
  });
  return index;
};

const partyIndex = buildPartyIndex();

const getPartyGroup = (partyName) => {
  const normalized = normalizePartyName(partyName);
  return partyIndex.get(normalized) || null;
};

const extractPartyFromLabel = (label = '') => {
  const match = label.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : '';
};

const buildSeatLayout = (totalSeats = 300, rows = 10) => {
  const width = 560;
  const height = 320;
  const centerX = width / 2;
  const centerY = height - 24;
  const innerRadius = 64;
  const rowGap = 16;
  const seatRadius = 4.6;
  const seatSpacing = seatRadius * 2 + 5;

  const radii = Array.from({ length: rows }, (_, index) => innerRadius + index * rowGap);
  const weights = radii.map((radius) => Math.max(1, Math.floor((Math.PI * radius) / seatSpacing)));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const seatsPerRow = weights.map((weight) =>
    Math.max(1, Math.round((weight / weightSum) * totalSeats))
  );

  let diff = totalSeats - seatsPerRow.reduce((sum, count) => sum + count, 0);
  while (diff !== 0) {
    if (diff > 0) {
      for (let i = rows - 1; i >= 0 && diff > 0; i -= 1) {
        seatsPerRow[i] += 1;
        diff -= 1;
      }
    } else {
      for (let i = 0; i < rows && diff < 0; i += 1) {
        if (seatsPerRow[i] > 2) {
          seatsPerRow[i] -= 1;
          diff += 1;
        }
      }
    }
  }

  const seats = [];
  seatsPerRow.forEach((count, rowIndex) => {
    const radius = radii[rowIndex];
    for (let i = 0; i < count; i += 1) {
      const angle =
        count === 1 ? Math.PI / 2 : Math.PI - (Math.PI * i) / (count - 1);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY - Math.sin(angle) * radius;
      seats.push({
        cx: x,
        cy: y,
        r: seatRadius,
        row: rowIndex,
        index: seats.length + 1
      });
    }
  });

  return { seats, width, height };
};

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
  const [step, setStep] = useState('home');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState(null);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [votes, setVotes] = useState({});
  const [fingerprint, setFingerprint] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [hoverSeat, setHoverSeat] = useState(null);
  const [hoverSeatIndex, setHoverSeatIndex] = useState(null);

  const seatLayout = useMemo(() => buildSeatLayout(300, 10), []);
  const constituencyRows = useMemo(() => constituencyData || [], []);

  const candidateKeyLookup = useMemo(() => {
    const map = new Map();
    Object.keys(candidatesData || {}).forEach((key) => {
      map.set(key, key);
      map.set(normalizeConstituencyName(key), key);
    });
    return map;
  }, []);

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
    setSelectedCandidate(null);
    setError('');
    setStep('vote');
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
    setError('');
    setStep('select');
  };

  const getStepperKey = () => {
    if (step === 'vote' || step === 'results') return 'candidates';
    if (selectedConstituency) return 'constituency';
    if (selectedDistrict) return 'district';
    if (selectedDivision) return 'division';
    return 'division';
  };

  const candidatesForConstituency = useMemo(() => {
    if (!selectedConstituency) return [];
    const exact = candidatesData[selectedConstituency.name];
    if (exact) return exact;
    const normalizedKey = normalizeConstituencyName(selectedConstituency.name);
    const lookup = candidateKeyLookup.get(normalizedKey);
    return lookup ? candidatesData[lookup] || [] : [];
  }, [selectedConstituency, candidateKeyLookup]);

  const getTotalVotesAllConstituencies = () => {
    return Object.values(votes).reduce((total, constituencies) => {
      return total + Object.values(constituencies).reduce((a, b) => a + b, 0);
    }, 0);
  };

  const getWinnerByConstituency = (constituencyKey) => {
    const constituencyVotes = votes[constituencyKey] || {};
    if (Object.keys(constituencyVotes).length === 0) return null;
    let winner = null;
    let maxVotes = 0;
    Object.entries(constituencyVotes).forEach(([candidate, voteCount]) => {
      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        winner = { name: candidate, votes: voteCount };
      }
    });
    return winner;
  };

  const getTopConstituencies = () => {
    const sorted = Object.entries(votes)
      .map(([key, constituencies]) => {
        const totalVotes = Object.values(constituencies).reduce((a, b) => a + b, 0);
        const winner = getWinnerByConstituency(key);
        return { key, totalVotes, winner };
      })
      .sort((a, b) => b.totalVotes - a.totalVotes)
      .slice(0, 5);
    return sorted;
  };

  const getAllConstituenciesWithResults = () => {
    return constituencyRows.map((row) => {
      const key = makeKey(row.division, row.district, row.constituency);
      const winner = getWinnerByConstituency(key);
      const totalVotes = votes[key]
        ? Object.values(votes[key]).reduce((a, b) => a + b, 0)
        : 0;
      return {
        name: row.constituency,
        division: row.division,
        district: row.district,
        winner,
        totalVotes
      };
    });
  };

  if (step === 'home') {
    const totalVotes = getTotalVotesAllConstituencies();
    const constituenciesWithVotes = Object.keys(votes).length;
    const topConstituencies = getTopConstituencies();

    return (
      <div className="page">
        <div className="container">
          <div className="card homepage-hero">
            <div className="header centered">
              <h1 className="headline">বাংলাদেশ নির্বাচন জরিপ ২০২৬</h1>
              <p className="subtitle-large">একটি ডিজিটাল ভোট কেন্দ্র</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{totalVotes}</div>
              <div className="stat-label">মোট ভোট</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{constituenciesWithVotes}</div>
              <div className="stat-label">আসনে ভোট</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{constituencyRows.length}</div>
              <div className="stat-label">মোট আসন</div>
            </div>
          </div>

          <div className="card cta-card">
            <div className="cta-content">
              <h2 className="cta-title">আপনার মতামত আমাদের কাছে গুরুত্বপূর্ণ!</h2>
              <p className="cta-subtitle">এই জরিপে অংশগ্রহণ করুন এবং আপনার পছন্দের প্রার্থীকে ভোট দিন</p>
              <button onClick={() => setStep('select')} className="btn btn-large">
                আপনার আসনে ভোট দিন
              </button>
            </div>
          </div>

          <div className="card seats-card">
            <div className="header centered">
              <h2 className="section-title section-title-center">জাতীয় সংসদের আসন বিন্যাস</h2>
              <p className="subtitle">৩০০টি আসনের ভিজ্যুয়াল ম্যাপ</p>
            </div>
            <div className="seats-chart" role="img" aria-label="৩০০ আসনের সেমি-সার্কুলার লেআউট">
              <svg
                viewBox={`0 0 ${seatLayout.width} ${seatLayout.height}`}
                className="seats-svg"
              >
              {seatLayout.seats.map((seat, index) => {
                const constituency = constituencyRows[index];
                const constituencyKey = constituency
                  ? makeKey(constituency.division, constituency.district, constituency.constituency)
                  : null;
                const winner = constituencyKey ? getWinnerByConstituency(constituencyKey) : null;
                const totalVotes = constituencyKey ? getTotalVotes(constituencyKey) : 0;
                const partyName = winner ? extractPartyFromLabel(winner.name) : '';
                const groupKey = partyName ? getPartyGroup(partyName) : null;
                const seatColor = winner
                  ? groupKey
                    ? partyGroups[groupKey].color
                    : otherPartyColor
                  : '#ffffff';
                const label = constituency
                  ? `${constituency.constituency} · ${constituency.district}`
                  : `Seat ${index + 1}`;
                return (
                  <circle
                    key={`seat-${seat.index}`}
                    cx={seat.cx}
                    cy={seat.cy}
                    r={seat.r}
                    className={`seat-dot ${winner ? 'seat-dot-winner' : ''}`}
                    data-seat={seat.index}
                    data-constituency={constituency?.constituency || ''}
                    data-party={partyName}
                    style={{ fill: seatColor }}
                    onMouseEnter={(event) => {
                      const svgRect =
                        event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                      const scaleX = svgRect ? svgRect.width / seatLayout.width : 1;
                      const scaleY = svgRect ? svgRect.height / seatLayout.height : 1;
                      const offsetX = svgRect ? svgRect.left : 0;
                      const offsetY = svgRect ? svgRect.top : 0;
                      setHoverSeatIndex(index);
                      setHoverSeat({
                        label,
                        winner,
                        totalVotes,
                        x: offsetX + seat.cx * scaleX + 12,
                        y: offsetY + seat.cy * scaleY + 12
                      });
                    }}
                    onMouseLeave={() => {
                      setHoverSeat(null);
                      setHoverSeatIndex(null);
                    }}
                  >
                    <title>{label}</title>
                  </circle>
                );
              })}
            </svg>
            {hoverSeatIndex !== null && seatLayout.seats[hoverSeatIndex] && (
              <svg
                viewBox={`0 0 ${seatLayout.width} ${seatLayout.height}`}
                className="seats-svg seats-overlay"
              >
                <defs>
                  <linearGradient id="seatGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1f8f4f" />
                    <stop offset="50%" stopColor="#2d9cdb" />
                    <stop offset="100%" stopColor="#f2c94c" />
                  </linearGradient>
                  <filter id="seatGlowShadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx={seatLayout.seats[hoverSeatIndex].cx}
                  cy={seatLayout.seats[hoverSeatIndex].cy}
                  r={seatLayout.seats[hoverSeatIndex].r + 3}
                  className="seat-dot-ring"
                />
              </svg>
            )}
            {hoverSeat && (
              <div className="seat-tooltip seat-tooltip-corner">
                <div className="seat-tooltip-title">{hoverSeat.label}</div>
                {hoverSeat.winner ? (
                  <>
                    <div className="seat-tooltip-row">
                      বিজয়ী: {hoverSeat.winner.name}
                    </div>
                    <div className="seat-tooltip-row">
                      ভোট: {hoverSeat.winner.votes}
                    </div>
                  </>
                ) : (
                  <div className="seat-tooltip-row">ভোট নেই</div>
                )}
                <div className="seat-tooltip-meta">মোট ভোট: {hoverSeat.totalVotes}</div>
              </div>
            )}
            <div className="seat-count">৩০০ আসন</div>
          </div>
          <div className="seat-legend" aria-label="দলভিত্তিক রঙ নির্দেশিকা">
            {Object.values(partyGroups).map((group) => (
              <div className="seat-legend-item" key={group.label}>
                <span
                  className="seat-legend-swatch"
                  style={{ background: group.color }}
                  aria-hidden="true"
                />
                <span className="seat-legend-label">{group.label}</span>
              </div>
            ))}
            <div className="seat-legend-item">
              <span
                className="seat-legend-swatch"
                style={{ background: otherPartyColor }}
                aria-hidden="true"
              />
              <span className="seat-legend-label">অন্যান্য / স্বতন্ত্র</span>
            </div>
          </div>
        </div>

          <div className="card">
            <h2 className="section-title section-title-center">সকল আসনের ফলাফল</h2>
            <div className="constituencies-grid">
              {getAllConstituenciesWithResults().map((const_data) => (
                <div
                  key={const_data.name}
                  className={`constituency-box ${const_data.winner ? 'has-winner' : ''}`}
                >
                  <div className="constituency-box-name">{const_data.name}</div>
                  {const_data.winner ? (
                    <div className="constituency-box-winner">
                      <div className="winner-label">বিজয়ী</div>
                      <div className="winner-name">{const_data.winner.name}</div>
                      <div className="winner-votes">{const_data.winner.votes} ভোট</div>
                    </div>
                  ) : (
                    <div className="constituency-box-empty">ভোট পেন্ডিং</div>
                  )}
                </div>
              ))}
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

            <Stepper current={getStepperKey()} />

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
              <button onClick={() => setStep('home')} className="btn btn-secondary">
                হোম
              </button>
              <button
                onClick={selectConstituency}
                disabled={!selectedDivision || !selectedDistrict || !selectedConstituency}
                className="btn btn-primary"
              >
                প্রার্থী দেখুন
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

            <Stepper current={getStepperKey()} />

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
                            <a href={candidate.affidavit} target="_blank" rel="noreferrer" className="btn-download">
                              ডাউনলোড
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {candidate.expense ? (
                            <a href={candidate.expense} target="_blank" rel="noreferrer" className="btn-download">
                              ডাউনলোড
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          {candidate.tax ? (
                            <a href={candidate.tax} target="_blank" rel="noreferrer" className="btn-download">
                              ডাউনলোড
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>
                          <button
                            className={`btn btn-small btn-vote ${
                              selectedCandidate === candidate ? 'btn-vote-selected' : ''
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
              <button onClick={resetToSelect} className="btn btn-secondary">
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

            <Stepper current={getStepperKey()} />

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
