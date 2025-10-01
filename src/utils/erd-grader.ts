import { inflate } from 'pako';

// --- Constants for Expected Structure ---
const EXPECTED_ENTITY_NAMES_GROUND_TRUTH = new Set([
    "CUSTOMER", "PAYMENT", "LU_COLOUR", "SALE", "SALESPERSON",
    "CAR", "ORDERS", "ORDERSPRODUCT", "PRODUCT", "SUPPLIER"
]);

// Define the full expected structure including all attributes
const EXPECTED_STRUCTURE_FULL: { [key: string]: { pk: string[]; fk: string[]; allAttributes: string[] } } = {
    "CUSTOMER": { "pk": ["CustomerID"], "fk": [], "allAttributes": ["CustomerID", "FirstName", "FamilyName", "Gender", "Address1", "Address2", "Address3"] },
    "PAYMENT": { "pk": ["PaymentInvoiceID"], "fk": ["CustomerID", "InvoiceID"], "allAttributes": ["PaymentInvoiceID", "CustomerID", "InvoiceID", "PaymentDate", "Amount"] },
    "LU_COLOUR": { "pk": ["ColourID"], "fk": [], "allAttributes": ["ColourID", "ColourName"] },
    "SALE": { "pk": ["InvoiceID"], "fk": ["CustomerID", "SalespersonID", "RegistrationID"], "allAttributes": ["InvoiceID", "SalesPersonID", "CustomerID", "RegistrationID", "DateSold", "Price"] },
    "SALESPERSON": { "pk": ["SalespersonID"], "fk": [], "allAttributes": ["SalespersonID", "FirstName", "FamilyName", "StartDate", "Phone"] },
    "CAR": { "pk": ["RegistrationID"], "fk": ["ColourID"], "allAttributes": ["RegistrationID", "ColourID", "Make", "Model", "CarYear", "Price", "Kilometres", "NumOwners"] },
    "ORDERS": { "pk": ["OrderID"], "fk": ["SupplierID", "SalespersonID"], "allAttributes": ["OrderID", "SupplierID", "SalespersonID", "OrderDate", "Total"] },
    "ORDERSPRODUCT": { "pk": ["OrderID", "ProductID"], "fk": ["OrderID", "ProductID"], "allAttributes": ["OrderID", "ProductID", "Quantity", "SubTotal"] },
    "PRODUCT": { "pk": ["ProductID"], "fk": [], "allAttributes": ["ProductID", "Make", "Model", "ProductYear", "Price"] },
    "SUPPLIER": { "pk": ["SupplierID"], "fk": [], "allAttributes": ["SupplierID", "SupplierName", "Address1", "Address2", "Address3", "ContactPerson", "Phone"] }
};

// Calculate EXPECTED_FIELDS dynamically from EXPECTED_STRUCTURE_FULL
const EXPECTED_FIELDS = Object.values(EXPECTED_STRUCTURE_FULL).reduce((sum, s) => sum + s.allAttributes.length, 0); // Should be 54

// Update EXPECTED_STRUCTURE to be used for PK/FK checks (it was already correct for PK/FKs)
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

// Keep EXPECTED_RELATIONSHIPS as the ground truth, assuming the user's diagram might be incorrect for LU_COLOUR_CAR
const EXPECTED_RELATIONSHIPS: { [key: string]: [string, string] } = {
    "CUSTOMER_PAYMENT": ["1", "0..N"],
    "CUSTOMER_SALE": ["1", "0..N"],
    "PAYMENT_SALE": ["0..N", "1"],
    "SALE_CAR": ["1", "0..N"],
    "SALE_SALESPERSON": ["0..N", "1"],
    "LU_COLOUR_CAR": ["1", "0..N"], // LU_COLOUR (1) -> CAR (0..N) is the ground truth
    "SUPPLIER_ORDERS": ["1", "0..N"],
    "SALESPERSON_ORDERS": ["1", "0..N"],
    "ORDERS_ORDERSPRODUCT": ["1", "0..N"],
    "PRODUCT_ORDERSPRODUCT": ["1", "0..N"]
};

// This set now only contains key indicators, not entity names.
const KEY_INDICATOR_VALUES = new Set(["PK", "FK", "PK, FK", "PK,FK1", "PK,FK2"]);

// --- Type Definitions ---
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

// --- Utility Functions ---

function base64DecodeAndZlibDecompress(compressedData: string): string | null {
    const cleanedData = compressedData.replace(/ /g, '+').replace(/&#xa;/g, '').replace(/\n/g, '').trim();
    const paddingNeeded = cleanedData.length % 4;
    const paddedData = paddingNeeded ? cleanedData + '='.repeat(4 - paddingNeeded) : cleanedData;

    try {
        const decodedData = atob(paddedData);
        const charData = decodedData.split('').map(c => c.charCodeAt(0));
        const binData = new Uint8Array(charData);

        for (const wbits of [15, -15, 31]) {
            try {
                const decompressed = inflate(binData, { raw: wbits === -15, windowBits: wbits });
                return new TextDecoder().decode(decompressed);
            } catch (e) {
                console.warn(`Decompression with wbits=${wbits} failed:`, e);
            }
        }
        console.error("All zlib decompression attempts failed.");
        return null;
    } catch (e) {
        console.error("Base64 decode or initial zlib decompress setup failed:", e);
        return null;
    }
}

function extractMxGraphModel(xmlContent: string): Element | null {
    const parser = new DOMParser();
    let doc: Document;
    try {
        doc = parser.parseFromString(xmlContent, "text/xml");
        console.log("DEBUG: XML parsed successfully.");
    } catch (e) {
        console.error("FATAL ERROR: Could not parse XML content.", e);
        return null;
    }

    const diagram = doc.querySelector('diagram');
    if (diagram) {
        console.log("DEBUG: 'diagram' element found.");
        const mxModelDirect = diagram.querySelector('mxGraphModel');
        if (mxModelDirect) {
            console.log("DEBUG: 'mxGraphModel' found directly within 'diagram'.");
            console.log("DEBUG: mxGraphModel outerHTML (first 500 chars):", mxModelDirect.outerHTML.substring(0, 500));

            const testCell = mxModelDirect.querySelector('mxCell[id="2"]');
            if (testCell) {
                const testValue = testCell.getAttribute('value');
                console.log(`DEBUG: Test cell ID '2' value: '${testValue}'`);
            } else {
                console.log("DEBUG: Test cell ID '2' not found.");
            }

            return mxModelDirect;
        } else {
            console.log("DEBUG: 'mxGraphModel' NOT found directly within 'diagram'. Checking for compressed data.");
            const compressedData = diagram.textContent?.trim();
            if (compressedData) {
                console.log("DEBUG: Compressed data found. Attempting decompression.");
                try {
                    const unquotedData = decodeURIComponent(compressedData);
                    const decompressedXmlString = base64DecodeAndZlibDecompress(unquotedData);
                    if (decompressedXmlString) {
                        console.log("DEBUG: Decompression successful. Parsing decompressed XML.");
                        const decompressedDoc = parser.parseFromString(decompressedXmlString, "text/xml");
                        const mxModel = decompressedDoc.querySelector('mxGraphModel');
                        if (mxModel) {
                            console.log("DEBUG: 'mxGraphModel' found in decompressed XML.");
                            return mxModel;
                        } else {
                            console.error("DEBUG: Decompressed XML does not contain mxGraphModel.");
                        }
                    } else {
                        console.error("DEBUG: Failed to decompress diagram data.");
                    }
                } catch (e) {
                    console.error("DEBUG: Error processing compressed diagram data:", e);
                }
            } else {
                console.error("DEBUG: Diagram element found, but no compressed data (textContent) or direct mxGraphModel.");
            }
        }
    } else {
        console.error("DEBUG: No 'diagram' element found in the XML content.");
    }
    return null;
}

function stripHtmlTags(htmlString: string): string {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    return doc.body.textContent || "";
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
    // Strip HTML tags before processing
    const cleanedFoundName = stripHtmlTags(foundName);
    const foundNormalized = normalizeName(cleanedFoundName);

    for (const expected of EXPECTED_ENTITY_NAMES_GROUND_TRUTH) {
        const expectedNormalized = normalizeName(expected);
        if (foundNormalized === expectedNormalized) {
            return expected;
        }
    }

    // Handle pluralization for entity names
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

    const spellingVariations: { [key: string]: string } = {
        'COLOR': 'COLOUR', 'COLOUR': 'COLOUR',
        'LUCOLOR': 'LUCOLOUR', 'LUCOLOUR': 'LUCOLOUR',
    };

    if (foundNormalized in spellingVariations) {
        const target = spellingVariations[foundNormalized];
        for (const expected of EXPECTED_ENTITY_NAMES_GROUND_TRUTH) {
            if (normalizeName(expected) === normalizeName(target)) {
                return expected;
            }
        }
    }

    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const expected of EXPECTED_ENTITY_NAMES_GROUND_TRUTH) {
        const expectedNormalized = normalizeName(expected);
        // Allow for some length difference, but not too much
        if (Math.abs(foundNormalized.length - expectedNormalized.length) > 3) {
            continue;
        }

        const distance = levenshteinDistance(foundNormalized, expectedNormalized);
        // Max distance should be relative to the length of the expected name
        const maxDistance = Math.min(2, Math.floor(expectedNormalized.length / 3));

        if (distance < bestDistance && distance <= maxDistance) {
            bestDistance = distance;
            bestMatch = expected;
        }
    }
    console.log(`DEBUG: fuzzyMatchAttribute: No exact/common match, best fuzzy match: '${bestMatch}' (distance: ${bestDistance})`);
    return bestMatch;
}

function fuzzyMatchAttribute(foundAttr: string, expectedAttrs: string[]): string | null {
    const cleanedFoundAttr = stripHtmlTags(foundAttr);
    const foundNormalized = normalizeName(cleanedFoundAttr);

    console.log(`DEBUG: fuzzyMatchAttribute: foundAttr='${foundAttr}' (normalized='${foundNormalized}'), expectedAttrs=[${expectedAttrs.map(normalizeName).join(', ')}]`);

    for (const expected of expectedAttrs) {
        const expectedNormalized = normalizeName(expected);
        if (foundNormalized === expectedNormalized) {
            console.log(`DEBUG: fuzzyMatchAttribute: Exact normalized match found: '${expected}'`);
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
                console.log(`DEBUG: fuzzyMatchAttribute: Common variation match found: '${expected}'`);
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
    console.log(`DEBUG: fuzzyMatchAttribute: No exact/common match, best fuzzy match: '${bestMatch}' (distance: ${bestDistance})`);
    return bestMatch;
}

// Helper to collect all cells and their parent relationships
function collectAllCellsAndParents(rootElement: Element): { allCells: { [id: string]: Element }, parentMap: { [id: string]: string } } {
    const allCells: { [id: string]: Element } = {};
    const parentMap: { [id: string]: string } = {};

    rootElement.querySelectorAll('mxCell').forEach(cell => {
        const cellId = cell.getAttribute('id');
        if (cellId) {
            allCells[cellId] = cell;
            const parentId = cell.getAttribute('parent');
            if (parentId) {
                parentMap[cellId] = parentId;
            }
        }
    });
    return { allCells, parentMap };
}

// Helper to identify entities (swimlanes)
function identifyEntities(rootElement: Element): { [id: string]: ParsedEntity } {
    const entities: { [id: string]: ParsedEntity } = {};
    const graphRootId = rootElement.querySelector('mxCell[id="1"]')?.getAttribute('id'); // Assuming '1' is the main graph root

    rootElement.querySelectorAll('mxCell').forEach(cell => {
        const cellId = cell.getAttribute('id');
        if (!cellId) return;

        const parentId = cell.getAttribute('parent');
        const style = cell.getAttribute('style') || '';
        let cellValue = cell.getAttribute('value')?.trim() || '';

        // An entity container should typically be a direct child of the main graph root (id="1")
        // and have a style indicating it's a table/swimlane.
        const isTopLevelEntityContainer = (parentId === graphRootId || parentId === '1') &&
                                         (style.toLowerCase().includes('swimlane') || style.toLowerCase().includes('shape=table'));

        if (isTopLevelEntityContainer) {
            console.log(`DEBUG: Found TOP-LEVEL entity container. ID: ${cellId}, Initial Value: '${cellValue}', Style: '${style}'`);

            let entityName = cellValue;

            // If the container itself has no value, or a generic value, look for a child cell that might be the name
            if (!entityName || entityName.toLowerCase().includes('table')) {
                const childCells = Array.from(rootElement.querySelectorAll(`mxCell[parent="${cellId}"]`));
                // Sort children by y-position to find the "header" cell first
                childCells.sort((a, b) => {
                    const geomA = a.querySelector('mxGeometry');
                    const geomB = b.querySelector('mxGeometry');
                    const yA = parseFloat(geomA?.getAttribute('y') || '0');
                    const yB = parseFloat(geomB?.getAttribute('y') || '0');
                    return yA - yB;
                });

                const nameCell = childCells.find(child => {
                    const childValue = child.getAttribute('value')?.trim();
                    const childStyle = child.getAttribute('style') || '';
                    // Heuristic: a non-empty value, not a key indicator, not a tableRow style, not a connector.
                    // isSimilarName is now only used for entity name matching, not for filtering attributes here.
                    return childValue && childValue.length > 0 && !KEY_INDICATOR_VALUES.has(stripHtmlTags(childValue).toUpperCase()) && !childStyle.includes('tableRow') && !childStyle.includes('edge=1');
                });
                if (nameCell) {
                    entityName = nameCell.getAttribute('value')?.trim() || '';
                    console.log(`DEBUG: Found entity name in child cell: '${entityName}' for parent ID: ${cellId}`);
                }
            }

            const matchedExpectedName = isSimilarName(entityName);
            if (matchedExpectedName) {
                entities[cellId] = {
                    name: stripHtmlTags(entityName), // Store cleaned name
                    ground_truth_name: matchedExpectedName,
                    attributes: [],
                    id: cellId
                };
                console.log(`DEBUG: Identified entity: ${stripHtmlTags(entityName)} (ID: ${cellId}, GT: ${matchedExpectedName})`);
            } else {
                console.log(`DEBUG: Found entity container '${stripHtmlTags(entityName)}' (ID: ${cellId}) but no similar ground truth name. Value: '${entityName}'`);
            }
        } else {
            // console.log(`DEBUG: Skipping non-top-level or non-entity container cell. ID: ${cellId}, Parent: ${parentId}, Value: '${cellValue}', Style: '${style.substring(0, 50)}...'`);
        }
    });
    return entities;
}

// Helper to process and push an attribute with its collected key indicators
function processAndPushAttribute(
    entityData: ParsedEntity,
    attributeCell: { id: string; value: string; y: number; x: number; style: string },
    keyIndicators: { id: string; value: string; y: number; x: number; style: string }[],
    expectedPks: string[],
    expectedFks: string[]
) {
    let isPk = false;
    let isFk = false;
    const attributeName = stripHtmlTags(attributeCell.value);
    const matchedExpectedAttribute = fuzzyMatchAttribute(attributeName, EXPECTED_STRUCTURE_FULL[entityData.ground_truth_name].allAttributes);

    if (!matchedExpectedAttribute) {
        console.log(`DEBUG:       Skipping attribute '${attributeName}' as it's not an expected attribute for entity '${entityData.name}'.`);
        return;
    }

    for (const keyCell of keyIndicators) {
        const upperKey = stripHtmlTags(keyCell.value).toUpperCase();
        if (upperKey.includes('PK')) isPk = true;
        if (upperKey.includes('FK')) isFk = true;
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
        name: matchedExpectedAttribute,
        type: typeStr,
        is_pk: isPk,
        is_fk: isFk
    });
    console.log(`DEBUG: Pushed attribute: ${matchedExpectedAttribute} (Type: ${typeStr}, is_pk: ${isPk}, is_fk: ${isFk}) to ${entityData.name}`);
}


// Helper to parse attributes for a single entity
function parseEntityAttributes(
    entityId: string,
    entityData: ParsedEntity,
    allCells: { [id: string]: Element },
    parentMap: { [id: string]: string }
): void {
    console.log(`DEBUG: parseEntityAttributes for entity: ${entityData.name} (ID: ${entityId})`);
    const entityGtName = entityData.ground_truth_name;
    const expectedPks = EXPECTED_STRUCTURE[entityGtName]?.pk || [];
    const expectedFks = EXPECTED_STRUCTURE[entityGtName]?.fk || [];

    const attributeCandidates: { id: string; value: string; y: number; x: number; style: string }[] = [];
    for (const cellId in allCells) {
        const cell = allCells[cellId];
        const parentOfCell = parentMap[cellId];

        let isChildOfEntity = false;
        let currentParentId: string | undefined = parentOfCell;
        let depth = 0;
        while (currentParentId && depth < 5) {
            if (currentParentId === entityId) {
                isChildOfEntity = true;
                break;
            }
            currentParentId = parentMap[currentParentId];
            depth++;
        }

        if (isChildOfEntity && cellId !== entityId) {
            const value = cell.getAttribute('value')?.trim() || '';
            const style = cell.getAttribute('style') || '';
            const geometry = cell.querySelector('mxGeometry');
            const yPos = parseFloat(geometry?.getAttribute('y') || '0');
            const xPos = parseFloat(geometry?.getAttribute('x') || '0');

            // Only skip tableRow containers, allow empty values for potential key indicators
            if (style.includes('tableRow')) {
                continue;
            }

            attributeCandidates.push({
                id: cellId,
                value: value,
                y: yPos,
                x: xPos,
                style: style
            });
        }
    }

    // Add the debug log here to see all candidates before grouping
    console.log(`DEBUG:   Raw attribute candidates for ${entityData.name} (before sorting/grouping):`);
    attributeCandidates.forEach(c => console.log(`DEBUG:     - ID: ${c.id}, Value: '${c.value}', Y: ${c.y}, X: ${c.x}, Style: '${c.style.substring(0, 50)}...'`));


    attributeCandidates.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
    });

    // Refined logic to process attributes and their associated key indicators
    let currentKeyIndicators: typeof attributeCandidates = [];
    let lastValidAttributeCell: typeof attributeCandidates[0] | null = null;

    for (const cellInfo of attributeCandidates) {
        const cleanedValue = stripHtmlTags(cellInfo.value);
        const upperCleanedValue = cleanedValue.toUpperCase();

        if (KEY_INDICATOR_VALUES.has(upperCleanedValue)) {
            // This is a key indicator cell (e.g., "PK", "FK")
            currentKeyIndicators.push(cellInfo);
        } else if (cleanedValue.length > 0) {
            // This is a non-empty, non-key-indicator cell, so it's an attribute name.
            // Process the previous valid attribute (if any) with the keys collected so far.
            if (lastValidAttributeCell) {
                processAndPushAttribute(entityData, lastValidAttributeCell, currentKeyIndicators, expectedPks, expectedFks);
                currentKeyIndicators = []; // Reset keys after processing an attribute
            }
            lastValidAttributeCell = cellInfo; // Set the new attribute
        }
        // If it's an empty cell and not a key indicator, we simply ignore it for attribute processing.
    }

    // Process the very last attribute if there's one pending after the loop finishes
    if (lastValidAttributeCell) {
        processAndPushAttribute(entityData, lastValidAttributeCell, currentKeyIndicators, expectedPks, expectedFks);
    }
}

// Helper to identify relationships
function identifyRelationships(
    rootElement: Element,
    entities: { [id: string]: ParsedEntity },
    parentMap: { [id: string]: string }
): ParsedRelationship[] {
    const relationships: ParsedRelationship[] = [];
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

    rootElement.querySelectorAll("mxCell[edge='1']").forEach(cell => {
        const style = cell.getAttribute('style') || '';
        const sourceId = cell.getAttribute('source');
        const targetId = cell.getAttribute('target');
        const relName = stripHtmlTags(cell.getAttribute('value')?.trim() || '...'); // Strip HTML from relationship name

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
                            style.includes('startArrow=ERoneToMany') ? '1..N' :
                            '?';
            const endCard = style.includes('endArrow=ERmandOne') ? '1' :
                          (style.includes('endArrow=ERzeroToMany') || style.includes('endArrow=ERoneToMany')) ? '0..N' :
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
            console.log(`DEBUG: Identified relationship: ${entities[sourceEntityId].name} -> ${entities[targetEntityId].name} (Card: ${cardinality})`);
        }
    });
    return relationships;
}

// --- Main Parsing Function ---
function parseErdElements(mxGraphModel: Element): { entities: { [id: string]: ParsedEntity }, relationships: ParsedRelationship[] } {
    console.log("DEBUG: Entering parseErdElements");
    if (!mxGraphModel) {
        console.error("DEBUG: mxGraphModel is null or undefined in parseErdElements.");
        return { entities: {}, relationships: [] };
    }
    console.log("DEBUG: mxGraphModel received:", mxGraphModel.tagName);

    const rootElement = mxGraphModel.querySelector('root');
    if (!rootElement) {
        console.error("DEBUG: No 'root' element found within mxGraphModel. Cannot parse cells.");
        return { entities: {}, relationships: [] };
    }
    console.log("DEBUG: 'root' element found.");

    const { allCells, parentMap } = collectAllCellsAndParents(rootElement);
    console.log(`DEBUG: Total mxCells processed: ${Object.keys(allCells).length}`);

    const entities = identifyEntities(rootElement);
    console.log(`DEBUG: Entities identified after Pass 1: ${Object.keys(entities).length}`);

    console.log("DEBUG: Starting Pass 2: Processing attributes.");
    Object.keys(entities).forEach(entityId => {
        const entityData = entities[entityId];
        if (!entityData) {
            console.warn(`DEBUG: Entity data not found for ID: ${entityId}`);
            return;
        }
        console.log(`DEBUG: Processing attributes for entity: ${entityData.name} (ID: ${entityId})`);
        parseEntityAttributes(entityId, entityData, allCells, parentMap);
    });
    console.log(`DEBUG: Attributes processed for all entities.`);

    console.log("DEBUG: Starting Pass 3: Finding relationships.");
    const relationships = identifyRelationships(rootElement, entities, parentMap);
    console.log(`DEBUG: Relationships identified after Pass 3: ${relationships.length}`);

    return { entities, relationships };
}

// --- Scoring and Reporting Functions ---

function calculateScore(entities: { [id: string]: ParsedEntity }, relationships: ParsedRelationship[]): ScoreDetails {
    const MAX_RAW_SCORE_BASE = 40; // Base for relationships
    let currentScore = 0;
    const feedbackPoints: GradingFeedback = {
        Fields: [],
        Keys: [],
        Relationships: [],
        Relationship_Details: []
    };

    const entityGroundTruthNamesFound = new Set(Object.values(entities).map(data => data.ground_truth_name));
    const missingEntities = new Set(Array.from(EXPECTED_ENTITY_NAMES_GROUND_TRUTH).filter(e => !entityGroundTruthNamesFound.has(e)));

    // 1. Fields (dynamically calculated marks)
    const allAttributesCount = Object.values(entities).reduce((sum, data) => sum + data.attributes.length, 0);
    const fieldMarks = Math.min(EXPECTED_FIELDS, allAttributesCount);
    currentScore += fieldMarks;
    feedbackPoints.Fields.push(
        `Found ${allAttributesCount}/${EXPECTED_FIELDS} fields. Awarded ${fieldMarks}/${EXPECTED_FIELDS} marks.`);

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
            console.log(`DEBUG: calculateScore processing attr: ${attr.name}, is_pk: ${attr.is_pk}, is_fk: ${attr.is_fk}`);
            console.log(`DEBUG:   expectedPks for ${gtName}: [${expectedPks.join(', ')}]`);
            console.log(`DEBUG:   expectedFks for ${gtName}: [${expectedFks.join(', ')}]`);

            // Check if the attribute is marked as PK and is an expected PK for this entity
            const isExpectedPk = fuzzyMatchAttribute(attr.name, expectedPks) !== null;
            if (attr.is_pk && isExpectedPk) {
                correctPks++;
                console.log(`DEBUG:   Incremented correctPks for ${attr.name}`);
            } else if (attr.is_pk && !isExpectedPk) {
                console.log(`DEBUG:   PK mismatch: ${attr.name} is_pk=true but not expected PK for ${gtName}`);
            }


            // Check if the attribute is marked as FK and is an expected FK for this entity
            const isExpectedFk = fuzzyMatchAttribute(attr.name, expectedFks) !== null;
            if (attr.is_fk && isExpectedFk) {
                correctFks++;
                console.log(`DEBUG:   Incremented correctFks for ${attr.name}`);
            } else if (attr.is_fk && !isExpectedFk) {
                console.log(`DEBUG:   FK mismatch: ${attr.name} is_fk=true but not expected FK for ${gtName}`);
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

        console.log(`DEBUG: Processing relationship: ${sourceGt} (${rel.start_card}) -> ${targetGt} (${rel.end_card})`); // New line

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
            console.log(`DEBUG:   Relationship match found for ${relKey} (reversed: ${isReversed}).`);
            connectionMarks += 2;
            console.log(`DEBUG:     Connection marks: ${connectionMarks}`);
            console.log(`DEBUG:     Raw expectedCard from ground truth: [${expectedCard[0]}, ${expectedCard[1]}]`); // Add this line

            const [expectedSourceCard, expectedTargetCard] = isReversed ? [expectedCard[1], expectedCard[0]] : [expectedCard[0], expectedCard[1]];
            console.log(`DEBUG:     Parsed: (${rel.start_card}):(${rel.end_card}), Expected (adjusted for direction): (${expectedSourceCard}):(${expectedTargetCard})`); // Clarify log

            const correctSource = rel.start_card === expectedSourceCard;
            const correctTarget = rel.end_card === expectedTargetCard;

            console.log(`DEBUG:       Comparing Source: Parsed='${rel.start_card}', Expected='${expectedSourceCard}', Correct=${correctSource}`); // New line
            console.log(`DEBUG:       Comparing Target: Parsed='${rel.end_card}', Expected='${expectedTargetCard}', Correct=${correctTarget}`); // New line

            if (correctSource) {
                sourceCardinalityMarks += 1;
                console.log(`DEBUG:     Source cardinality correct. Source marks: ${sourceCardinalityMarks}`);
            } else {
                console.log(`DEBUG:     Source cardinality INCORRECT. Parsed: ${rel.start_card}, Expected: ${expectedSourceCard}`);
            }
            if (correctTarget) {
                targetCardinalityMarks += 1;
                console.log(`DEBUG:     Target cardinality correct. Target marks: ${targetCardinalityMarks}`);
            } else {
                console.log(`DEBUG:     Target cardinality INCORRECT. Parsed: ${rel.end_card}, Expected: ${expectedTargetCard}`);
            }

            matchedRelationships.push({
                rel: rel,
                expected: [expectedSourceCard, expectedTargetCard],
                correct_source: correctSource,
                correct_target: correctTarget
            });
        } else {
            console.log(`DEBUG:   No expected relationship found for ${relKey} or ${relKeyReverse}.`);
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

    // Adjust MAX_RAW_SCORE based on the new EXPECTED_FIELDS
    const newMaxRawScore = EXPECTED_FIELDS + totalExpectedPks + totalExpectedFks + MAX_RAW_SCORE_BASE;
    
    const rawScore = currentScore;
    const scaledScore = (currentScore / newMaxRawScore) * 40;
    const percentage = (currentScore / newMaxRawScore) * 100;

    return { rawScore, scaledScore, percentage, MAX_RAW_SCORE: newMaxRawScore, feedbackPoints, missingEntities: Array.from(missingEntities), fieldMarks, keyMarks, relationshipMarks };
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
    report += `${EXPECTED_FIELDS} fields: ${fieldMarks} / ${EXPECTED_FIELDS}\n`;
    report += `40 relationship parts: ${relationshipMarks} / 40\n`;
    report += `21 keys: ${keyMarks} / 21\n`;
    report += `Total: ${maxRawScore}\n`;
    report += `Scaled Score (out of 40): ${scaledScore.toFixed(2)}\n`;
    report += `Percentage: ${percentage.toFixed(1)}%\n`;
    report += `\n`;
    report += `${fieldMarks}\n`; // Changed from EXPECTED_FIELDS
    report += `${relationshipMarks}\n`; // Changed from 40
    report += `${keyMarks}\n`; // Changed from 21

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
                } else {
                    console.log(`    -> ${attr.name}`); // Log non-key attributes too
                }
            }
        }
        console.log("----------------------------------\n");

        const { rawScore, scaledScore, percentage, MAX_RAW_SCORE, feedbackPoints, missingEntities, fieldMarks, keyMarks, relationshipMarks } = calculateScore(entities, relationships);
        const reportContent = generateReport(entities, relationships, rawScore, scaledScore, percentage, MAX_RAW_SCORE, feedbackPoints, missingEntities, fieldMarks, keyMarks, relationshipMarks);

        console.log(reportContent);
        console.log(`\nFinal Score: ${scaledScore.toFixed(2)}/40 (%.toFixed(1)}%)`);
        console.log(`${fieldMarks}`); // Changed from EXPECTED_FIELDS
        console.log(`${relationshipMarks}`); // Changed from 40
        console.log(`${keyMarks}`); // Changed from 21
        return { report: reportContent, score: scaledScore };
    } else {
        console.error("GRADING FAILED: The diagram file could not be parsed.");
        return { report: "GRADING FAILED: The diagram file could not be parsed. Please ensure it's a valid draw.io XML file.", score: 0 };
    }
}