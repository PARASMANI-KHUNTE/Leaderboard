const crypto = require('crypto');
const { PDFParse } = require('pdf-parse');
const sharp = require('sharp');
const jsQR = require('jsqr');
const cheerio = require('cheerio');
const Tesseract = require('tesseract.js');
const { getCloudinary } = require('../config/cloudinary');
const { parseAcademicText } = require('../utils/academicTextParser');

const MAX_IMAGE_WIDTH = 1600;
const MAX_IMAGE_HEIGHT = 1600;
const IMAGE_QUALITY = 78;
function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function isImageMime(mimeType) {
    return /^image\//.test(String(mimeType || ''));
}

function isPdfMime(mimeType) {
    return String(mimeType || '').toLowerCase() === 'application/pdf';
}

async function compressUpload(file) {
    if (!isImageMime(file.mimetype)) {
        return {
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalName: file.originalname,
            bytes: file.size,
            compressed: false,
        };
    }

    const transformed = await sharp(file.buffer)
        .rotate()
        .resize({
            width: MAX_IMAGE_WIDTH,
            height: MAX_IMAGE_HEIGHT,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .jpeg({
            quality: IMAGE_QUALITY,
            mozjpeg: true,
        })
        .toBuffer();

    return {
        buffer: transformed,
        mimeType: 'image/jpeg',
        originalName: file.originalname,
        bytes: transformed.length,
        compressed: true,
    };
}

async function uploadToCloudinary({ buffer, mimeType, folder, filename, resourceType = 'auto' }) {
    const cloudinary = getCloudinary();
    const effectiveResourceType = resourceType === 'auto'
        ? (isImageMime(mimeType) ? 'image' : 'raw')
        : resourceType;

    const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: filename,
                resource_type: effectiveResourceType,
                overwrite: false,
            },
            (error, uploadResult) => {
                if (error) return reject(error);
                resolve(uploadResult);
            }
        );

        stream.end(buffer);
    });

    return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        resourceType: result.resource_type,
    };
}

function safeJsonParse(content) {
    try {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start === -1 || end === -1) return null;
        return JSON.parse(content.slice(start, end + 1));
    } catch {
        return null;
    }
}

async function extractPdfText(buffer) {
    const parser = new PDFParse({ data: buffer });
    try {
        const result = await parser.getText();
        return result?.text || '';
    } finally {
        await parser.destroy();
    }
}

async function extractImageText(buffer) {
    const prepared = await sharp(buffer)
        .rotate()
        .grayscale()
        .normalize()
        .sharpen()
        .resize({
            width: 2200,
            fit: 'inside',
            withoutEnlargement: false,
        })
        .png()
        .toBuffer();

    const result = await Tesseract.recognize(prepared, 'eng', {
        logger: () => {},
        tessedit_pageseg_mode: 6,
    });
    return result?.data?.text || '';
}

async function extractPdfImages(buffer) {
    const parser = new PDFParse({ data: buffer });
    try {
        const result = await parser.getScreenshot({
            imageBuffer: true,
            desiredWidth: 1800,
        });
        return result?.pages || [];
    } finally {
        await parser.destroy();
    }
}

function buildEmptyExtraction(warnings = []) {
    return {
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
        warnings,
    };
}

function mergeExtractions(primary, fallback, extraWarnings = []) {
    const merged = { ...fallback };
    for (const key of Object.keys(primary || {})) {
        const value = primary[key];
        if (value !== null && value !== undefined && value !== '') {
            merged[key] = value;
        }
    }

    merged.confidence = Number(Math.max(primary?.confidence || 0, fallback?.confidence || 0).toFixed(2));
    merged.warnings = [...new Set([...(primary?.warnings || []), ...(fallback?.warnings || []), ...extraWarnings])];
    return merged;
}

async function decodeQrFromImage(buffer) {
    try {
        const { data, info } = await sharp(buffer)
            .rotate()
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height);
        return qr?.data || null;
    } catch {
        return null;
    }
}

function normalizeQrUrl(rawValue) {
    if (!rawValue) return null;
    const trimmed = String(rawValue).trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed.replace(/^\/+/, '')}`;
}

async function extractFromQrLinkedPage(qrUrl, documentType) {
    if (!qrUrl) return null;

    const response = await fetch(qrUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 EliteBoards Verification Bot',
        },
    });

    if (!response.ok) {
        throw new Error(`QR page fetch failed with ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const extractedFields = {};

    $('.details p').each((_, element) => {
        const label = $(element).find('strong').first().text().replace(/[:\s]+$/g, '').trim().toLowerCase();
        const value = $(element).clone().find('strong').remove().end().text().replace(/^:\s*/, '').trim();
        if (!label || !value) return;

        if (label === 'name') extractedFields.fullName = value;
        if (label === 'department') extractedFields.department = value;
        if (label === 'program') extractedFields.programme = value;
        if (label === 'form no') extractedFields.studentId = value;
        if (label === 'session') extractedFields.session = value;
    });

    const headingText = $('h1, h2, h3, h4, h5').map((_, el) => $(el).text().trim()).get().join('\n');
    const pageText = `${headingText}\n${$('.details').text()}`;
    const parsed = parseAcademicText(pageText, { documentType });
    const inferredUniversityName = /ggv\.ac\.in/i.test(qrUrl)
        ? 'Guru Ghasidas Vishwavidyalaya'
        : parsed.universityName;

    return {
        qrUrl,
        parsed: {
            ...parsed,
            ...extractedFields,
            universityName: extractedFields.universityName || inferredUniversityName || parsed.universityName,
            programme: extractedFields.programme || parsed.programme,
            fullName: extractedFields.fullName || parsed.fullName,
            studentId: extractedFields.studentId || parsed.studentId,
            confidence: Number(Math.max(parsed.confidence || 0, 0.95).toFixed(2)),
            warnings: [...new Set([
                ...(parsed.warnings || []).filter((warning) => !(extractedFields.studentId && /student id/i.test(warning))),
                'Official ID details were enriched from the QR-linked university page.',
            ])],
        },
    };
}

async function extractDocumentData({ buffer, mimeType, documentType }) {
    if (documentType === 'id_card' && isImageMime(mimeType)) {
        const qrUrl = normalizeQrUrl(await decodeQrFromImage(buffer));
        if (qrUrl) {
            try {
                const qrExtraction = await extractFromQrLinkedPage(qrUrl, documentType);
                if (qrExtraction?.parsed?.fullName || qrExtraction?.parsed?.studentId) {
                    return {
                        model: 'qr-linked-page',
                        parsed: mergeExtractions(
                            {
                                ...qrExtraction.parsed,
                                qrUrl,
                            },
                            buildEmptyExtraction(),
                        ),
                    };
                }
            } catch (error) {
                // Fall through to model extraction, but preserve the warning later if needed.
            }
        }
    }

    if (isPdfMime(mimeType)) {
        try {
            const text = await extractPdfText(buffer);
            const parsedFromText = text.trim()
                ? parseAcademicText(text, { documentType })
                : buildEmptyExtraction([
                    'No extractable text was found in this PDF. Falling back to OCR rendering.',
                ]);

            const textConfidence = parsedFromText?.confidence || 0;
            const needsOcrFallback =
                textConfidence < 0.7 ||
                !parsedFromText.fullName ||
                (documentType === 'grade_card' && !parsedFromText.enrollmentNumber && !parsedFromText.rollNumber);

            if (!needsOcrFallback) {
                return {
                    model: 'pdf-text-local',
                    parsed: parsedFromText,
                };
            }

            const pages = await extractPdfImages(buffer);
            const firstPage = pages?.[0];
            if (!firstPage?.data?.length) {
                return {
                    model: 'pdf-text-local',
                    parsed: parsedFromText,
                };
            }

            const ocrText = await extractImageText(Buffer.from(firstPage.data));
            const parsedFromOcr = ocrText.trim()
                ? parseAcademicText(ocrText, { documentType })
                : buildEmptyExtraction(['Rendered PDF page did not yield readable OCR text.']);

            const merged = mergeExtractions(parsedFromText, parsedFromOcr, [
                'PDF OCR fallback was used to improve extraction.',
            ]);

            return {
                model: 'pdf-text+ocr-local',
                parsed: merged,
            };
        } catch (error) {
            return {
                model: 'pdf-text-local',
                parsed: buildEmptyExtraction([
                    `PDF extraction failed: ${error.message}`,
                ]),
            };
        }
    }

    if (isImageMime(mimeType)) {
        try {
            const text = await extractImageText(buffer);
            if (!text.trim()) {
                return {
                    model: 'ocr-local',
                    parsed: buildEmptyExtraction([
                        'No readable text was detected in this image. Please upload a clearer image.',
                    ]),
                };
            }

            const parsed = parseAcademicText(text, { documentType });
            const warningPrefix = documentType === 'id_card'
                ? 'ID card details were extracted from image OCR.'
                : 'Grade card details were extracted from image OCR.';
            return {
                model: 'ocr-local',
                parsed: {
                    ...parsed,
                    warnings: [...new Set([warningPrefix, ...(parsed.warnings || [])])],
                },
            };
        } catch (error) {
            return {
                model: 'ocr-local',
                parsed: buildEmptyExtraction([
                    `Image OCR extraction failed: ${error.message}`,
                ]),
            };
        }
    }

    return {
        model: null,
        parsed: buildEmptyExtraction([
            'This file type is not supported for automatic extraction.',
        ]),
    };
}

async function reviewVerification({ leaderboard, idCard, gradeCard, comparison }) {
    return {
        model: null,
        result: null,
    };
}

module.exports = {
    compressUpload,
    uploadToCloudinary,
    extractDocumentData,
    reviewVerification,
    sha256,
    isImageMime,
    isPdfMime,
};
