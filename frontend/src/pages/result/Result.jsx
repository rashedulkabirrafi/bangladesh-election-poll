import React, { useState } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import './Result.css';

const Result = ({ step, setStep }) => {
  const [mapLevel, setMapLevel] = useState('union');
  const [isLoading, setIsLoading] = useState(true);
  const isConstituencyMap = mapLevel === 'constituency';

  const handleMapLevelChange = (nextLevel) => {
    if (nextLevel === mapLevel) {
      return;
    }
    setIsLoading(true);
    setMapLevel(nextLevel);
  };

  return (
    <div className="page result-page-map">
      <Navbar step={step} setStep={setStep} />
      <div className="container result-page-container">
        <section className="card result-page-card">
          <div className="result-page-header">
            <div>
              <h1 className="result-page-title">
                {isConstituencyMap
                  ? 'আসনভিত্তিক নির্বাচনের ফলাফল'
                  : 'ইউনিয়নভিত্তিক নির্বাচনের ফলাফল'}
              </h1>
              <p className="result-page-subtitle">
                {isConstituencyMap
                  ? 'বাংলাদেশজুড়ে আসনভিত্তিক ফলাফল, জয়ী পক্ষ, ব্যবধান ও ভোটার উপস্থিতি দেখুন।'
                  : 'বাংলাদেশজুড়ে ইউনিয়ন, উপজেলা, আসন ও জেলাভিত্তিক ফলাফল খুঁজে দেখুন।'}
              </p>
            </div>
            <div className="result-page-actions">
              <div className="result-map-switch" role="tablist" aria-label="Result map level">
                <button
                  type="button"
                  className={`result-map-switch-btn ${mapLevel === 'union' ? 'active' : ''}`}
                  onClick={() => handleMapLevelChange('union')}
                >
                  ইউনিয়ন ম্যাপ
                </button>
                <button
                  type="button"
                  className={`result-map-switch-btn ${isConstituencyMap ? 'active' : ''}`}
                  onClick={() => handleMapLevelChange('constituency')}
                >
                  আসন ম্যাপ
                </button>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep('all-results')}
              >
                সকল ফলাফল
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep('guide')}
              >
                ভোট নির্দেশিকা
              </button>
            </div>
          </div>
        </section>

        <section className="result-map-panel">
          {isLoading && (
            <div className="result-map-loading" role="status" aria-live="polite">
              <div className="result-map-loading-card">
                <div className="result-map-loading-title">
                  {isConstituencyMap
                    ? 'আসনভিত্তিক ফলাফল লোড হচ্ছে'
                    : 'ইউনিয়নভিত্তিক ফলাফল লোড হচ্ছে'}
                </div>
                <div className="result-map-loading-text">
                  {isConstituencyMap
                    ? 'একই ফলাফলের ডেটা থেকে আসনভিত্তিক সারসংক্ষেপ প্রস্তুত করা হচ্ছে।'
                    : 'all_center_wise_results.csv ও union map data একসাথে প্রসেস করা হচ্ছে।'}
                </div>
              </div>
            </div>
          )}
          <div className="result-container-map">
            <iframe
              src={`/result_assets/index.html?level=${mapLevel}`}
              title={isConstituencyMap
                ? 'Bangladesh Election 2026 Constituency Map'
                : 'Bangladesh Election 2026 Union Map'}
              className="result-iframe"
              frameBorder="0"
              allowFullScreen
              onLoad={() => setIsLoading(false)}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Result;
