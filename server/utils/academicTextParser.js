const FIELD_PATTERNS = {
    fullName: [
        /(?:^|\n|\b)\s*NAME\s*[:\-]\s*([A-Z][A-Z .']+?)(?=\s+(?:ROLL\s+NO|ENROLL(?:MENT|MENT\s+NUMBER)|SESSION|PROGRAMME|PROGRAM|FATHER|MOTHER|SCHOOL|SGPA|CGPA|RESULT)\b|$)/i,
    ],
    enrollmentNumber: [
        /(?:^|\n)\s*ENROLLMENT\s+NUMBER\s*[:\-]\s*([A-Z0-9\/\-]+)/i,
        /(?:^|\n)\s*ENROLMENT\s+NUMBER\s*[:\-]\s*([A-Z0-9\/\-]+)/i,
    ],
    rollNumber: [
        /(?:^|\n)\s*ROLL\s+NO\.?\s*[:\-]\s*([A-Z0-9\/\-]+)/i,
        /(?:^|\n)\s*ROLL\s+NUMBER\s*[:\-]\s*([A-Z0-9\/\-]+)/i,
    ],
    studentId: [
        /(?:^|\n)\s*STUDENT\s+ID\s*[:\-]\s*([A-Z0-9\/\-]+)/i,
        /(?:^|\n)\s*FORM\s+NO\.?\s*[:\-]\s*([A-Z0-9\/\-]+)/i,
    ],
    universityName: [
        /(?:^|\n)\s*(GURU\s+GHASIDAS\s+VISHWAVIDYALAYA[^\n]*)/i,
        /(?:^|\n)\s*([A-Z][A-Z\s().,&-]{10,}UNIVERSITY[A-Z\s().,&-]*)/i,
        /(?:^|\n)\s*([A-Z][A-Z\s().,&-]{10,}VISHWAVIDYALAYA[A-Z\s().,&-]*)/i,
    ],
    programme: [
        /(?:^|\n|\b)\s*PROGRAMME\s*[:\-]\s*([A-Z][A-Z .&()\/-]+?)(?=\s+(?:SCHOOL|DEPARTMENT|SESSION|ENROLLMENT|ROLL|SGPA|CGPA|RESULT)\b|$)/i,
        /(?:^|\n|\b)\s*PROGRAM\s*[:\-]\s*([A-Z][A-Z .&()\/-]+?)(?=\s+(?:SCHOOL|DEPARTMENT|SESSION|ENROLLMENT|ROLL|SGPA|CGPA|RESULT)\b|$)/i,
    ],
    session: [
        /(?:^|\n)\s*SESSION\s*[:\-]\s*([0-9]{4}\s*-\s*[0-9]{4}(?:\s+[A-Z]{3}\s+[0-9]{4})?)/i,
        /(?:^|\n)\s*SESSION\s*([0-9]{4}\s*-\s*[0-9]{2,4})/i,
        /(?:^|\n)\s*ADM\.\s*SESSION\s*[:\-]\s*([0-9]{4}\s*-\s*[0-9]{4})/i,
        /(?:^|\n)\s*ENROLLMENT\s+NUMBER\s*[:\-]\s*[A-Z0-9\/\-]+\s+SESSION\s*[:\-]\s*([0-9]{4}\s*-\s*[0-9]{4}(?:\s+[A-Z]{3}\s+[0-9]{4})?)/i,
    ],
    sgpa: [
        /(?:^|\n)\s*SGPA\s*[:\-]?\s*([0-9]+\.[0-9]+)/i,
    ],
    cgpa: [
        /(?:^|\n)\s*CGPA\s*[:\-]?\s*([0-9]+\.[0-9]+)/i,
    ],
    marks: [
        /(?:^|\n)\s*TOTAL\s+MARKS\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)/i,
        /(?:^|\n)\s*CUMULATIVE\s+MARKS\s*[:\-]?\s*([0-9]+)\s*\/\s*[0-9]+/i,
        /TOTAL\s+CREDIT\s+TOTAL\s+CREDIT\s+POINT\s+TOTAL\s+MARKS\s+SGPA\s+CGPA\s+CUMULATIVE\s+MARKS\s+RESULT\s*\n\s*[0-9.]+\s+[0-9.]+\s+([0-9]+(?:\.[0-9]+)?)/i,
    ],
};

function normalizeWhitespace(text) {
    return String(text || '')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{2,}/g, '\n')
        .trim();
}

function extractWithBoundaries(text, labels = []) {
    for (const label of labels) {
        const pattern = new RegExp(
            `${label}\\s*[:\\-]\\s*(.+?)(?=\\s+(?:NAME|ROLL\\s+NO\\.?|ROLL\\s+NUMBER|ENROLL(?:MENT|MENT\\s+NUMBER)|PROGRAMME|PROGRAM|SCHOOL|DEPARTMENT|SESSION|SGPA|CGPA|RESULT|FATHER|MOTHER|TOTAL\\s+MARKS|CUMULATIVE\\s+MARKS)\\b|$)`,
            'i'
        );
        const match = text.match(pattern);
        if (match?.[1]) return match[1];
    }
    return null;
}

function titleize(value) {
    if (!value) return null;
    return value
        .toLowerCase()
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function normalizeSessionValue(value) {
    const raw = String(value || '').trim().replace(/\s+/g, ' ');
    if (!raw) return null;

    const fullYearMatch = raw.match(/(\d{4})\s*-\s*(\d{4})(.*)/);
    if (fullYearMatch) {
        return `${fullYearMatch[1]}-${fullYearMatch[2]}${fullYearMatch[3].replace(/\s+/g, ' ').trim() ? ` ${fullYearMatch[3].replace(/\s+/g, ' ').trim()}` : ''}`.trim();
    }

    const shortYearMatch = raw.match(/(\d{4})\s*-\s*(\d{2})(.*)/);
    if (shortYearMatch) {
        return `${shortYearMatch[1]}-${shortYearMatch[1].slice(0, 2)}${shortYearMatch[2]}${shortYearMatch[3].replace(/\s+/g, ' ').trim() ? ` ${shortYearMatch[3].replace(/\s+/g, ' ').trim()}` : ''}`.trim();
    }

    return raw;
}

function cleanCapturedValue(field, value) {
    const raw = String(value || '').trim().replace(/\s{2,}/g, ' ');
    if (!raw) return null;

    if (['sgpa', 'cgpa', 'marks'].includes(field)) {
        const numeric = Number(raw);
        return Number.isFinite(numeric) ? numeric : null;
    }

    if (field === 'fullName') return titleize(raw);
    if (field === 'programme') return raw.replace(/\s+/g, ' ').trim();
    if (field === 'universityName') return raw.replace(/\s+/g, ' ').trim();
    if (field === 'session') return normalizeSessionValue(raw);
    return raw;
}

function matchField(text, patterns, field) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match?.[1]) {
            return cleanCapturedValue(field, match[1]);
        }
    }
    return null;
}

function parseAcademicText(rawText, { documentType } = {}) {
    const text = normalizeWhitespace(rawText);
    const extracted = {
        fullName: null,
        studentId: null,
        enrollmentNumber: null,
        rollNumber: null,
        universityName: null,
        programme: null,
        session: null,
        sgpa: null,
        cgpa: null,
        marks: null,
        confidence: 0,
        warnings: [],
    };

    for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
        extracted[field] = matchField(text, patterns, field);
    }

    if (!extracted.fullName) {
        extracted.fullName = cleanCapturedValue('fullName', extractWithBoundaries(text, ['NAME']));
    }
    if (!extracted.rollNumber) {
        extracted.rollNumber = cleanCapturedValue('rollNumber', extractWithBoundaries(text, ['ROLL\\s+NO\\.?', 'ROLL\\s+NUMBER']));
    }
    if (!extracted.enrollmentNumber) {
        extracted.enrollmentNumber = cleanCapturedValue('enrollmentNumber', extractWithBoundaries(text, ['ENROLLMENT\\s+NUMBER', 'ENROLMENT\\s+NUMBER']));
    }
    if (!extracted.programme) {
        extracted.programme = cleanCapturedValue('programme', extractWithBoundaries(text, ['PROGRAMME', 'PROGRAM']));
    }
    if (documentType === 'grade_card') {
        const summaryLineMatch = text.match(
            /TOTAL\s+CREDIT\s+TOTAL\s+CREDIT\s+POINT\s+TOTAL\s+MARKS\s+SGPA\s+CGPA\s+CUMULATIVE\s+MARKS\s+RESULT\s*\n\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\/\s*([0-9.]+)\s+([A-Z]+)/i
        );
        if (summaryLineMatch) {
            if (extracted.marks === null) {
                extracted.marks = cleanCapturedValue('marks', summaryLineMatch[3]);
            }
            if (extracted.sgpa === null) {
                extracted.sgpa = cleanCapturedValue('sgpa', summaryLineMatch[4]);
            }
            if (extracted.cgpa === null) {
                extracted.cgpa = cleanCapturedValue('cgpa', summaryLineMatch[5]);
            }
        }
    }

    let confidence = 0;
    if (extracted.fullName) confidence += 0.25;
    if (extracted.universityName) confidence += 0.15;
    if (extracted.programme) confidence += 0.1;

    if (documentType === 'id_card') {
        if (extracted.studentId) confidence += 0.3;
        if (extracted.session) confidence += 0.1;
    } else if (documentType === 'grade_card') {
        if (extracted.enrollmentNumber || extracted.rollNumber) confidence += 0.2;
        if (extracted.cgpa !== null || extracted.sgpa !== null) confidence += 0.1;
        if (extracted.marks !== null) confidence += 0.1;
    }

    extracted.confidence = Number(Math.min(confidence, 0.99).toFixed(2));

    if (!extracted.fullName) {
        extracted.warnings.push('Could not confidently detect student name from the document text.');
    }

    if (documentType === 'grade_card' && !extracted.enrollmentNumber && !extracted.rollNumber) {
        extracted.warnings.push('Could not detect enrollment number or roll number from the grade card text.');
    }

    if (documentType === 'id_card' && !extracted.studentId) {
        extracted.warnings.push('Could not detect student ID from the ID card text.');
    }

    return extracted;
}

module.exports = {
    parseAcademicText,
    normalizeWhitespace,
};
