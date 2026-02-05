import React from 'react';
import './PartiesAndCoalitions.css';

export default function PartiesAndCoalitions() {
  const coalitionsData = {
    bnpAlliance: {
      label: 'বাংলাদেশ জাতীয়তাবাদী দল ও তার সর্মথিত প্রার্থী',
      color: '#0087DC',
      parties: [
        {
          name: 'বাংলাদেশ জাতীয়তাবাদী দল',
          symbolImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Bangladesh_Nationalist_Party_Election_Symbol.svg/120px-Bangladesh_Nationalist_Party_Election_Symbol.svg.png',
          flagImg: '/wiki_images/120px-Flag_of_the_Bangladesh_Nationalist_Party.svg.png',
          leader: 'তারেক রহমান',
          contestedSeats: '২৮৫',
          coalitionSeats: '২৮৮'
        },
        {
          name: 'বাংলাদেশ জাতীয় পার্টি',
          symbolImg: '/wiki_images/120px-Cowcart_%28politics%29.png',
          flagImg: '/wiki_images/120px-BJPPartho.jpg',
          leader: 'আন্দালিব রহমান পার্থ',
          contestedSeats: '৫',
          coalitionSeats: '০১'
        },
        {
          name: 'জাতীয়তাবাদী গণতান্ত্রিক আন্দোলন',
          symbolImg: '/wiki_images/120px-Indian_Election_Symbol_Lion.svg.png',
          flagImg: null, // Fixed: Broken image link in source, setting null to show dash
          leader: 'ববি হাজ্জাজ',
          contestedSeats: '০৮',
          coalitionSeats: '০১'
        },
        {
          name: 'জমিয়তে উলামায়ে ইসলাম বাংলাদেশ',
          symbolImg: '/wiki_images/Jamiat_Ulema-e-Islam_Bangladesh_Election_Symbol.png',
          flagImg: '/wiki_images/120px-Flag_of_the_Jamiat_Ulema-e_Islam.svg.png',
          leader: 'উবায়দুল্লাহ ফারুক',
          contestedSeats: '০৪',
          coalitionSeats: '০৪'
        },
        {
          name: 'গণঅধিকার পরিষদ',
          symbolImg: '/wiki_images/120px-Gop_Symbol.png',
          flagImg: '/wiki_images/120px-Flag_of_Gono_Odhikar_Parishad.svg.png',
          leader: 'নুরুল হক নুর',
          contestedSeats: ' ৯০',
          coalitionSeats: '০১'
        },
        {
          name: 'গণসংহতি আন্দোলন',
          symbolImg: '/wiki_images/120px-Ganosanhati_Andolan_Election_Symbol.png',
          flagImg: '/wiki_images/120px-%E0%A6%97%E0%A6%A3%E0%A6%B8%E0%A6%82%E0%A6%B9%E0%A6%A4%E0%A6%BF_%E0%A6%86%E0%A6%A8%E0%A7%8D%E0%A6%A6%E0%A7%8B%E0%A6%B2%E0%A6%A8%E0%A7%87%E0%A6%B0_%E0%A6%AA%E0%A6%A4%E0%A6%BE%E0%A6%95%E0%A6%BE.jpg',
          leader: 'জোনায়েদ সাকি',
          contestedSeats: '১৭',
          coalitionSeats: '০১'
        },
        {
          name: 'বাংলাদেশের বিপ্লবী ওয়ার্কার্স পার্টি',
          symbolImg: '/wiki_images/Election_symbol_of_Revolutionary_Workers_Party_of_Bangladesh.png',
          flagImg: '/wiki_images/120px-South_Asian_Communist_Banner.svg.png',
          leader: 'সাইফুল হক মিলন',
          contestedSeats: '০৭',
          coalitionSeats: '০১'
        },
        {
          name: 'নাগরিক ঐক্য',
          symbolImg: '/wiki_images/120px-Kettle_icon.svg.png',
          flagImg: '/wiki_images/120px-%E0%A6%A8%E0%A6%BE%E0%A6%97%E0%A6%B0%E0%A6%BF%E0%A6%95_%E0%A6%90%E0%A6%95%E0%A7%8D%E0%A6%AF%E0%A7%87%E0%A6%B0_%E0%A6%AA%E0%A6%A4%E0%A6%BE%E0%A6%95%E0%A6%BE.svg.png',
          leader: 'মাহমুদুর রহমান মান্না',
          contestedSeats: '১১',
          coalitionSeats: '০১'
        },
        {
          name: 'ন্যাশনাল পিপলস পার্টি',
          symbolImg: '/wiki_images/120px-Indian_Election_Symbol_Mango_SVG.svg.png',
          flagImg: '/wiki_images/120px-National_People%27s_Party_%28NPP%29_flag.png',
          leader: 'এ.জেড.এম.ফরিদুজ্জামান ফরহাদ',
          contestedSeats: '২৩',
          coalitionSeats: '০১'
        },
        {
          name: 'ইসলামী ঐক্যজোট',
          symbolImg: '/wiki_images/120px-Minaret%252C_Election_Symbol_of_the_Islami_Oikya_Jote.png',
          flagImg: null,
          leader: 'আবদুল কাদের',
          contestedSeats: '২',
          coalitionSeats: '০১'
        }
      ]
    },
    elevenPartyAlliance: {
      label: 'এগারো দলীয় নির্বাচনি ঐক্য',
      color: '#32CD32', 
      parties: [
        {
          name: 'বাংলাদেশ জামায়াতে ইসলামী',
          symbolImg: '/wiki_images/120px-Daripalla.png',
          flagImg: '/wiki_images/120px-Bangladesh_Jamaat-e-Islami_Flag_Emblem.svg.png',
          leader: 'ডা.শফিকুর রহমান',
          contestedSeats: '২২৪',
          coalitionSeats: '২১৫'
        },
        {
          name: 'জাতীয় নাগরিক পার্টি',
          symbolImg: '/wiki_images/120px-%E0%A6%A8%E0%A6%BF%E0%A6%B0%E0%A7%8D%E0%A6%AC%E0%A6%BE%E0%A6%9A%E0%A6%A8%E0%A7%80_%E0%A6%AA%E0%A7%8D%E0%A6%B0%E0%A6%A4%E0%A7%80%E0%A6%95_%E0%A6%9C%E0%A6%BE%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%A8%E0%A6%BE%E0%A6%97%E0%A6%B0%E0%A6%BF%E0%A6%95_%E0%A6%AA%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%9F%E0%A6%BF.svg.png',
          flagImg: '/wiki_images/120px-%E0%A6%9C%E0%A6%BE%E0%A6%A4%E0%A7%80%E0%A6%AF%E0%A6%BC_%E0%A6%A8%E0%A6%BE%E0%A6%97%E0%A6%B0%E0%A6%BF%E0%A6%95_%E0%A6%AA%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%9F%E0%A6%BF%E0%A6%B0_%E0%A6%AA%E0%A6%A4%E0%A6%BE%E0%A6%95%E0%A6%BE.svg.png',
          leader: 'নাহিদ ইসলাম',
          contestedSeats: '৩২',
          coalitionSeats: '৩০'
        },
        {
          name: 'বাংলাদেশ খেলাফত মজলিস',
          symbolImg: '/wiki_images/120px-Rickshaw%252C_Election_Symbol_of_the_Bangladesh_Khelafat_Majlis.png',
          flagImg: '/wiki_images/120px-Bangladeshkhelafotmajlis.jpg',
          leader: 'মামুনুল হক',
          contestedSeats: '৩৪',
          coalitionSeats: '২৩'
        },
        {
          name: 'বাংলাদেশ খেলাফত আন্দোলন',
          symbolImg: '/wiki_images/120px-Indian_Election_Symbol_Tree.png',
          flagImg: '/wiki_images/120px-Flag_of_Bangladesh_Khelafat_Andolon.svg.png',
          leader: 'হাবিবুল্লাহ মিয়াজী',
          contestedSeats: '', 
          coalitionSeats: ''
        },
        {
          name: 'খেলাফত মজলিস',
          symbolImg: '/wiki_images/120px-Wall_clock%252C_Election_Symbol_of_the_Khelafat_Majlis.png',
          flagImg: '/wiki_images/120px-Flag_of_KM.webp.png',
          leader: 'আব্দুল বাছিত আজাদ',
          contestedSeats: '২১',
          coalitionSeats: '১৩'
        },
        {
          name: 'বাংলাদেশ নেজামে ইসলাম পার্টি',
          symbolImg: '/wiki_images/120px-Book-Symbol-Jamiat.png',
          flagImg: '/wiki_images/120px-Nejame.jpg',
          leader: 'সরওয়ার কামাল আজিজী',
          contestedSeats: '৩',
          coalitionSeats: '৩'
        },
        {
          name: 'বাংলাদেশ ডেভেলপমেন্ট পার্টি',
          symbolImg: '/wiki_images/120px-Bangladesh_Development_Party_Election_Symbol.png',
          flagImg: '/wiki_images/120px-Flag_of_Bangladesh_Development_Party.png',
          leader: 'আনোয়ারুল ইসলাম চাঁন',
          contestedSeats: '২',
          coalitionSeats: '২'
        },
        {
          name: 'জাতীয় গণতান্ত্রিক পার্টি (জাগপা)',
          symbolImg: '/wiki_images/120px-Jatiya_Gonotantrik_Party_Election_Symbol.png',
          flagImg: '/wiki_images/120px-Flag_of_Jagpa.svg.png',
          leader: 'রাশেদ প্রধান / তাসমিয়া প্রধান',
          contestedSeats: '',
          coalitionSeats: ''
        },
        {
           name: 'লিবারেল ডেমোক্রেটিক পার্টি',
           symbolImg: '/wiki_images/120px-Liberal_Democratic_Party_%28Bangladesh%29_Election_Symbol.png',
           flagImg: '/wiki_images/120px-%E0%A6%B2%E0%A6%BF%E0%A6%AC%E0%A6%BE%E0%A6%B0%E0%A7%87%E0%A6%B2_%E0%A6%A1%E0%A7%87%E0%A6%AE%E0%A7%8B%E0%A6%95%E0%A7%8D%E0%A6%B0%E0%A7%8D%E0%A6%AF%E0%A6%BE%E0%A6%9F%E0%A6%BF%E0%A6%95_%E0%A6%AA%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%9F%E0%A6%BF%E0%A6%B0_%E0%A6%AA%E0%A6%A4%E0%A6%BE%E0%A6%95%E0%A6%BE.svg.png',
           leader: 'অলি আহমেদ',
           contestedSeats: '১২',
           coalitionSeats: '৭'
        },
        {
          name: 'আমার বাংলাদেশ পার্টি (এবি পার্টি)',
          symbolImg: '/wiki_images/120px-Eagle_01.svg.png',
          flagImg: '/wiki_images/120px-AB_Party_flag.png',
          leader: 'মজিবুর রহমান ভূঁইয়া মঞ্জু',
          contestedSeats: '৩০',
          coalitionSeats: '৪'
        },
        {
          name: 'বাংলাদেশ লেবার পার্টি',
          symbolImg: '/wiki_images/120px-Indian_Election_Symbol_Pineapple.png',
          flagImg: '/wiki_images/120px-Bangladesh_Labour_Party_flag.svg.png',
          leader: 'মোস্তাফিজুর রহমান ইরান',
          contestedSeats: '১৫',
          coalitionSeats: ''
        }
      ]
    },
    sunniAlliance: {
      label: 'বৃহত্তর সুন্নী জোট',
      color: '#F8F9FA',
      parties: [
        {
          name: 'বাংলাদেশ ইসলামী ফ্রন্ট',
          symbolImg: '/wiki_images/120px-Election_symbol_of_Bangladesh_Islami_Front.png',
          flagImg: '/wiki_images/120px-%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6_%E0%A6%87%E0%A6%B8%E0%A6%B2%E0%A6%BE%E0%A6%AE%E0%A7%80_%E0%A6%AB%E0%A7%8D%E0%A6%B0%E0%A6%A8%E0%A7%8D%E0%A6%9F%E0%A7%87%E0%A6%B0_%E0%A6%AA%E0%A6%A4%E0%A6%BE%E0%A6%95%E0%A6%BE.jpg',
          leader: 'এম এ মতিন (اسلامী রাজনীতিবিদ)',
          contestedSeats: '২৫',
          coalitionSeats: ''
        },
        {
          name: 'ইসলামিক ফ্রন্ট বাংলাদেশ',
          symbolImg: null, 
          symbolText: 'চেয়ার',
          flagImg: '/wiki_images/120px-Flag_of_Islamic_Front_Bangladesh.png',
          leader: 'আল্লামা সৈয়দ মুহাম্মদ বাহাদুর শাহ মোজাদ্দেদী',
          contestedSeats: '২০',
          coalitionSeats: ''
        },
        {
          name: 'বাংলাদেশ সুপ্রিম পার্টি',
          symbolImg: null, 
          symbolText: 'একতারা',
          flagImg: '/wiki_images/120px-Bangladesh_Supreme_Party_flag.png',
          leader: 'সৈয়দ সাইফুদ্দিন মাইজভাণ্ডারী',
          contestedSeats: '১৯',
          coalitionSeats: ''
        }
      ]
    },
    democraticFront: {
      label: 'গণতান্ত্রিক যুক্তফ্রন্ট',
      color: '#ff0000',
      parties: [
        {
          name: 'বাংলাদেশের কমিউনিস্ট পার্টি',
          symbolImg: '/wiki_images/Election_Symbol_of_the_Communist_Party_of_Bangladesh.png',
          flagImg: '/wiki_images/120px-%E0%A6%AC%E0%A6%BE%E0%A6%82%E0%A6%B2%E0%A6%BE%E0%A6%A6%E0%A7%87%E0%A6%B6_%E0%A6%95%E0%A6%AE%E0%A6%BF%E0%A6%89%E0%A6%A8%E0%A6%BF%E0%A6%B8%E0%A7%8D%E0%A6%9F_%E0%A6%AA%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%9F%E0%A6%BF%E0%A6%B0_%E0%A6%AA%E0%A6%A4%E0%A6%BE%E0%A6%95%E0%A6%BE.svg.png',
          leader: 'মোহাম্মদ শাহ আলম',
          contestedSeats: '৬৫',
          coalitionSeats: ''
        },
        {
          name: 'বাংলাদেশের সমাজতান্ত্রিক দল–বাসদ',
          symbolImg: '/wiki_images/Symbol_of_Socialist_Party_of_Bangladesh.png',
          flagImg: '/wiki_images/120px-Flag_of_Socialist_Party_of_Bangladesh.svg.png',
          leader: 'বজলুর রশীদ ফিরোজ',
          contestedSeats: '৩৯',
          coalitionSeats: ''
        },
        {
          name: 'বাংলাদেশের সমাজতান্ত্রিক দল (মার্কসবাদী)',
          symbolImg: '/wiki_images/120px-Election_Symbol_of_Socialist_Party_of_Bangladesh_%28Marxist%29.jpg',
          flagImg: '/wiki_images/120px-Flag_of_Socialist_Party_of_Bangladesh.svg.png',
          leader: 'মুবিনুল হায়দার চৌধুরী',
          contestedSeats: '২৯',
          coalitionSeats: ''
        },
        {
          name: 'বাংলাদেশ জাতীয় সমাজতান্ত্রিক দল',
          symbolImg: '/wiki_images/120px-Election_Symbol_of_Bangladesh_JaSaD.jpg',
          flagImg: '/wiki_images/120px-Bangladesh_Jasod_flag.png',
          leader: 'শরীফ নুরুল আম্বিয়া',
          contestedSeats: '৬',
          coalitionSeats: ''
        }
      ]
    },
    nationalDemocraticFront: {
      label: 'জাতীয় গণতান্ত্রিক ফ্রন্ট',
      color: '#F8F9FA',
      parties: [
        {
          name: 'জাতীয় পার্টি (এরশাদ) (একাংশ)',
          symbolImg: '/wiki_images/120px-Symbol_of_Jatiya_Party.jpg',
          flagImg: '/wiki_images/120px-Jatiya_Party-JaPa_flag.svg.png',
          leader: 'আনিসুল ইসলাম মাহমুদ',
          contestedSeats: '',
          coalitionSeats: ''
        },
        {
          name: 'বাংলাদেশ সাংস্কৃতিক মুক্তিজোট',
          symbolImg: null,
          symbolText: 'ছড়ি',
          flagImg: '/wiki_images/120px-Bangladesh_Sangskritik_Muktijote_flag.png',
          leader: 'আবু লায়েস মুন্না',
          contestedSeats: '২০',
          coalitionSeats: ''
        },
        {
          name: 'জাতীয় পার্টি–জেপি(মঞ্জু)',
          symbolImg: '/wiki_images/120px-Nepalese_Election_Symbol_Bicycle.svg.png',
          flagImg: null, 
          leader: 'আনোয়ার হোসেন মঞ্জু',
          contestedSeats: '১০',
          coalitionSeats: ''
        },
        {
          name: 'বাংলাদেশ মুসলিম লীগ-বিএমএল',
          symbolImg: null,
          symbolText: 'হাতপাঞ্জা',
          flagImg: '/wiki_images/120px-Bangladesh_Muslim_League_%28BML%29_logo.png',
          leader: 'জুলফিকার বুলবুল',
          contestedSeats: '৬',
          coalitionSeats: ''
        }
      ]
    },
    otherParties: {
      label: 'অন্যান্য জোট এবং জোটনিরপেক্ষ দলসমূহ',
      color: '#F8F9FA',
      parties: [
        {
          name: 'ইসলামী আন্দোলন বাংলাদেশ',
          symbolImg: '/wiki_images/120px-Symbol_of_Islami_Andolan_Bangladesh.svg.png',
          flagImg: '/wiki_images/120px-Iab_flag_2025.svg.png',
          leader: 'সৈয়দ রেজাউল করিম',
          contestedSeats: '২৫৩',
          coalitionSeats: ''
        },
        {
           name: 'জাতীয় পার্টি (এরশাদ)',
           symbolImg: '/wiki_images/120px-Symbol_of_Jatiya_Party.jpg',
           flagImg: '/wiki_images/120px-Jatiya_Party-JaPa_flag.png',
           leader: 'জিএম কাদের',
           contestedSeats: '১৯৬',
           coalitionSeats: ''
        },
        {
          name: 'ইনসানিয়াত বিপ্লব বাংলাদেশ',
          symbolImg: '/wiki_images/120px-Apple_%28example%29.svg.png',
          flagImg: '/wiki_images/120px-Humanity_Revolution_Bangladesh.jpg',
          leader: 'ইমাম হারুন হায়াত',
          contestedSeats: '৪২',
          coalitionSeats: ''
        },
        {
          name: 'জাতীয় সমাজতান্ত্রিক দল-জেএসডি',
          symbolImg: '/wiki_images/120px-Five_Pointed_Star_Solid.svg.png',
          flagImg: '/wiki_images/120px-Jatiya_Samajtantrik_Dal_flag.png',
          leader: 'আ. স. ম. আবদুর রব',
          contestedSeats: '২৬',
          coalitionSeats: ''
        },
        {
          name: 'গণফোরাম',
          symbolImg: null,
          symbolText: 'সূর্য',
          flagImg: '/wiki_images/120px-Flag_of_Gano_Forum.svg.png',
          leader: '',
          contestedSeats: '', 
          coalitionSeats: ''
        }
      ]
    }
  };

  return (
    <div className="parties-page">
      <div className="page-title">দল ও জোটসমূহ</div>
      <div className="coalitions-container">
        {Object.entries(coalitionsData).map(([key, coalition]) => (
          <div key={key} className="coalition-section">
            <div className="coalition-header" style={{ borderLeftColor: coalition.color === '#F8F9FA' ? '#ccc' : coalition.color }}>
              <span className="coalition-label">{coalition.label}</span>
            </div>
            <div className="table-container">
              <table className="parties-table">
                <thead>
                  <tr>
                    <th>দল</th>
                    <th>প্রতীক</th>
                    <th>পতাকা</th>
                    <th>নেতা</th>
                    <th>প্রতিদ্বন্দ্বিতাকারী আসনের সংখ্যা</th>
                    <th>জোটের অধীনে প্রতিদ্বন্দ্বী আসন সংখ্যা</th>
                  </tr>
                </thead>
                <tbody>
                  {coalition.parties.map((party, index) => (
                    <tr key={index}>
                      <td className="party-name-cell">
                        <div className="party-name-wrapper">
                         {key === 'bnpAlliance' && index === 0 && <div className="party-strip" style={{backgroundColor: '#0087DC'}}></div>}
                          <span className="party-name-text">{party.name}</span>
                        </div>
                      </td>
                      <td className="symbol-cell">
                        {party.symbolImg ? (
                          <img src={party.symbolImg} alt="Symbol" className="party-img symbol" />
                        ) : (
                          <span className="text-symbol">{party.symbolText || '-'}</span>
                        )}
                      </td>
                      <td className="flag-cell">
                        {party.flagImg ? (
                          <img src={party.flagImg} alt="Flag" className="party-img flag" />
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="leader">{party.leader || '-'}</td>
                      <td className="seats-center">{party.contestedSeats || '-'}</td>
                      <td className="seats-center">{party.coalitionSeats || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
