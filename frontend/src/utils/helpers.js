export const stepOrder = [
  { key: 'division', label: 'বিভাগ' },
  { key: 'district', label: 'জেলা' },
  { key: 'constituency', label: 'আসন' },
  { key: 'candidates', label: 'প্রার্থী' }
];

export const makeKey = (division, district, constituency) =>
  `${division}||${district}||${constituency}`;

export const normalizeConstituencyName = (value = '') =>
  value
    .trim()
    .replace(/\s+/g, '')
    .replace(/[–—]/g, '-')
    .replace(/চট্রগ্রাম/g, 'চট্টগ্রাম')
    .replace(/মাগুড়া/g, 'মাগুরা')
    .replace(/লক্ষীপুর/g, 'লক্ষ্মীপুর')
    .replace(/মাদারিপুর/g, 'মাদারীপুর')
    .replace(/ব্রাক্ষণবাড়িয়া/g, 'ব্রাহ্মণবাড়িয়া')
    .replace(/নোয়াখালী/g, 'নোয়াখালী')
    .replace(/নেত্রকোণা/g, 'নেত্রকোনা')
    .replace(/টাংগাইল/g, 'টাঙ্গাইল')
    .replace(/রাঙ্গামাটি/g, 'রাঙামাটি')
    .replace(/ড়/g, 'ড়')
    .replace(/ঢ়/g, 'ঢ়')
    .replace(/য়/g, 'য়')
    .replace(/য়া/g, 'য়া');

export const normalizePartyName = (value = '') =>
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

export const partyGroups = {
  bnpAlliance: {
    label: 'বিএনপি জোট',
    color: '#0087DC',
    parties: [
      'বাংলাদেশ জাতীয়তাবাদী দল',
      'বাংলাদেশ জাতীয় পার্টি',
      'জাতীয়তাবাদী গণতান্ত্রিক আন্দোলন',
      'জমিয়তে উলামায়ে ইসলাম বাংলাদেশ',
      'গণঅধিকার পরিষদ',
      'গণসংহতি আন্দোলন',
      'বাংলাদেশের বিপ্লবী ওয়ার্কার্স পার্টি',
      'নাগরিক ঐক্য',
      'ন্যাশনাল পিপলস পার্টি',
      'ইসলামী ঐক্যজোট'
    ]
  },
  elevenPartyAlliance: {
    label: 'এগারো দলীয় নির্বাচনি ঐক্য',
    color: '#32CD32',
    parties: [
      'বাংলাদেশ জামায়াতে ইসলামী',
      'জাতীয় নাগরিক পার্টি',
      'বাংলাদেশ খেলাফত মজলিস',
      'বাংলাদেশ খেলাফত আন্দোলন',
      'খেলাফত মজলিস',
      'বাংলাদেশ নেজামে ইসলাম পার্টি',
      'বাংলাদেশ ডেভেলপমেন্ট পার্টি',
      'জাতীয় গণতান্ত্রিক পার্টি (জাগপা)',
      'লিবারেল ডেমোক্রেটিক পার্টি',
      'আমার বাংলাদেশ পার্টি (এবি পার্টি)',
      'বাংলাদেশ লেবার পার্টি'
    ]
  },
  democraticFront: {
    label: 'গণতান্ত্রিক যুক্তফ্রন্ট',
    color: '#ff0000',
    parties: [
      'বাংলাদেশের কমিউনিস্ট পার্টি',
      'বাংলাদেশের সমাজতান্ত্রিক দল–বাসদ',
      'বাংলাদেশের সমাজতান্ত্রিক দল (মার্কসবাদী)',
      'বাংলাদেশ জাতীয় সমাজতান্ত্রিক দল'
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
  nationalDemocraticFront: {
    label: 'জাতীয় গণতান্ত্রিক ফ্রন্ট',
    color: '#e67300',
    parties: [
      'জাতীয় পার্টি (এরশাদ) (একাংশ)',
      'বাংলাদেশ সাংস্কৃতিক মুক্তিজোট',
      'জাতীয় পার্টি–জেপি(মঞ্জু)',
      'বাংলাদেশ মুসলিম লীগ-বিএমএল'
    ]
  },
  otherParties: {
    label: 'অন্যান্য দলসমূহ',
    color: '#8e44ad',
    parties: [
      'ইসলামী আন্দোলন বাংলাদেশ',
      'জাতীয় পার্টি (এরশাদ)',
      'ইনসানিয়াত বিপ্লব বাংলাদেশ',
      'জাতীয় সমাজতান্ত্রিক দল-জেএসডি',
      'গণফোরাম'
    ]
  }
};

export const extractPartyFromLabel = (label = '') => {
  const match = label.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : '';
};

export const buildPartySymbolIndex = (candidates) => {
  const counts = new Map();
  Object.values(candidates || {}).forEach((seatCandidates) => {
    seatCandidates.forEach((candidate) => {
      const party = normalizePartyName(candidate.party || '');
      const symbol = (candidate.symbol || '').trim();
      if (!party || !symbol) return;
      if (!counts.has(party)) counts.set(party, new Map());
      const map = counts.get(party);
      map.set(symbol, (map.get(symbol) || 0) + 1);
    });
  });

  const result = new Map();
  counts.forEach((map, party) => {
    let best = '';
    let bestCount = 0;
    map.forEach((count, symbol) => {
      if (count > bestCount) {
        best = symbol;
        bestCount = count;
      }
    });
    if (best) result.set(party, best);
  });
  return result;
};

export const buildSeatLayout = (totalSeats = 300, rows = 10) => {
  const width = 560;
  const height = 320;
  const centerX = width / 2;
  const centerY = height - 24;
  const innerRadius = 64;
  const rowGap = 22;
  const seatRadius = 6.3;
  const seatSpacing = seatRadius * 2 + 10;

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

export const generateFingerprint = () => {
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

// Senate (Upper House) seat layout - 105 seats
export const buildSenateSeatLayout = (totalSeats = 105, rows = 7) => {
  const width = 480;
  const height = 280;
  const centerX = width / 2;
  const centerY = height - 20;
  const innerRadius = 64;
  const rowGap = 22;
  const seatRadius = 6.3;
  const seatSpacing = seatRadius * 2 + 10;

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

// D'Hondt method for proportional seat allocation
export const calculateProportionalSeats = (partyVotes, totalSeats = 100) => {
  // partyVotes is an object: { partyName: voteCount, ... }
  const parties = Object.keys(partyVotes).filter(p => partyVotes[p] > 0);
  
  if (parties.length === 0) {
    return {};
  }

  const seatAllocation = {};
  parties.forEach(party => {
    seatAllocation[party] = 0;
  });

  // D'Hondt method: allocate seats one by one to the party with highest quotient
  for (let seat = 0; seat < totalSeats; seat++) {
    let maxQuotient = -1;
    let winningParty = null;

    parties.forEach(party => {
      const divisor = seatAllocation[party] + 1;
      const quotient = partyVotes[party] / divisor;
      
      if (quotient > maxQuotient) {
        maxQuotient = quotient;
        winningParty = party;
      }
    });

    if (winningParty) {
      seatAllocation[winningParty]++;
    }
  }

  return seatAllocation;
};

export const toBengaliNumber = (num) => {
  return num.toString().replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);
};
