import React, { useMemo, useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import './Home.css';
import constituencyData from '../../assets/constituencies.json';
import candidatesData from '../../assets/candidates_new.json';
import PartiesAndCoalitions from '../PartiesAndCoalitions/PartiesAndCoalitions';
import Navbar from '../../components/Navbar/Navbar';
import Result from '../result/Result';
import Vote from '../vote/Vote';
import VoterGuide from '../VoterGuide/VoterGuide';
import {
  stepOrder,
  makeKey,
  normalizeConstituencyName,
  normalizePartyName,
  partyGroups,
  extractPartyFromLabel,
  buildPartySymbolIndex,
  buildSeatLayout,
  buildSenateSeatLayout,
  calculateProportionalSeats,
  generateFingerprint,
  hashFingerprint,
  getApiBase,
  toBengaliNumber,
  sortCandidatesByBengali
} from '../../utils/helpers';
import { referendumData } from '../../assets/referendum_data';

const otherPartyColor = '#9aa5b1';
const reservedSeatColor = '#34495e'; // Color for reserved seats

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

const Home = () => {
  const [step, setStep] = useState('home');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState(null);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [votes, setVotes] = useState({});
  const [fingerprint, setFingerprint] = useState('');
  const [fingerprintHash, setFingerprintHash] = useState('');
  const [voteToken, setVoteToken] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [votedCandidate, setVotedCandidate] = useState(null);
  const [referendumVote, setReferendumVote] = useState(null); // 'yes' or 'no'
  const [referendumCounts, setReferendumCounts] = useState({ yes: 0, no: 0 });
  const [showThankYou, setShowThankYou] = useState(false);
  const [hoverSeat, setHoverSeat] = useState(null);
  const [hoverSeatIndex, setHoverSeatIndex] = useState(null);
  // Senate hover states
  const [hoverSenateSeat, setHoverSenateSeat] = useState(null);
  const [hoverSenateSeatIndex, setHoverSenateSeatIndex] = useState(null);

  const partySymbols = useMemo(() => buildPartySymbolIndex(candidatesData || {}), []);
  const seatLayout = useMemo(() => buildSeatLayout(300, 10), []);
  // Senate layout: 105 seats (100 proportional + 5 reserved)
  const senateLayout = useMemo(() => buildSenateSeatLayout(105, 7), []);
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
    // Load votes from backend
    const loadVotes = async () => {
      try {
        const response = await fetch(`${getApiBase()}/api/votes/all`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setVotes(data.votes || {});
        } else {
          // Fallback to localStorage if backend fails
          const savedVotes = localStorage.getItem('pollVotes');
          if (savedVotes) {
            setVotes(JSON.parse(savedVotes));
          }
        }
      } catch (error) {
        console.error('Failed to load votes from backend:', error);
        // Fallback to localStorage
        const savedVotes = localStorage.getItem('pollVotes');
        if (savedVotes) {
          setVotes(JSON.parse(savedVotes));
        }
      }
    };

    // Load referendum counts from backend
    const loadReferendumCounts = async () => {
      try {
        const response = await fetch(`${getApiBase()}/api/referendum/counts`, {
          credentials: 'include'
        });
        if (response.ok) {
          const counts = await response.json();
          setReferendumCounts(counts);
        } else {
          // Fallback to localStorage
          const savedReferendumCounts = localStorage.getItem('referendumCounts');
          if (savedReferendumCounts) {
            try {
              const parsedCounts = JSON.parse(savedReferendumCounts);
              const yes = Number(parsedCounts?.yes ?? 0);
              const no = Number(parsedCounts?.no ?? 0);
              setReferendumCounts({ yes: Number.isFinite(yes) ? yes : 0, no: Number.isFinite(no) ? no : 0 });
            } catch (error) {
              setReferendumCounts({ yes: 0, no: 0 });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load referendum counts from backend:', error);
        // Fallback to localStorage
        const savedReferendumCounts = localStorage.getItem('referendumCounts');
        if (savedReferendumCounts) {
          try {
            const parsedCounts = JSON.parse(savedReferendumCounts);
            const yes = Number(parsedCounts?.yes ?? 0);
            const no = Number(parsedCounts?.no ?? 0);
            setReferendumCounts({ yes: Number.isFinite(yes) ? yes : 0, no: Number.isFinite(no) ? no : 0 });
          } catch (error) {
            setReferendumCounts({ yes: 0, no: 0 });
          }
        }
      }
    };

    loadVotes();
    loadReferendumCounts();

    const fp = generateFingerprint();
    setFingerprint(fp);

    let active = true;
    const initVoteLock = async () => {
      try {
        const hash = await hashFingerprint(fp);
        if (!active) return;
        setFingerprintHash(hash);

        const response = await fetch(`${getApiBase()}/api/vote/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ fingerprintHash: hash })
        });

        const data = await response.json().catch(() => ({}));
        if (!active) return;

        if (!response.ok) {
          setError(data.error || 'ডিভাইস যাচাই করা যায়নি।');
          return;
        }

        if (!data.allowed) {
          setBlocked(true);
          setError('এই ডিভাইস থেকে ইতিমধ্যে ভোট দেওয়া হয়েছে।');
          return;
        }

        setVoteToken(data.token || '');
      } catch (error) {
        if (!active) return;
        setError('ডিভাইস যাচাই করা যায়নি।');
      }
    };

    initVoteLock();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const selectConstituency = () => {
    if (!selectedDivision || !selectedDistrict || !selectedConstituency) return;
    setSelectedCandidate(null);
    setError('');
    setStep('vote');
  };

  const submitVote = async () => {
    if (!selectedCandidate || !selectedConstituency) {
      setError('অনুগ্রহ করে একজন প্রার্থী নির্বাচন করুন');
      return;
    }

    if (!fingerprintHash || !voteToken) {
      setError('ডিভাইস যাচাই সম্পন্ন হয়নি। পরে আবার চেষ্টা করুন।');
      return;
    }

    try {
      const response = await fetch(`${getApiBase()}/api/vote/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          fingerprintHash, 
          token: voteToken,
          constituencyKey: selectedConstituency.key,
          candidateName: selectedCandidate.name,
          party: selectedCandidate.party || 'স্বতন্ত্র'
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 409 || data?.error === 'already_voted') {
        setBlocked(true);
        setError('এই ডিভাইস থেকে ইতিমধ্যে ভোট দেওয়া হয়েছে।');
        return;
      }

      if (!response.ok) {
        setError(data.error || 'ভোট জমা দিতে সমস্যা হয়েছে।');
        return;
      }
    } catch (error) {
      setError('ভোট জমা দিতে সমস্যা হয়েছে।');
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
    setVotedCandidate(selectedCandidate);
    // localStorage.setItem('pollVotes', JSON.stringify(newVotes)); // Deferred
    // localStorage.setItem(`voted_${fingerprint}`, Date.now().toString()); // Deferred

    setStep('referendum');
  };

  const submitReferendum = async (vote) => {
    setReferendumVote(vote);
    
    // Save personal vote to localStorage
    localStorage.setItem(`referendum_vote_${fingerprint}`, vote);

    // Submit to backend
    try {
      await fetch(`${getApiBase()}/api/referendum/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fingerprintHash, vote })
      });
    } catch (error) {
      console.error('Failed to submit referendum vote:', error);
    }

    // Fetch updated counts from backend
    try {
      const response = await fetch(`${getApiBase()}/api/referendum/counts`, {
        credentials: 'include'
      });
      if (response.ok) {
        const counts = await response.json();
        setReferendumCounts(counts);
      }
    } catch (error) {
      console.error('Failed to fetch referendum counts:', error);
    }
    
    // Now block the user and save the candidate vote permanently to localStorage
    localStorage.setItem('pollVotes', JSON.stringify(votes));
    localStorage.setItem(`voted_${fingerprint}`, Date.now().toString());
    
    setBlocked(true);
    setShowThankYou(true);
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
    let candidates = [];
    const exact = candidatesData[selectedConstituency.name];
    if (exact) candidates = exact;
    else {
      const normalizedKey = normalizeConstituencyName(selectedConstituency.name);
      const lookup = candidateKeyLookup.get(normalizedKey);
      candidates = lookup ? candidatesData[lookup] || [] : [];
    }
    // Sort candidates by Bengali alphabet order
    return sortCandidatesByBengali(candidates);
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

  const getPartyGroup = (partyName) => {
    const normalized = normalizePartyName(partyName);
    if (!normalized) return null;
    
    let foundKey = null;
    Object.entries(partyGroups).forEach(([key, group]) => {
      if (foundKey) return;
      group.parties.forEach((name) => {
         const normName = normalizePartyName(name);
         if (normalized.includes(normName) || normName.includes(normalized)) {
           foundKey = key;
         }
      });
    });
    return foundKey;
  };

  // Calculate total votes per party for PR system
  const totalVotesByParty = useMemo(() => {
    const partyVotes = {};
    Object.values(votes).forEach(constituencyVotes => {
      Object.entries(constituencyVotes).forEach(([candidateLabel, count]) => {
        const party = extractPartyFromLabel(candidateLabel) || 'স্বতন্ত্র';
        // Map to party group to keep colors consistent
        const groupKey = getPartyGroup(party);
        // Use group label if part of a group, otherwise use party name
        // Ideally we map to the exact party name but color by group
        // For simplicity in allocation, let's group by party name first
        partyVotes[party] = (partyVotes[party] || 0) + count;
      });
    });
    return partyVotes;
  }, [votes]);

  // Calculate proportional seats (100 seats)
  const senateSeats = useMemo(() => {
    return calculateProportionalSeats(totalVotesByParty, 100);
  }, [totalVotesByParty]);

  // Prepare seat array for visualization (105 seats)
  // First 100 based on 'senateSeats', last 5 are reserved
  const senateSeatArray = useMemo(() => {
    const seatList = [];
    
    // Sort parties by seat count for clustered display
    const sortedParties = Object.entries(senateSeats).sort((a, b) => b[1] - a[1]);
    
    sortedParties.forEach(([party, count]) => {
      const groupKey = getPartyGroup(party);
      const color = groupKey ? partyGroups[groupKey].color : otherPartyColor;
      
      for(let i=0; i<count; i++) {
        seatList.push({
          type: 'proportional',
          party,
          color,
          label: `${party} (PR)`
        });
      }
    });

    // Fill remaining PR seats if calculation didn't reach 100 (e.g. 0 votes)
    while (seatList.length < 100) {
       seatList.push({
         type: 'empty',
         party: 'Empty',
         color: '#e0e0e0',
         label: 'Empty'
       });
    }

    // Add 5 reserved seats
    for(let i=0; i<5; i++) {
      seatList.push({
        type: 'reserved',
        party: 'রাষ্ট্রপতি মনোনীত',
        color: reservedSeatColor,
        label: 'রাষ্ট্রপতি কর্তৃক মনোনীত'
      });
    }

    return seatList;
  }, [senateSeats]);


  const referendumStats = useMemo(() => {
     const total = referendumCounts.yes + referendumCounts.no;
     if (total === 0) return { yes: 0, no: 0 };
     const yes = Math.round((referendumCounts.yes / total) * 100);
     return { yes, no: 100 - yes };
  }, [referendumCounts]);

  if (step === 'home') {
    const totalVotes = getTotalVotesAllConstituencies();
    const constituenciesWithVotes = Object.keys(votes).length;
    const topConstituencies = getTopConstituencies();

  return (
    <div className="page">
      <Navbar step={step} setStep={setStep} />
      <div className="container">
        <div className="card homepage-hero">
          <div className="header centered">
            <h1 className="headline">বাংলাদেশ নির্বাচন জরিপ ২০২৬</h1>
            <p className="subtitle-large">একটি ডিজিটাল ভোট কেন্দ্র</p>
          </div>
        </div>

        <div className="card results-card referendum-results-card">
          <div className="header centered">
            <h2 className="section-title section-title-center">গণভোট ফলাফল (লাইভ)</h2>
            <p className="subtitle">জুলাই জাতীয় সনদ (সংবিধান সংশোধন)</p>
          </div>
          <div className="referendum-bar-container">
             <div className="referendum-bar-labels">
                <span className="referendum-bar-label label-yes">হ্যাঁ</span>
                <span className="referendum-bar-label label-no">না</span>
             </div>
             <div className="referendum-progress-bar">
                <div className="referendum-progress-fill fill-yes" style={{ width: `${referendumStats.yes}%` }}></div>
                <div className="referendum-progress-fill fill-no" style={{ width: `${referendumStats.no}%` }}></div>
             </div>
             <div className="referendum-bar-values">
                <span className="referendum-bar-value value-yes">{toBengaliNumber(referendumStats.yes)}%</span>
                <span className="referendum-bar-value value-no">{toBengaliNumber(referendumStats.no)}%</span>
             </div>
          </div>
        </div>


        <div className="card seats-card">
            <div className="header centered">
              <h2 className="section-title section-title-center">জাতীয় সংসদ (নিম্নকক্ষ) আসন বিন্যাস</h2>
              <p className="subtitle">৩০০টি আসন (নিম্নকক্ষ)</p>
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
                  : '#e0e0e0';
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
                    style={{ fill: seatColor, cursor: 'pointer' }}
                    onClick={() => {
                        if (constituency) {
                            setSelectedDivision(constituency.division);
                            setSelectedDistrict(constituency.district);
                            setSelectedConstituency({
                                division: constituency.division,
                                district: constituency.district,
                                name: constituency.constituency,
                                key: constituencyKey
                            });
                            setStep('results');
                        }
                    }}
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
            <div className="seat-count">৩০০ আসন (নিম্নকক্ষ)</div>
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

          <div className="card seats-card senate-card">
            <div className="header centered">
              <h2 className="section-title section-title-center">সিনেট (উচ্চকক্ষ) আসন বিন্যাস</h2>
              <p className="subtitle">১০৫টি আসন: ১০০টি আনুপাতিক হার + ৫টি সংরক্ষিত</p>
            </div>
            <div className="seats-chart senate-chart" role="img" aria-label="১০৫ আসনের সিনেট চার্ট">
              <svg
                 viewBox={`0 0 ${senateLayout.width} ${senateLayout.height}`}
                 className="seats-svg"
              >
                {senateLayout.seats.map((seat, index) => {
                   const seatData = senateSeatArray[index] || { color: '#e0e0e0', label: 'Empty' };
                   return (
                     <circle
                       key={`senate-${seat.index}`}
                       cx={seat.cx}
                       cy={seat.cy}
                       r={seat.r}
                       className="seat-dot seat-dot-winner"
                       style={{ fill: seatData.color }}
                       onMouseEnter={(event) => {
                          const svgRect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                          const scaleX = svgRect ? svgRect.width / senateLayout.width : 1;
                          const scaleY = svgRect ? svgRect.height / senateLayout.height : 1;
                          const offsetX = svgRect ? svgRect.left : 0;
                          const offsetY = svgRect ? svgRect.top : 0;
                          setHoverSenateSeatIndex(index);
                          setHoverSenateSeat({
                            label: seatData.label,
                            party: seatData.party,
                            x: offsetX + seat.cx * scaleX + 12,
                            y: offsetY + seat.cy * scaleY + 12
                          });
                       }}
                       onMouseLeave={() => {
                          setHoverSenateSeat(null);
                          setHoverSenateSeatIndex(null);
                       }}
                     />
                   );
                })}
              </svg>
              {hoverSenateSeat && (
                 <div 
                   className="seat-tooltip"
                   style={{
                     position: 'fixed',
                     left: hoverSenateSeat.x,
                     top: hoverSenateSeat.y,
                     pointerEvents: 'none',
                     zIndex: 1000
                   }}
                 >
                   <div className="seat-tooltip-title">{hoverSenateSeat.party}</div>
                   <div className="seat-tooltip-row">{hoverSenateSeat.label}</div>
                 </div>
              )}
             <div className="seat-count">১০৫ আসন (উচ্চকক্ষ)</div>
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
            <div className="seat-legend-item">
              <span
                className="seat-legend-swatch"
                style={{ background: reservedSeatColor }}
                aria-hidden="true"
              />
              <span className="seat-legend-label">সংরক্ষিত (রাষ্ট্রপতি মনোনীত)</span>
            </div>
          </div>
        </div>

          <div className="card cta-card">
            <div className="cta-content">
              <h2 className="cta-title">আপনার মতামত আমাদের কাছে গুরুত্বপূর্ণ!</h2>
              <p className="cta-subtitle">এই জরিপে অংশগ্রহণ করুন এবং আপনার আসনের পছন্দের প্রার্থীকে ভোট দিন</p>
              <button onClick={() => setStep('select')} className="btn btn-large btn-pulse-green btn-menu-effect">
                <span className="btn-text-pulse">আপনার আসনে ভোট দিন</span>
              </button>
            </div>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{toBengaliNumber(totalVotes)}</div>
              <div className="stat-label">মোট ভোট</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{toBengaliNumber(constituenciesWithVotes)}</div>
              <div className="stat-label">আসনে ভোট</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{toBengaliNumber(constituencyRows.length)}</div>
              <div className="stat-label">মোট আসন</div>
            </div>
          </div>
          <div className="card info-card">
            <div className="info-card-content">
              <div>
                <h3 className="info-title">জোট ও দলসমূহ</h3>
                <p className="info-subtitle">প্রতিটি জোটের দল ও প্রতীক দেখুন</p>
              </div>
              <button onClick={() => setStep('alliances')} className="btn btn-secondary btn-pulse-green btn-menu-effect">
                দল তালিকা দেখুন
              </button>
            </div>
          </div>



        </div>
      </div>
    );
  }

  if (step === 'alliances') {
    return (
      <div className="page">
        <Navbar step={step} setStep={setStep} />
        <PartiesAndCoalitions />
      </div>
    );
  }

  if (step === 'all-results') {
    return (
      <Result
        step={step}
        setStep={setStep}
        setShowThankYou={setShowThankYou}
        divisions={divisions}
        districts={districts}
        constituencyOptions={constituencyOptions}
        selectedDivision={selectedDivision}
        setSelectedDivision={setSelectedDivision}
        selectedDistrict={selectedDistrict}
        setSelectedDistrict={setSelectedDistrict}
        selectedConstituency={selectedConstituency}
        setSelectedConstituency={setSelectedConstituency}
        getTotalVotes={getTotalVotes}
        getAllConstituenciesWithResults={getAllConstituenciesWithResults}
        makeKey={makeKey}
      />
    );
  }

  if (step === 'referendum') {
    return (
      <div className="page">
        <Navbar step={step} setStep={setStep} />
        <div className="referendum-container">
          <div className="card referendum-card">
            <div className="referendum-header">
              <img src="/emblem.png" alt="Bangladesh Emblem" className="referendum-emblem" style={{ height: '60px', marginBottom: '10px' }} onError={(e) => e.target.style.display = 'none'} />
              <h1 className="referendum-title">{referendumData.title}</h1>
              <p className="referendum-subtitle">{referendumData.subtitle}</p>
            </div>
            
            <div className="referendum-content-box">
              <p className="referendum-question">{referendumData.question}</p>
              
              <div className="referendum-points">
                {referendumData.points.map((point, idx) => (
                  <p key={idx} className="referendum-point">{point}</p>
                ))}
              </div>
              
              <div className="referendum-actions">
                <div className="referendum-option">
                  <div className="referendum-box">
                    <span className="referendum-label-text">হ্যাঁ</span>
                  </div>
                  <button 
                    className="btn btn-referendum btn-yes"
                    onClick={() => submitReferendum('yes')}
                  >
                    ✓
                  </button>
                </div>

                <div className="referendum-option">
                  <div className="referendum-box">
                    <span className="referendum-label-text">না</span>
                  </div>
                  <button 
                    className="btn btn-referendum btn-no"
                    onClick={() => submitReferendum('no')}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <p className="referendum-instruction">ভোট প্রদানের জন্য উপরের যে-কোনো একটিতে (✓) টিক বা (✕) ক্রস চিহ্ন দিন।</p>
              <p className="referendum-note">তাহলে হ্যাঁ ভোট দিন, "হ্যাঁ" ভোট দিলে উপরের সবকিছু পাবেন। "না" ভোট দিলে কিছুই পাবেন না। মনে রাখবেন, পরিবর্তনের চাবি এবার আপনার হাতে।</p>
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
        <Navbar step={step} setStep={setStep} />
        <div className="container">
          <div className="card">
            <div className="header">
              <h1 className="headline">বাংলাদেশ নির্বাচন জরিপ ২০২৬</h1>
              <p className="subtitle">প্রথমে বিভাগ, এরপর জেলা ও আসন নির্বাচন করুন</p>
            </div>

            {!hasData && (
              <div className="alert" role="alert">
                নির্বাচনী আসনের তালিকা লোড করা যাচ্ছে না। Excel ফাইলটি ঠিক আছে কিনা যাচাই করুন।
              </div>
            )}

            <div className="form-grid">
              <label className={`field field-step ${!selectedDivision ? 'field-active' : 'field-completed'}`}>
                <span className="field-label">
                  <span className="step-number">১</span>
                  বিভাগ
                </span>
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

              <label className={`field field-step ${!selectedDivision ? 'field-disabled' : !selectedDistrict ? 'field-active' : 'field-completed'}`}>
                <span className="field-label">
                  <span className="step-number">২</span>
                  জেলা
                </span>
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

              <label className={`field field-step ${!selectedDivision || !selectedDistrict ? 'field-disabled' : !selectedConstituency ? 'field-active' : 'field-completed'}`}>
                <span className="field-label">
                  <span className="step-number">৩</span>
                  নির্বাচনী আসন
                </span>
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
      <Vote
        step={step}
        setStep={setStep}
        selectedConstituency={selectedConstituency}
        stepper={<Stepper current={getStepperKey()} />}
        candidatesForConstituency={candidatesForConstituency}
        selectedCandidate={selectedCandidate}
        setSelectedCandidate={setSelectedCandidate}
        votedCandidate={votedCandidate}
        blocked={blocked}
        submitVote={submitVote}
        resetToSelect={resetToSelect}
        error={error}
      />
    );
  }

  if (step === 'guide') {
    return <VoterGuide step={step} setStep={setStep} />;
  }

  if (step === 'results') {
    const key = selectedConstituency ? selectedConstituency.key : '';
    const total = getTotalVotes(key);
    const votesForConst = votes[key] || {};
    const candidateLabelMap = new Map();
    candidatesForConstituency.forEach((candidate) => {
      const label = `${candidate.name} (${candidate.party || 'স্বতন্ত্র'})`;
      candidateLabelMap.set(label, {
        label,
        count: votesForConst[label] || 0
      });
    });
    Object.entries(votesForConst).forEach(([label, count]) => {
      if (!candidateLabelMap.has(label)) {
        candidateLabelMap.set(label, { label, count });
      }
    });
    const sortedCandidates = Array.from(candidateLabelMap.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'bn'));

    return (
      <div className="page">
        <Navbar step={step} setStep={setStep} />
        <div className="container">
          <div className="card result-card">
            <div className="header centered">
              <div className="success-icon">
                <Check size={48} color="#fff" />
              </div>
              <h1 className="headline">ফলাফল</h1>
              <p className="subtitle">
                {selectedConstituency?.name}, {selectedConstituency?.district}
                <br />
                মোট ভোট: {total}
              </p>
            </div>

            <Stepper current="candidates" />

            <div className="results-list">
              {sortedCandidates.length > 0 ? (
                sortedCandidates.map(({ label, count }, idx) => {
                  const pct = getPercentage(key, label);
                  const isWinner = idx === 0 && count > 0;
                  return (
                    <div key={label} className={`result-row ${isWinner ? 'winner' : ''}`}>
                      <div className="result-info">
                        <div className="result-name">
                          {label}
                          {isWinner && <span className="badge">বিজয়ী</span>}
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                      <div className="result-meta">
                        <div className="vote-count">{count} ভোট</div>
                        <div className="percentage">{pct}%</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">এখনো কোনো ভোট পড়েনি</div>
              )}
            </div>

            <div className="actions">
              <button onClick={() => setStep('home')} className="btn btn-secondary">
                হোম এ ফিরে যান
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div>Loading...</div>;
};

export default Home;
