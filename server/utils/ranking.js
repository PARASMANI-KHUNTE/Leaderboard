const FIELD_FACTORS = {
    cgpa: 100,
    sgpa: 100,
    marks: 1,
};

function normalizeFieldValue(field, rawValue) {
    if (rawValue === null || rawValue === undefined || Number.isNaN(Number(rawValue))) {
        return 0;
    }

    return Number(rawValue) * (FIELD_FACTORS[field] || 1);
}

function getRankingFields(leaderboard) {
    const ranking = leaderboard?.ranking || {};
    const primaryField = ranking.primaryField || 'cgpa';
    const secondaryField = ranking.secondaryField || 'marks';

    if (ranking.mode === 'single') {
        return [primaryField];
    }

    if (ranking.mode === 'weighted') {
        return ['rankingScore', secondaryField];
    }

    return [primaryField, secondaryField];
}

function buildEntryRankingPayload(leaderboard, values) {
    const ranking = leaderboard?.ranking || {};
    const cgpa = values.cgpa ?? null;
    const sgpa = values.sgpa ?? null;
    const marks = values.marks ?? null;

    let rankingScore = 0;
    if (ranking.mode === 'weighted') {
        const weighted = ranking.weighted || {};
        rankingScore =
            (Number(cgpa) || 0) * (Number(weighted.cgpa) || 0) +
            (Number(sgpa) || 0) * (Number(weighted.sgpa) || 0) +
            (Number(marks) || 0) * (Number(weighted.marks) || 0);
    } else {
        const primaryField = ranking.primaryField || 'cgpa';
        const secondaryField = ranking.secondaryField || 'marks';
        rankingScore =
            normalizeFieldValue(primaryField, values[primaryField]) * 100000 +
            normalizeFieldValue(secondaryField, values[secondaryField]);
    }

    return {
        rankingScore,
        useMarks: Number(values.cgpa) === 0,
    };
}

module.exports = {
    getRankingFields,
    buildEntryRankingPayload,
    normalizeFieldValue,
};
