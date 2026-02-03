import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import './Vote.css';

const Vote = ({
  step,
  setStep,
  selectedConstituency,
  stepper,
  candidatesForConstituency,
  selectedCandidate,
  setSelectedCandidate,
  votedCandidate,
  blocked,
  submitVote,
  resetToSelect,
  error
}) => {
  return (
    <div className="page">
      <Navbar step={step} setStep={setStep} />
      <div className="container">
        <div className="card">
          <div className="header">
            <h2 className="title">প্রার্থী তালিকা</h2>
            <p className="subtitle">{selectedConstituency.name}</p>
          </div>

          {stepper}

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
                    <th>দাখিলকারীর নাম</th>
                    <th>ছবি</th>
                    <th>রাজনৈতিক দল/স্বতন্ত্র</th>
                    <th>নির্বাচনী প্রতীক</th>
                    <th>হলফনামা</th>
                    <th>নির্বাচনী ব্যয় ও ব্যক্তিগত সম্পদের বিবরণী</th>
                    <th>আয়কর রিটার্ন</th>
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
                          } ${
                            votedCandidate === candidate ? 'btn-vote-cast' : ''
                          } ${
                            votedCandidate && votedCandidate !== candidate ? 'btn-vote-disabled' : ''
                          }`}
                          onClick={() => !votedCandidate && setSelectedCandidate(candidate)}
                          disabled={blocked || (votedCandidate && votedCandidate !== candidate)}
                        >
                          {votedCandidate === candidate
                            ? '✓ ভোট দেওয়া হয়েছে'
                            : selectedCandidate === candidate
                            ? 'নির্বাচিত'
                            : 'ভোট দিন'}
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
};

export default Vote;
