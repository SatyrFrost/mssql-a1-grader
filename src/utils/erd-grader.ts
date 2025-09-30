import { inflate } from 'pako';

// --- Constants for Expected Structure (Translated from Python) ---
const EXPECTED_ENTITY_NAMES_GROUND_TRUTH = new Set([
    "CUSTOMER", "PAYMENT", "LU_COLOUR", "SALE", "SALESPERSON",
    "CAR", "ORDERS", "ORDERSPRODUCT", "PRODUCT", "SUPPLIER"
]);

const EXPECTED_STRUCTURE: { [key: string]: { pk: string[]; fk: string[] } } = {
    "CUSTOMER": { "pk": ["CustomerID"], "fk": [] },
    "PAYMENT": { "pk": ["PaymentInvoiceID"], "fk": ["CustomerID", "InvoiceID"] },
    "LU_COLOUR": { "pk": ["ColourID"], "fk": [] },
    "SALE": { "pk": ["InvoiceID"], "fk": ["CustomerID", "SalespersonID", "RegistrationID"] },
    "SALESPERSON": { "pk": ["SalespersonID"], "fk": [] },
    "CAR": { "pk": ["RegistrationID"], "fk": ["ColourID"] },
    "ORDERS": { "pk": ["OrderID"], "fk": ["SupplierID", "SalespersonID"] },
    "ORDERSPRODUCT": { "pk": ["OrderID", "ProductID"], "fk": ["OrderID", "ProductID"] },
    "PRODUCT": { "pk": ["ProductID"], "fk": [] },
    "SUPPLIER": { "pk": ["SupplierID"], "fk": [] }
};

const EXPECTED_RELATIONSHIPS: { [key: string]: [string, string] } = {
    "CUSTOMER_PAYMENT": ["1", "0..N"],
    "CUSTOMER_SALE": ["1", "0..N"],
    "PAYMENT_SALE": ["0..N", "1"],
    "SALE_CAR": ["1", "0..N"],
    "SALE_SALESPERSON": ["0..N", "1"],
    "LU_COLOUR_CAR": ["1", "0..N"],
    "SUPPLIER_ORDERS": ["1", "0..N"],
    "SALESPERSON_ORDERS": ["1", "0..N"],
    "ORDERS_ORDERSPRODUCT": ["1", "0..N"],
    "PRODUCT_ORDERSPRODUCT": ["1", "0..N"]
};

// --- Utility Functions (Translated from Python) ---

function base64DecodeAndZlibDecompress(compressedData: string): string | null {
    const cleanedData = compressedData.replace(/ /g, '+').replace(/&#xa;/g, '').replace(/\n/g, '').trim();
    const paddingNeeded = cleanedData.length % 4;
    const paddedData = paddingNeeded ? cleanedData + '='.repeat(4 - paddingNeeded) : cleanedData;

    try {
        const decodedData = atob(paddedData);
        const charData = decodedData.split('').map(c => c.charCodeAt(0));
        const binData = new Uint8Array(charData);

        // Try different wbits values for zlib decompression
        for (const wbits of [15, -15, 31]) { // pako's default is 15, -15 for raw, 31 for gzip
            try {
                const decompressed = inflate(binData, { raw: wbits === -15, windowBits: wbits });
                return new TextDecoder().decode(decompressed);
            } catch (e) {
                console.warn(`Decompression with wbits=${wbits} failed:`, e); // Added more specific logging
            }
        }
        console.error("All zlib decompression attempts failed."); // Added more specific logging
        return null;
    } catch (e) {
        console.error("Base64 decode or initial zlib decompress setup failed:", e); // Added more specific logging
        return null;
    }
}

function extractMxGraphModel(xmlContent: string): Element | null {
    const parser = new DOMParser();
    let doc: Document;
    try {
        doc = parser.parseFromString(xmlContent, "text/xml");
    } catch (e) {
        console.error("FATAL ERROR: Could not parse XML content.", e);
        return null;
    }

    const diagram = doc.querySelector('diagram');
    if (diagram) {
        const mxModelDirect = diagram.querySelector('mxGraphModel');
        if (mxModelDirect) {
            return mxModelDirect;
        }

        const compressedData = diagram.textContent?.trim();
        if (compressedData) {
            try {
                const unquotedData = decodeURIComponent(compressedData);
                const decompressedXmlString = base64DecodeAndZlibDecompress(unquotedData);
                if (decompressedXmlString) {
                    const decompressedDoc = parser.parseFromString(decompressedXmlString, "text/xml");
                    const mxModel = decompressedDoc.querySelector('mxGraphModel');
                    if (mxModel) {
                        return mxModel;
                    } else {
                        console.error("Decompressed XML does not contain mxGraphModel.");
                    }
                } else {
                    console.error("Failed to decompress diagram data.");
                }
            } catch (e) {
                console.error("Error processing compressed diagram data:", e);
            }
        } else {
            console.error("Diagram element found, but no compressed data (textContent) or direct mxGraphModel.");
        }
    } else {
        console.error("No 'diagram' element found in the XML content.");
    }
    return null;
}

function levenshteinDistance(s1: string, s2: string): number {
    if (s1.length < s2.length) {
        return levenshteinDistance(s2, s1);
    }
    if (s2.length === 0) {
        return s1.length;
    }

    let previousRow: number[] = Array.from({ length: s2.length + 1 }, (_, i) => i);

    for (let i = 0; i < s1.length; i++) {
        const currentRow: number[] = [i + 1];
        for (let j = 0; j < s2.length; j++) {
            const insertions = previousRow[j + 1] + 1;
            const deletions = currentRow[j] + 1;
            const substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
            currentRow.push(Math.min(insertions, deletions, substitutions));
        }
        previousRow = currentRow;
    }
    return previousRow[s2.length];
}

function normalizeName(name: string): string {
    return name.replace(/[_-\s]/g, '').toUpperCase();
}

function isSimilarName(foundName: string): string | null {
    if (foundName.length < 3 || foundName.toUpperCase().endsWith('ID')) {
        return null;
    }

    const foundNormalized = normalizeName(foundName);

    for (const expected of EXPECTED_ENTITY_NAMES_GROUND_TRUTH) {
        const expectedNormalized = normalizeName(expected);
        if (foundNormalized === expectedNormalized) {
            return expected;
        }
    }

    // Plurals
    if (foundNormalized.endsWith('S')) {
        for (const expected of EXPECTED_ENTITY_NAMES_GROUND_TRUTH) {
            const expectedNormalized = normalizeName(expected);
            if (foundNormalized.slice(0, -1) === expectedNormalized) {
                return expected;
            }
        }
    }
    if (foundNormalized.endsWith('ES')) {
        for (const expected of EXPECTED_ENTITY_NAMES_GROUND_TRUTH) {
            const expectedNormalized = normalizeName(expected);
            if (foundNormalized.slice(0, -2) === expectedNormalized) {
                return expected;
            }
        }
    }

    // Common spelling variations
    const spellingVariations: { [key: string]: string } = {
        'COLOR': 'COLOUR',
        'COLOUR': 'COLOUR',
        'LUCOLOR': 'LUCOLOUR',
        'LUCOLOUR': 'LUCOLOUR',
    };

    if (foundNormalized in spellingVariations) {
        const target = spellingVariations[foundNormalized];
        for (const expected of EXPECTED_ENTITY_NAMES_GROUND_TRUTH) {
            if (normalizeName(expected) === target) {
                return expected;
            }
        }
    }

    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const expected of EXPECTED_ENTITY_NAMES_GROUND_TRUTH) {
        const expectedNormalized = normalizeName(expected);
        if (Math.abs(foundNormalized.length - expectedNormalized.length) > 3) {
            continue;
        }

        const distance = levenshteinDistance(foundNormalized, expectedNormalized);
        const maxDistance = Math.min(2, Math.floor(expectedNormalized.length / 3));

        if (distance < bestDistance && distance <= maxDistance) {
            bestDistance = distance;
            bestMatch = expected;
        }
    }
    return bestMatch;
}

function fuzzyMatchAttribute(foundAttr: string, expectedAttrs: string[]): string | null {
    const foundNormalized = normalizeName(foundAttr);

    for (const expected of expectedAttrs) {
        if (foundNormalized === normalizeName(expected)) {
            return expected;
        }
    }

    const commonVariations: { [key: string]: string } = {
        'CUSTOMERID': 'CustomerID', 'CUSTOMER_ID': 'CustomerID', 'CUSTID': 'CustomerID',
        'SALESPERSONID': 'SalespersonID', 'SALESPERSON_ID': 'SalespersonID',
        'COLORID': 'ColourID', 'COLOUR_ID': 'ColourID',
        'INVOICEID': 'InvoiceID', 'INVOICE_ID': 'InvoiceID',
        'ORDERID': 'OrderID', 'ORDER_ID': 'OrderID',
        'PRODUCTID': 'ProductID', 'PRODUCT_ID': 'ProductID',
        'SUPPLIERID': 'SupplierID', 'SUPPLIER_ID': 'SupplierID',
        'REGISTRATIONID': 'RegistrationID', 'REGISTRATION_ID': 'RegistrationID', 'REGID': 'RegistrationID',
        'PAYMENTINVOICEID': 'PaymentInvoiceID', 'PAYMENT_INVOICE_ID': 'PaymentInvoiceID',
    };

    if (foundNormalized in commonVariations) {
        const target = commonVariations[foundNormalized];
        for (const expected of expectedAttrs) {
            if (normalizeName(expected) === normalizeName(target)) {
                return expected;
            }
        }
    }

    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const expected of expectedAttrs) {
        const expectedNormalized = normalizeName(expected);
        const distance = levenshteinDistance(foundNormalized, expectedNormalized);
        const maxDistance = Math.max(3, Math.floor(expectedNormalized.length / 4));

        if (distance < bestDistance && distance <= maxDistance) {
            bestDistance = distance;
            bestMatch = expected;
        }
    }
    return bestMatch;
}

interface EntityAttribute {
    name: string;
    type: string;
    is_pk: boolean;
    is_fk: boolean;
}

interface ParsedEntity {
    name: string;
    ground_truth_name: string;
    attributes: EntityAttribute[];
    id: string;
}

interface ParsedRelationship {
    source: string;
    source_gt: string;
    target: string;
    target_gt: string;
    name: string;
    cardinality: string;
    start_card: string;
    end_card: string;
}

function parseErdElements(mxGraphModel: Element): { entities: { [id: string]: ParsedEntity }, relationships: ParsedRelationship[] } {
    const entities: { [id: string]: ParsedEntity } = {};
    const relationships: ParsedRelationship[] = [];
    const allCells: { [id: string]: Element } = {};
    const parentMap: { [id: string]: string } = {};

    const nonAttributeValues = new Set([...Array.from(EXPECTED_ENTITY_NAMES_GROUND_TRUTH), "PK", "FK", "PK, FK"]);

    // Pass 1: Collect all cells and identify REAL entities (swimlanes)
    mxGraphModel.querySelectorAll('mxCell').forEach(cell => {
        const cellId = cell.getAttribute('id');
        if (!cellId) return;

        allCells[cellId] = cell;
        const parentId = cell.getAttribute('parent');
        if (parentId) {
            parentMap[cellId] = parentId;
        }

        const value = cell.getAttribute('value')?.trim() || '';
        const style = cell.getAttribute('style') || '';

        if (style.toLowerCase().includes('swimlane')) {
            const matchedExpectedName = isSimilarName(value);
            if (matchedExpectedName) {
                entities[cellId] = {
                    name: value,
                    ground_truth_name: matchedExpectedName,
                    attributes: [],
                    id: cellId
                };
            }
        }
    });

    const entityIds = new Set(Object.keys(entities));

    // Pass 2: Process attributes with fuzzy matching
    entityIds.forEach(entityId => {
        const entityData = entities[entityId];
        const entityGtName = entityData.ground_truth_name;
        const expectedPks = EXPECTED_STRUCTURE[entityGtName]?.pk || [];
        const expectedFks = EXPECTED_STRUCTURE[entityGtName]?.fk || [];

        const entityCells: { id: string; value: string; y: number; x: number; width: number; style: string }[] = [];
        for (const cellId in allCells) {
            let currentId: string | undefined = cellId;
            let found = false;
            let depth = 0;
            while (currentId && depth < 10) {
                if (currentId === entityId) {
                    found = true;
                    break;
                }
                currentId = parentMap[currentId];
                depth++;
            }

            if (found && cellId !== entityId) {
                const cell = allCells[cellId];
                const value = cell.getAttribute('value')?.trim() || '';
                const geometry = cell.querySelector('mxGeometry');
                const yPos = parseFloat(geometry?.getAttribute('y') || '0');
                const xPos = parseFloat(geometry?.getAttribute('x') || '0');
                const width = parseFloat(geometry?.getAttribute('width') || '0');

                entityCells.push({
                    id: cellId,
                    value: value,
                    y: yPos,
                    x: xPos,
                    width: width,
                    style: cell.getAttribute('style') || ''
                });
            }
        }

        entityCells.sort((a, b) => {
            if (a.y !== b.y) return a.y - b.y;
            return a.x - b.x;
        });

        const rows: typeof entityCells[][] = [];
        let currentRow: typeof entityCells = [];
        let lastY: number | null = null;
        const tolerance = 5;

        for (const cellInfo of entityCells) {
            if (lastY === null || Math.abs(cellInfo.y - lastY) <= tolerance) {
                currentRow.push(cellInfo);
                lastY = cellInfo.y;
            } else {
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                }
                currentRow = [cellInfo];
                lastY = cellInfo.y;
            }
        }
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }

        for (const row of rows) {
            if (row.length < 1) continue;

            row.sort((a, b) => a.x - b.x);

            let attrName: string | null = null;
            // Find the actual attribute name cell (not the PK/FK indicator)
            for (const cellInfo of row) {
                const value = cellInfo.value;
                // Heuristic: attribute name is usually not "PK", "FK", "PK, FK" and not an entity name
                if (value && !nonAttributeValues.has(value) && !isSimilarName(value)) {
                    attrName = value;
                    break;
                }
            }

            if (attrName) {
                let isPk = false;
                let isFk = false;

                // Check for an explicit indicator cell first (small width, specific values)
                const indicatorCell = row.find(cell => 
                    cell.width > 0 && cell.width < 80 && 
                    (cell.value.toUpperCase().includes('PK') || cell.value.toUpperCase().includes('FK') || cell.value.toUpperCase() === '')
                );
                
                if (indicatorCell) {
                    // If an indicator cell exists, its content is the source of truth
                    const indicatorValue = indicatorCell.value.toUpperCase();
                    isPk = indicatorValue.includes('PK');
                    isFk = indicatorValue.includes('FK');
                } else {
                    // If no explicit indicator cell is found, then try fuzzy matching as a fallback
                    const matchedPk = fuzzyMatchAttribute(attrName, expectedPks);
                    const matchedFk = fuzzyMatchAttribute(attrName, expectedFks);
                    isPk = matchedPk !== null;
                    isFk = matchedFk !== null;
                }

                let typeStr = '';
                if (isPk && isFk) {
                    typeStr = 'PK, FK';
                } else if (isPk) {
                    typeStr = 'PK';
                } else if (isFk) {
                    typeStr = 'FK';
                }

                entityData.attributes.push({
                    name: attrName,
                    type: typeStr,
                    is_pk: isPk,
                    is_fk: isFk
                });
            }
        }
    });

    // Pass 3: Find relationships
    const seenRelationships = new Set<string>();

    const findEntityOwner = (cellId: string): string | null => {
        let currentId: string | undefined = cellId;
        let depth = 0;
        while (currentId && depth < 20) {
            if (entities[currentId]) {
                return currentId;
            }
            currentId = parentMap[currentId];
            depth++;
        }
        return null;
    };

    mxGraphModel.querySelectorAll("mxCell[edge='1']").forEach(cell => {
        const style = cell.getAttribute('style') || '';
        const sourceId = cell.getAttribute('source');
        const targetId = cell.getAttribute('target');
        const relName = cell.getAttribute('value')?.trim() || '...';

        const sourceEntityId = sourceId ? findEntityOwner(sourceId) : null;
        const targetEntityId = targetId ? findEntityOwner(targetId) : null;

        if (sourceEntityId && targetEntityId) {
            const sortedEntityIds = [sourceEntityId, targetEntityId].sort();
            const relKey = `${sortedEntityIds[0]}-${sortedEntityIds[1]}`;

            if (seenRelationships.has(relKey)) {
                return;
            }
            seenRelationships.add(relKey);

            const startCard = style.includes('startArrow=ERmandOne') ? '1' :
                            style.includes('startArrow=ERzeroToMany') ? '0..N' :
                            style.includes('startArrow=ERoneToMany') ? '1..N' : // Added 1..N
                            '?';
            const endCard = style.includes('endArrow=ERmandOne') ? '1' :
                          (style.includes('endArrow=ERzeroToMany') || style.includes('endArrow=ERoneToMany')) ? '0..N' : // draw.io often uses ERoneToMany for 0..N
                          '?';
            const cardinality = `(${startCard}):(${endCard})`;

            relationships.push({
                source: entities[sourceEntityId].name,
                source_gt: entities[sourceEntityId].ground_truth_name,
                target: entities[targetEntityId].name,
                target_gt: entities[targetEntityId].ground_truth_name,
                name: relName,
                cardinality: cardinality,
                start_card: startCard,
                end_card: endCard
            });
        }
    });

    return { entities, relationships };
}

interface GradingFeedback {
    Fields: string[];
    Keys: string[];
    Relationships: string[];
    Relationship_Details: {
        rel: ParsedRelationship;
        expected: [string, string];
        correct_source: boolean;
        correct_target: boolean;
    }[];
}

interface ScoreDetails {
    rawScore: number;
    scaledScore: number;
    percentage: number;
    MAX_RAW_SCORE: number;
    feedbackPoints: GradingFeedback;
    missingEntities: string[];
    fieldMarks: number;
    keyMarks: number;
    relationshipMarks: number;
}

function calculateScore(entities: { [id: string]: ParsedEntity }, relationships: ParsedRelationship[]): ScoreDetails {
    const MAX_RAW_SCORE = 116;
    let currentScore = 0;
    const feedbackPoints: GradingFeedback = {
        Fields: [],
        Keys: [],
        Relationships: [],
        Relationship_Details: []
    };

    const entityGroundTruthNamesFound = new Set(Object.values(entities).map(data => data.ground_truth_name));
    const missingEntities = new Set(Array.from(EXPECTED_ENTITY_NAMES_GROUND_TRUTH).filter(e => !entityGroundTruthNamesFound.has(e)));

    // 1. Fields (55 marks)
    const EXPECTED_FIELDS = 55;
    const allAttributesCount = Object.values(entities).reduce((sum, data) => sum + data.attributes.length, 0);
    const fieldMarks = Math.min(EXPECTED_FIELDS, allAttributesCount);
    currentScore += fieldMarks;
    feedbackPoints.Fields.push(
        `Found ${allAttributesCount}/${EXPECTED_FIELDS} fields. Awarded ${fieldMarks}/55 marks.`);

    // 2. Keys (21 marks) - with fuzzy matching
    let correctPks = 0;
    let correctFks = 0;
    const totalExpectedPks = Object.values(EXPECTED_STRUCTURE).reduce((sum, s) => sum + s.pk.length, 0);
    const totalExpectedFks = Object.values(EXPECTED_STRUCTURE).reduce((sum, s) => sum + s.fk.length, 0);

    for (const entityData of Object.values(entities)) {
        const gtName = entityData.ground_truth_name;
        const expectedPks = EXPECTED_STRUCTURE[gtName]?.pk || [];
        const expectedFks = EXPECTED_STRUCTURE[gtName]?.fk || [];

        for (const attr of entityData.attributes) {
            if (attr.is_pk) {
                const matchedPk = fuzzyMatchAttribute(attr.name, expectedPks);
                if (matchedPk) {
                    correctPks++;
                }
            }

            if (attr.is_fk) {
                const matchedFk = fuzzyMatchAttribute(attr.name, expectedFks);
                if (matchedFk) {
                    correctFks++;
                }
            }
        }
    }

    const keyMarks = correctPks + correctFks;
    currentScore += keyMarks;
    feedbackPoints.Keys.push(
        `Correct PKs: ${correctPks}/${totalExpectedPks}. ` +
        `Correct FKs: ${correctFks}/${totalExpectedFks}. ` +
        `Total: ${keyMarks}/21 marks.`);

    // 3. Relationships with cardinality validation (40 marks)
    let connectionMarks = 0;
    let sourceCardinalityMarks = 0;
    let targetCardinalityMarks = 0;

    const matchedRelationships: GradingFeedback['Relationship_Details'] = [];

    for (const rel of relationships) {
        const sourceGt = rel.source_gt;
        const targetGt = rel.target_gt;

        const relKey = `${sourceGt}_${targetGt}`;
        const relKeyReverse = `${targetGt}_${sourceGt}`;

        let expectedCard: [string, string] | undefined = undefined;
        let isReversed = false;

        if (EXPECTED_RELATIONSHIPS[relKey]) {
            expectedCard = EXPECTED_RELATIONSHIPS[relKey];
            isReversed = false;
        } else if (EXPECTED_RELATIONSHIPS[relKeyReverse]) {
            expectedCard = EXPECTED_RELATIONSHIPS[relKeyReverse];
            isReversed = true;
        }

        if (expectedCard) {
            connectionMarks += 2;

            const [expectedSourceCard, expectedTargetCard] = isReversed ? [expectedCard[1], expectedCard[0]] : [expectedCard[0], expectedCard[1]];

            const correctSource = rel.start_card === expectedSourceCard;
            const correctTarget = rel.end_card === expectedTargetCard;

            if (correctSource) {
                sourceCardinalityMarks += 1;
            }
            if (correctTarget) {
                targetCardinalityMarks += 1;
            }

            matchedRelationships.push({
                rel: rel,
                expected: [expectedSourceCard, expectedTargetCard],
                correct_source: correctSource,
                correct_target: correctTarget
            });
        }
    }

    const relationshipMarks = connectionMarks + sourceCardinalityMarks + targetCardinalityMarks;
    currentScore += relationshipMarks;

    feedbackPoints.Relationships.push(
        `Found ${relationships.length}/10 relationships. ` +
        `Connection: ${connectionMarks}/20, ` +
        `Source cardinality: ${sourceCardinalityMarks}/10, ` +
        `Target cardinality: ${targetCardinalityMarks}/10. ` +
        `Total: ${relationshipMarks}/40 marks.`);

    feedbackPoints.Relationship_Details = matchedRelationships;

    const rawScore = currentScore;
    const scaledScore = (currentScore / MAX_RAW_SCORE) * 40;
    const percentage = (currentScore / MAX_RAW_SCORE) * 100;

    return { rawScore, scaledScore, percentage, MAX_RAW_SCORE, feedbackPoints, missingEntities: Array.from(missingEntities), fieldMarks, keyMarks, relationshipMarks };
}

function generateReport(
    entities: { [id: string]: ParsedEntity },
    relationships: ParsedRelationship[],
    rawScore: number,
    scaledScore: number,
    percentage: number,
    maxRawScore: number,
    feedback: GradingFeedback,
    missingEntities: string[],
    fieldMarks: number,
    keyMarks: number,
    relationshipMarks: number
): string {
    let report = `--- GRADING REPORT (Part 1: ERD) --- 
Raw Score: ${rawScore.toFixed(0)} / ${maxRawScore} 
Scaled Score (out of 40): ${scaledScore.toFixed(2)} / 40
Percentage: ${percentage.toFixed(1)}%

--- DETAILED BREAKDOWN --- 
1. Fields: ${feedback.Fields[0]}
2. Keys (PK/FK): ${feedback.Keys[0]}
3. Relationships: ${feedback.Relationships[0]}

Missing Tables: ${missingEntities.length > 0 ? missingEntities.sort().join(', ') : 'None'}

---

## Extracted Diagram Structure

### Entities and Attributes

`;
    for (const data of Object.values(entities)) {
        report += `**Entity:** \`${data.name}\` (Ground Truth: \`${data.ground_truth_name}\`)\n`;
        if (data.attributes.length > 0) {
            for (const attr of data.attributes) {
                const keyStatus = attr.type ? ` (${attr.type})` : "";
                report += `- ${attr.name}${keyStatus}\n`;
            }
        } else {
            report += "- *No attributes found.*\n";
        }
        report += "\n";
    }

    report += "\n### Relationships\n\n";
    for (const rel of relationships) {
        report += `- \`${rel.source}\` **${rel.cardinality}** -- (${rel.name}) -- \`${rel.target}\`\n`;
    }

    report += "\n---";

    report += `\n\n## Excel-Friendly Summary\n\n`;
    report += `55 fields: ${fieldMarks} / 55\n`;
    report += `40 relationship parts: ${relationshipMarks} / 40\n`;
    report += `21 keys: ${keyMarks} / 21\n`;
    report += `Total: ${maxRawScore}\n`; // Changed to show maxRawScore
    report += `Scaled Score (out of 40): ${scaledScore.toFixed(2)}\n`;
    report += `Percentage: ${percentage.toFixed(1)}%\n`;
    report += `\n`; // Add an extra newline for separation
    report += `55\n`;
    report += `40\n`;
    report += `21\n`;

    return report;
}

export function gradeErd(xmlContent: string): { report: string; score: number } {
    const mxGraphModel = extractMxGraphModel(xmlContent);

    if (mxGraphModel !== null) {
        const { entities, relationships } = parseErdElements(mxGraphModel);

        console.log("\n--- DEBUG: EXTRACTED ELEMENTS ---");
        console.log(`Entities Found: ${Object.keys(entities).length}`);
        console.log(`Relationships Found: ${relationships.length}`);

        for (const data of Object.values(entities)) {
            const pkCount = data.attributes.filter(attr => attr.is_pk).length;
            const fkCount = data.attributes.filter(attr => attr.is_fk).length;
            console.log(
                `  - Entity: ${data.name} (Attributes: ${data.attributes.length}, PKs: ${pkCount}, FKs: ${fkCount})`
            );
            for (const attr of data.attributes) {
                if (attr.type) {
                    console.log(`    -> ${attr.name} (${attr.type})`);
                }
            }
        }
        console.log("----------------------------------\n");

        const { rawScore, scaledScore, percentage, MAX_RAW_SCORE, feedbackPoints, missingEntities, fieldMarks, keyMarks, relationshipMarks } = calculateScore(entities, relationships);
        const reportContent = generateReport(entities, relationships, rawScore, scaledScore, percentage, MAX_RAW_SCORE, feedbackPoints, missingEntities, fieldMarks, keyMarks, relationshipMarks);

        console.log(reportContent);
        console.log(`\nFinal Score: ${scaledScore.toFixed(2)}/40 (${percentage.toFixed(1)}%)`);
        console.log(`55`);
        console.log(`40`);
        console.log(`21`);
        return { report: reportContent, score: scaledScore };
    } else {
        console.error("GRADING FAILED: The diagram file could not be parsed.");
        return { report: "GRADING FAILED: The diagram file could not be parsed. Please ensure it's a valid draw.io XML file.", score: 0 };
    }
}