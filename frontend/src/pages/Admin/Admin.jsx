import React, { useMemo, useState } from 'react';
import './Admin.css';
import constituencyData from '../../assets/constituencies.json';
import candidatesData from '../../assets/candidates_new.json';
import { makeKey, normalizeConstituencyName, getApiBase } from '../../utils/helpers';

const Admin = ({ onBack }) => {
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [rows, setRows] = useState([]);
  const [referendumCounts, setReferendumCounts] = useState({ yes: 0, no: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [savingAll, setSavingAll] = useState(false);

  const constituencyRows = useMemo(() => constituencyData || [], []);
  const divisions = useMemo(
    () => [...new Set(constituencyRows.map((row) => row.division))],
    [constituencyRows]
  );

  const districts = useMemo(() => {
    if (!selectedDivision) return [];
    const set = new Set();
    constituencyRows.forEach((row) => {
      if (row.division === selectedDivision) set.add(row.district);
    });
    return [...set];
  }, [constituencyRows, selectedDivision]);

  const constituencies = useMemo(() => {
    if (!selectedDivision || !selectedDistrict) return [];
    const set = new Set();
    constituencyRows.forEach((row) => {
      if (row.division === selectedDivision && row.district === selectedDistrict) {
        set.add(row.constituency);
      }
    });
    return [...set];
  }, [constituencyRows, selectedDivision, selectedDistrict]);

  const candidateKeyLookup = useMemo(() => {
    const map = new Map();
    Object.keys(candidatesData || {}).forEach((key) => {
      map.set(key, key);
      map.set(normalizeConstituencyName(key), key);
    });
    return map;
  }, []);

  const buildCandidateRows = (summaryRows, constituencyKey) => {
    const data = candidatesData || {};
    const normalizedKey = candidateKeyLookup.get(constituencyKey) || constituencyKey;
    const candidateList = data[normalizedKey] || [];

    const rowMap = new Map();
    summaryRows.forEach((row) => {
      const party = row.party || '';
      const key = `${row.candidate_name}||${party}`;
      rowMap.set(key, {
        candidateName: row.candidate_name,
        party,
        coalition: row.coalition || '',
        count: row.vote_count,
        inputValue: row.vote_count
      });
    });

    candidateList.forEach((candidate) => {
      const party = candidate.party || '';
      const key = `${candidate.name}||${party}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          candidateName: candidate.name,
          party,
          coalition: '',
          count: 0,
          inputValue: 0
        });
      }
    });

    return Array.from(rowMap.values()).sort((a, b) =>
      a.candidateName.localeCompare(b.candidateName, 'bn')
    );
  };

  const fetchSummary = async () => {
    setError('');
    setMessage('');
    if (!selectedDivision || !selectedDistrict || !selectedConstituency) {
      setError('প্রথমে বিভাগ, জেলা ও আসন নির্বাচন করুন।');
      return;
    }
    const constituencyKey = makeKey(selectedDivision, selectedDistrict, selectedConstituency);
    setLoading(true);
    try {
      const response = await fetch(
        `${getApiBase()}/api/admin/constituency?constituencyKey=${encodeURIComponent(
          constituencyKey
        )}`,
        { credentials: 'include' }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'লোড ব্যর্থ হয়েছে।');
      }
      const data = await response.json();
      const nextRows = buildCandidateRows(data.rows || [], constituencyKey);
      setRows(nextRows);
    } catch (err) {
      setError(err.message || 'লোড ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferendumCounts = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/referendum/counts`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setReferendumCounts({
          yes: Number(data.yes || 0),
          no: Number(data.no || 0)
        });
      }
    } catch {
      // ignore
    }
  };

  const updateReferendum = async (vote, value) => {
    setError('');
    setMessage('');
    const countValue = Number(value);
    if (!Number.isFinite(countValue) || countValue < 0) {
      setError('ভোট সংখ্যা সঠিক নয়।');
      return;
    }
    try {
      const response = await fetch(`${getApiBase()}/api/admin/referendum-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vote, count: countValue })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
      setMessage('গণভোট আপডেট হয়েছে।');
      fetchReferendumCounts();
    } catch (err) {
      setError(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
    }
  };

  const updateCount = async (row) => {
    setError('');
    setMessage('');
    const constituencyKey = makeKey(selectedDivision, selectedDistrict, selectedConstituency);
    const countValue = Number(row.inputValue);
    if (!Number.isFinite(countValue) || countValue < 0) {
      setError('ভোট সংখ্যা সঠিক নয়।');
      return;
    }
    try {
      const response = await fetch(`${getApiBase()}/api/admin/candidate-count`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          constituencyKey,
          candidateName: row.candidateName,
          party: row.party || '',
          count: countValue
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।');
      }
      setMessage('সংরক্ষণ করা হয়েছে।');
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
    }
  };

  const deleteCount = async (row) => {
    setError('');
    setMessage('');
    const constituencyKey = makeKey(selectedDivision, selectedDistrict, selectedConstituency);
    try {
      const response = await fetch(`${getApiBase()}/api/admin/candidate-count`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          constituencyKey,
          candidateName: row.candidateName,
          party: row.party || ''
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'মুছে ফেলা যায়নি।');
      }
      setMessage('মুছে ফেলা হয়েছে।');
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'মুছে ফেলা যায়নি।');
    }
  };

  const saveAllCounts = async () => {
    setError('');
    setMessage('');
    if (!selectedDivision || !selectedDistrict || !selectedConstituency) {
      setError('প্রথমে বিভাগ, জেলা ও আসন নির্বাচন করুন।');
      return;
    }
    setSavingAll(true);
    const constituencyKey = makeKey(selectedDivision, selectedDistrict, selectedConstituency);
    try {
      for (const row of rows) {
        const countValue = Number(row.inputValue);
        if (!Number.isFinite(countValue) || countValue < 0) {
          throw new Error('ভোট সংখ্যা সঠিক নয়।');
        }
        const response = await fetch(`${getApiBase()}/api/admin/candidate-count`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            constituencyKey,
            candidateName: row.candidateName,
            party: row.party || '',
            count: countValue
          })
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।');
        }
      }
      setMessage('সব ভোট সংখ্যা সংরক্ষণ হয়েছে।');
      await fetchSummary();
    } catch (err) {
      setError(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে।');
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>অ্যাডমিন কন্ট্রোল</h1>
          <p>আসনভিত্তিক ভোট ও গণভোট আপডেট করুন</p>
        </div>
        <button className="btn btn-secondary" onClick={onBack}>
          হোম
        </button>
      </div>

      <div className="admin-card">
        <div className="admin-grid">
          <label>
            বিভাগ
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
                setSelectedDistrict('');
                setSelectedConstituency('');
                setRows([]);
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
          <label>
            জেলা
            <select
              value={selectedDistrict}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedConstituency('');
                setRows([]);
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
          <label>
            আসন
            <select
              value={selectedConstituency}
              onChange={(e) => setSelectedConstituency(e.target.value)}
              disabled={!selectedDivision || !selectedDistrict}
            >
              <option value="">আসন নির্বাচন করুন</option>
              {constituencies.map((constituency) => (
                <option key={constituency} value={constituency}>
                  {constituency}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-primary" onClick={fetchSummary} disabled={loading}>
            {loading ? 'লোড হচ্ছে...' : 'ডাটা লোড করুন'}
          </button>
          <button className="btn btn-secondary" onClick={fetchReferendumCounts}>
            গণভোট লোড
          </button>
        </div>

        {error && <div className="admin-alert error">{error}</div>}
        {message && <div className="admin-alert success">{message}</div>}

        {rows.length > 0 && (
          <>
            <div className="admin-actions">
              <button className="btn btn-primary" onClick={saveAllCounts} disabled={savingAll}>
                {savingAll ? 'সংরক্ষণ হচ্ছে...' : 'সব সংরক্ষণ করুন'}
              </button>
            </div>
            <div className="admin-table">
              <div className="admin-row admin-head">
                <div>প্রার্থী</div>
                <div>দল</div>
                <div>জোট</div>
                <div>ভোট</div>
                <div>অ্যাকশন</div>
              </div>
              {rows.map((row) => (
                <div className="admin-row" key={`${row.candidateName}-${row.party}`}>
                  <div>{row.candidateName}</div>
                  <div>{row.party || 'স্বতন্ত্র'}</div>
                  <div>{row.coalition || 'অন্যান্য দলসমূহ'}</div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      value={row.inputValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRows((prev) =>
                          prev.map((item) =>
                            item.candidateName === row.candidateName && item.party === row.party
                              ? { ...item, inputValue: value }
                              : item
                          )
                        );
                      }}
                    />
                  </div>
                  <div className="admin-actions-inline">
                    <button className="btn btn-primary" onClick={() => updateCount(row)}>
                      সংরক্ষণ
                    </button>
                    <button className="btn btn-secondary" onClick={() => deleteCount(row)}>
                      মুছুন
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="admin-referendum">
          <h3>গণভোট (সরাসরি আপডেট)</h3>
          <div className="admin-referendum-grid">
            <label>
              হ্যাঁ
              <input
                type="number"
                min="0"
                value={referendumCounts.yes}
                onChange={(e) =>
                  setReferendumCounts((prev) => ({ ...prev, yes: e.target.value }))
                }
              />
            </label>
            <label>
              না
              <input
                type="number"
                min="0"
                value={referendumCounts.no}
                onChange={(e) =>
                  setReferendumCounts((prev) => ({ ...prev, no: e.target.value }))
                }
              />
            </label>
            <button
              className="btn btn-primary"
              onClick={() => updateReferendum('yes', referendumCounts.yes)}
            >
              হ্যাঁ সংরক্ষণ
            </button>
            <button
              className="btn btn-primary"
              onClick={() => updateReferendum('no', referendumCounts.no)}
            >
              না সংরক্ষণ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
