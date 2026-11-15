const fs = require('fs');
const path = require('path');

const { extractDocumentData } = require('../../services/documentVerification');
const { compareDocuments } = require('../../utils/verification');

const FIXTURES_DIR = path.join(__dirname, '../fixtures');

const FILES = {
    idCard: {
        filename: 'idcard.jpeg',
        mimeType: 'image/jpeg',
        documentType: 'id_card',
    },
    gradeImage: {
        filename: 'gradecard.png',
        mimeType: 'image/png',
        documentType: 'grade_card',
    },
    gradePdf: {
        filename: 'GGV_22_15327_Master_of_Computer_Application_YearSession_2025-2026-DECEMBER_REGULAR_Term_1_Grade_card.pdf',
        mimeType: 'application/pdf',
        documentType: 'grade_card',
    },
};

function pickFields(result = {}) {
    return {
        fullName: result.fullName,
        studentId: result.studentId,
        enrollmentNumber: result.enrollmentNumber,
        rollNumber: result.rollNumber,
        universityName: result.universityName,
        programme: result.programme,
        session: result.session,
        sgpa: result.sgpa,
        cgpa: result.cgpa,
        marks: result.marks,
        qrUrl: result.qrUrl || null,
        confidence: result.confidence,
        warnings: result.warnings || [],
    };
}

async function runOne(config) {
    const fullPath = path.join(FIXTURES_DIR, config.filename);
    const buffer = fs.readFileSync(fullPath);

    const result = await extractDocumentData({
        buffer,
        mimeType: config.mimeType,
        documentType: config.documentType,
    });

    return {
        file: config.filename,
        model: result.model,
        extracted: pickFields(result.parsed),
    };
}

async function main() {
    console.log('\nRunning local extraction probe against test assets...\n');

    const idCard = await runOne(FILES.idCard);
    const gradeImage = await runOne(FILES.gradeImage);
    const gradePdf = await runOne(FILES.gradePdf);

    console.log('ID CARD');
    console.log(JSON.stringify(idCard, null, 2));
    console.log('\nGRADE CARD IMAGE');
    console.log(JSON.stringify(gradeImage, null, 2));
    console.log('\nGRADE CARD PDF');
    console.log(JSON.stringify(gradePdf, null, 2));

    console.log('\nCOMPARE: ID vs GRADE IMAGE');
    console.log(JSON.stringify(compareDocuments(idCard.extracted, gradeImage.extracted), null, 2));

    console.log('\nCOMPARE: ID vs GRADE PDF');
    console.log(JSON.stringify(compareDocuments(idCard.extracted, gradePdf.extracted), null, 2));
}

main().catch((error) => {
    console.error('\nProbe failed:\n', error);
    process.exit(1);
});
