import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import './Result.css';

const Result = ({
  step,
  setStep,
  divisions,
  districts,
  constituencyOptions,
  selectedDivision,
  setSelectedDivision,
  selectedDistrict,
  setSelectedDistrict,
  selectedConstituency,
  setSelectedConstituency,
  getTotalVotes,
  getAllConstituenciesWithResults,
  makeKey
}) => {
  return (
    <div className="page">
      <Navbar step={step} setStep={setStep} />
      <div className="container">
        <div className="card">
          <div className="header">
            <h2 className="title">কোনো আসনের ফলাফল দেখুন</h2>
            <p className="subtitle">বিভাগ, জেলা ও আসন নির্বাচন করুন</p>
          </div>

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
            <button
              onClick={() => {
                if (!selectedDivision || !selectedDistrict || !selectedConstituency) return;
                setStep('results');
              }}
              disabled={!selectedDivision || !selectedDistrict || !selectedConstituency}
              className="btn btn-primary"
            >
              ফলাফল দেখুন
            </button>
          </div>
        </div>
        <div className="card">
          <h2 className="section-title section-title-center">সকল আসনের ফলাফল</h2>
          <div className="constituencies-grid">
            {getAllConstituenciesWithResults().map((const_data) => (
              <div
                key={const_data.name}
                className={`constituency-box ${const_data.winner ? 'has-winner' : ''}`}
                onClick={() => {
                  setSelectedDivision(const_data.division);
                  setSelectedDistrict(const_data.district);
                  setSelectedConstituency({
                    division: const_data.division,
                    district: const_data.district,
                    name: const_data.name,
                    key: makeKey(const_data.division, const_data.district, const_data.name)
                  });
                  setStep('results');
                }}
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
};

export default Result;
