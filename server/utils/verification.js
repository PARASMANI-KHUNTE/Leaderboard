function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

function cleanIdentifier(value) {
    return String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();
}

function tokenize(value) {
    const rawTokens = normalizeText(value).split(/\s+/).filter(Boolean);
    const tokens = [];

    for (let index = 0; index < rawTokens.length; index += 1) {
        const token = rawTokens[index];
        if (token.length === 1) {
            let acronym = token;
            let lookahead = index + 1;
            while (lookahead < rawTokens.length && rawTokens[lookahead].length === 1) {
                acronym += rawTokens[lookahead];
                lookahead += 1;
            }
            if (acronym.length > 1) {
                tokens.push(acronym);
                index = lookahead - 1;
                continue;
            }
        }
        tokens.push(token);
    }

    return tokens;
}

const TOKEN_ALIASES = {
    ggv: ['guru', 'ghasidas', 'vishwavidyalaya'],
    csit: ['computer', 'science', 'information', 'technology'],
    mca: ['master', 'computer', 'application'],
    mcа: ['master', 'computer', 'application'],
    dept: ['department'],
    programme: ['program'],
};

function expandAliases(tokens = []) {
    const expanded = [];
    for (const token of tokens) {
        expanded.push(token);
        if (TOKEN_ALIASES[token]) {
            expanded.push(...TOKEN_ALIASES[token]);
        }
    }
    return expanded;
}

function compareSemanticText(left, right, minimumScore = 0.6) {
    const leftTokens = expandAliases(tokenize(left));
    const rightTokens = expandAliases(tokenize(right));
    if (!leftTokens.length || !rightTokens.length) {
        return { status: 'missing', score: 0 };
    }

    const setA = new Set(leftTokens);
    const setB = new Set(rightTokens);
    let overlap = 0;
    for (const token of setA) {
        if (setB.has(token)) overlap += 1;
    }
    const score = (2 * overlap) / (setA.size + setB.size);
    return {
        status: score >= minimumScore ? 'matched' : 'mismatched',
        score,
    };
}

function compareField(left, right, { exact = false, minimumScore = 0.75 } = {}) {
    const normalizedLeft = exact ? cleanIdentifier(left) : normalizeText(left);
    const normalizedRight = exact ? cleanIdentifier(right) : normalizeText(right);

    if (!normalizedLeft || !normalizedRight) {
        return { status: 'missing', score: 0 };
    }

    if (exact) {
        return {
            status: normalizedLeft === normalizedRight ? 'matched' : 'mismatched',
            score: normalizedLeft === normalizedRight ? 1 : 0,
        };
    }

    const score = calculateNameMatchScore(normalizedLeft, normalizedRight);
    return {
        status: score >= minimumScore ? 'matched' : 'mismatched',
        score,
    };
}

function calculateNameMatchScore(left, right) {
    const a = tokenize(left);
    const b = tokenize(right);
    if (!a.length || !b.length) return 0;

    const setA = new Set(a);
    const setB = new Set(b);
    let overlap = 0;
    for (const token of setA) {
        if (setB.has(token)) overlap += 1;
    }

    return (2 * overlap) / (setA.size + setB.size);
}

function compareDocuments(idCard, gradeCard) {
    const name = compareField(idCard?.fullName, gradeCard?.fullName, { minimumScore: 0.65 });
    const university = compareSemanticText(idCard?.universityName, gradeCard?.universityName, 0.5);
    const programme = compareSemanticText(idCard?.programme, gradeCard?.programme, 0.45);
    const session = compareSession(idCard?.session, gradeCard?.session);
    const enrollment = compareField(idCard?.enrollmentNumber, gradeCard?.enrollmentNumber, { exact: true });
    const rollNumber = compareField(idCard?.rollNumber, gradeCard?.rollNumber, { exact: true });
    const studentIdComparable = cleanIdentifier(idCard?.studentId) && (cleanIdentifier(gradeCard?.studentId) || cleanIdentifier(gradeCard?.enrollmentNumber) || cleanIdentifier(gradeCard?.rollNumber));
    const studentId = studentIdComparable
        ? compareField(idCard?.studentId, gradeCard?.studentId || gradeCard?.enrollmentNumber || gradeCard?.rollNumber, { exact: true })
        : { status: 'not_comparable', score: 0 };

    let confidenceScore = 0;
    const acceptedBecause = [];
    const rejectedBecause = [];

    if (name.status === 'matched') {
        confidenceScore += 80;
        acceptedBecause.push('Student name matched strongly across both documents.');
    } else {
        rejectedBecause.push('Student name does not match strongly enough across ID and grade card.');
    }

    if (university.status === 'matched') {
        confidenceScore += 10;
        acceptedBecause.push('University name matched.');
    } else if (university.status === 'mismatched') {
        rejectedBecause.push('University name did not align strongly enough.');
    }

    if (programme.status === 'matched') {
        confidenceScore += 5;
        acceptedBecause.push('Programme matched.');
    } else if (programme.status === 'mismatched') {
        rejectedBecause.push('Programme/department wording did not align strongly enough.');
    }

    if (session.status === 'matched') {
        confidenceScore += 10;
        acceptedBecause.push('Session matched.');
    }

    if (enrollment.status === 'matched') {
        confidenceScore += 20;
        acceptedBecause.push('Enrollment number matched exactly.');
    } else if (enrollment.status === 'mismatched') {
        rejectedBecause.push('Enrollment number did not match exactly.');
    }

    if (rollNumber.status === 'matched') {
        confidenceScore += 10;
        acceptedBecause.push('Roll number matched exactly.');
    }

    if (studentId.status === 'matched') {
        confidenceScore += 10;
        acceptedBecause.push('Student ID matched another official identifier.');
    }

    const status = name.status === 'matched'
        ? 'accepted'
        : confidenceScore >= 70
        ? 'accepted'
        : confidenceScore >= 40
            ? 'needs_review'
            : 'rejected';

    return {
        normalizedNameMatchScore: Number(name.score.toFixed(3)),
        confidenceScore,
        status,
        fields: {
            name: { status: name.status, score: Number(name.score.toFixed(3)) },
            university: { status: university.status, score: Number(university.score.toFixed(3)) },
            programme: { status: programme.status, score: Number(programme.score.toFixed(3)) },
            session: { status: session.status, score: Number(session.score.toFixed(3)) },
            enrollment: { status: enrollment.status, score: Number(enrollment.score.toFixed(3)) },
            rollNumber: { status: rollNumber.status, score: Number(rollNumber.score.toFixed(3)) },
            studentId: { status: studentId.status, score: Number(studentId.score.toFixed(3)) },
        },
        enrollmentExactMatch: enrollment.status === 'matched',
        rollNumberExactMatch: rollNumber.status === 'matched',
        universityMatch: university.status === 'matched',
        acceptedBecause,
        rejectedBecause: [...new Set(rejectedBecause)],
    };
}

function extractSessionYears(value) {
    const match = String(value || '').match(/(\d{4})\s*-\s*(\d{2,4})/);
    if (!match) return null;
    const start = match[1];
    const end = match[2].length === 2 ? `${start.slice(0, 2)}${match[2]}` : match[2];
    return `${start}-${end}`;
}

function compareSession(left, right) {
    const normalizedLeft = extractSessionYears(left);
    const normalizedRight = extractSessionYears(right);
    if (!normalizedLeft || !normalizedRight) {
        return { status: 'missing', score: 0 };
    }
    return {
        status: normalizedLeft === normalizedRight ? 'matched' : 'mismatched',
        score: normalizedLeft === normalizedRight ? 1 : 0,
    };
}

module.exports = {
    compareDocuments,
    calculateNameMatchScore,
    normalizeText,
    cleanIdentifier,
};
