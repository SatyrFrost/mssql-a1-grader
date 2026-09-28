// Interface for column details
interface ColumnDefinition {
  name: string;
  dataType: string;
  isIdentity: boolean;
  isPrimaryKey: boolean;
  isNullable: boolean;
}

interface CreateTableStatement {
  tableName: string;
  definitionContent: string;
  columns: ColumnDefinition[];
  startIndex: number;
  endIndex: number;
}

interface InsertStatement {
  tableName: string;
  columnsSpecified: string[] | null;
  values: string[][];
  isSelectInsert: boolean;
  startIndex: number;
  endIndex: number;
}

const getCanonicalTableName = (rawName: string): string | null => {
  const canonicalMap: { [key: string]: string } = {
    "LU_Colour": "Colour", "Colour": "Colour", "Colors": "Colour", "Colours": "Colour", "Color": "Colour",
    "Customer": "Customer", "Customers": "Customer", "customer": "Customer", "customers": "Customer",
    "Salesperson": "Salesperson", "Salespersons": "Salesperson", "saleperson": "Salesperson", "salepersons": "Salesperson",
    "Car": "Car", "Cars": "Car", "car": "Car", "cars": "Car",
    "Sale": "Sale", "Sales": "Sale", "sale": "Sale", "sales": "Sale",
    "Payment": "Payment", "Payments": "Payment", "payment": "Payment",
    "Supplier": "Supplier", "Suppliers": "Supplier", "supplier": "Supplier", "suppliers": "Supplier",
    "Product": "Product", "Products": "Product", "ProducA": "Product", "Produc": "Product", "product": "Product", "products": "Product",
    "Orders": "Orders", "Order": "Orders", "order": "Orders", "orders": "Orders",
    "OrdersProduct": "OrdersProduct", "OrdersProducts": "OrdersProduct", "orderproduct": "OrdersProduct", "OrderProduct": "OrdersProduct", "OrderProducts": "OrdersProduct", "ordersproduct": "OrdersProduct"
  };
  for (const key in canonicalMap) {
    if (rawName.toLowerCase() === key.toLowerCase()) {
      return canonicalMap[key];
    }
  }
  return null;
};

const getCanonicalColumnName = (rawColName: string): string => {
  const lowerCaseName = rawColName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lowerCaseName === "registrationid" || lowerCaseName === "carid") {
    return "registrationid";
  }
  return lowerCaseName;
};

const getFuzzyBaseTableNamePattern = (baseName: string): string => {
  switch (baseName) {
    case "Colour":
      return "Colou?r";
    case "Customer":
      return "Customer";
    case "Salesperson":
      return "Salesperson";
    case "Car":
      return "Car";
    case "Sale":
      return "Sale";
    case "Payment":
      return "Payment";
    case "Supplier":
      return "Supplier";
    case "Product":
      return "Product";
    case "Orders":
      return "Order";
    case "OrdersProduct":
      return "OrdersProduct";
    default:
      return baseName;
  }
};

const getFullTableNameRegexPattern = (baseName: string): string => {
  const fuzzyBaseName = getFuzzyBaseTableNamePattern(baseName);
  const pluralSuffix = "(?:s)?";
  const coreName = `(?:LU_)?${fuzzyBaseName}${pluralSuffix}`;
  const unquotedIdentifier = `\\b${coreName}\\b`;
  const bracketQuotedIdentifier = `\\[${coreName}\\]`;
  const doubleQuotedIdentifier = `"${coreName}"`;
  const tableNameIdentifier = `(?:${unquotedIdentifier}|${bracketQuotedIdentifier}|${doubleQuotedIdentifier})`;
  const schemaIdentifier = `(?:\\w+|"[^"]+"|\[[^\]]+\])`;
  const optionalSchemaPrefix = `(?:${schemaIdentifier}\\s*\\.\\s*)?`;
  return `${optionalSchemaPrefix}${tableNameIdentifier}`;
};

const getForeignKeyReferenceCaptureRegex = () => {
  const identifier = `(?:\\w+|"[^"]+"|\[[^\]]+\])`;
  const optionalSchemaPrefix = `(?:(${identifier})\\s*\\.\\s*)?`;
  const tableNameCapture = `(${identifier})`;
  const pattern1 = `\\bFOREIGN\\s+KEY(?:\\s*\\([^)]+\\))?\\s+REFERENCES\\s+${optionalSchemaPrefix}${tableNameCapture}\\s*\\(\\s*[^)]+\\s*\\)`;
  const pattern2 = `\\bREFERENCES\\s+${optionalSchemaPrefix}${tableNameCapture}\\s*\\(\\s*[^)]+\\s*\\)`;
  return new RegExp(`(?:${pattern1}|${pattern2})`, 'gi');
};

const extractReferencedTableNameFromMatch = (fkMatchArray: RegExpExecArray): string | null => {
  const rawReferencedTableName = (fkMatchArray[4] || fkMatchArray[3] || fkMatchArray[2])?.replace(/["\[\]]/g, '');
  if (rawReferencedTableName) {
    return getCanonicalTableName(rawReferencedTableName);
  }
  return null;
};

const getForeignKeyRegex = (referencedTableName: string) => {
  const fullRefTableNamePattern = getFullTableNameRegexPattern(referencedTableName);
  const identifier = `(?:\\w+|"[^"]+"|\[[^\]]+\])`;
  const optionalSchemaPrefix = `(?:${identifier}\\s*\\.\\s*)?`;
  const tableNameMatchPattern = `(?:${optionalSchemaPrefix}${fullRefTableNamePattern})`;
  const pattern1 = `\\bFOREIGN\\s+KEY(?:\\s*\\([^)]+\\))?\\s+REFERENCES\\s+${tableNameMatchPattern}\\s*\\(\\s*[^)]+\\s*\\)`;
  const pattern2 = `\\bREFERENCES\\s+${tableNameMatchPattern}\\s*\\(\\s*[^)]+\\s*\\)`;
  return new RegExp(`(?:${pattern1}|${pattern2})`, 'i');
};

const staticFkRefCaptureRegex = getForeignKeyReferenceCaptureRegex();
const canonicalTableNames = ["Colour", "Customer", "Salesperson", "Car", "Sale", "Payment", "Supplier", "Product", "Orders", "OrdersProduct"];

const precomputedFkRegexes: { [key: string]: RegExp } = {};
for (const name of canonicalTableNames) {
  precomputedFkRegexes[name] = getForeignKeyRegex(name);
}

const parseCreateTableStatements = (sql: string): CreateTableStatement[] => {
  const statements: CreateTableStatement[] = [];
  const createTableKeyword = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi;

  let match;
  while ((match = createTableKeyword.exec(sql)) !== null) {
    const startOfStatement = match.index;
    const createTableKeywordEnd = match.index + match[0].length;
    let cursor = createTableKeywordEnd;

    while (cursor < sql.length && /\s/.test(sql[cursor])) {
      cursor++;
    }

    const identifierRegex = /^((?:\w+|"[^"]+"|\[[^\]]+\])\s*\.\s*)?(\w+|"[^"]+"|\[[^\]]+\])/i;
    const tableNameMatch = sql.substring(cursor).match(identifierRegex);
    if (!tableNameMatch) {
      createTableKeyword.lastIndex = startOfStatement + match[0].length;
      continue;
    }
    const fullTableNameIdentifier = tableNameMatch[0];
    const rawTableName = tableNameMatch[2].replace(/["\[\]]/g, '');

    const canonicalTableName = getCanonicalTableName(rawTableName);
    if (!canonicalTableName) {
      createTableKeyword.lastIndex = startOfStatement + match[0].length;
      continue;
    }

    cursor += fullTableNameIdentifier.length;

    while (cursor < sql.length && /\s/.test(sql[cursor])) {
      cursor++;
    }

    if (sql[cursor] !== '(') {
      createTableKeyword.lastIndex = startOfStatement + match[0].length;
      continue;
    }

    let openParens = 1;
    const definitionStart = cursor + 1;
    let definitionEnd = -1;
    cursor++;

    while (cursor < sql.length && openParens > 0) {
      if (sql[cursor] === '(') {
        openParens++;
      } else if (sql[cursor] === ')') {
        openParens--;
        if (openParens === 0) {
          definitionEnd = cursor;
        }
      }
      cursor++;
    }

    if (definitionEnd !== -1) {
      let definitionContent = sql.substring(definitionStart, definitionEnd);
      const columns: ColumnDefinition[] = [];
      const originalDefinitionContent = definitionContent;

      const tableLevelPkRegex = /PRIMARY\s+KEY\s*\(\s*([^)]+)\s*\)/gi;
      let pkMatch;
      const pkColumnNames: Set<string> = new Set();

      while ((pkMatch = tableLevelPkRegex.exec(definitionContent)) !== null) {
        const colsInPk = pkMatch[1].split(',').map(c => c.trim().replace(/["\[\]]/g, ''));
        colsInPk.forEach(col => pkColumnNames.add(getCanonicalColumnName(col)));
      }

      definitionContent = definitionContent.replace(tableLevelPkRegex, '');
      const tableLevelFkRegex = /FOREIGN\s+KEY\s*\([^)]+\)\s+REFERENCES\s+(?:(?:\w+|"[^"]+"|\[[^\]]+\])\s*\.\s*)?(?:\w+|"[^"]+"|\[[^\]]+\])\s*\([^)]+\)/gi;
      definitionContent = definitionContent.replace(tableLevelFkRegex, '');

      const columnDefinitions = definitionContent.split(/,(?![^()]*\))/g);

      for (const colDefText of columnDefinitions) {
        const trimmedColDef = colDefText.trim();
        if (!trimmedColDef) continue;

        const simpleColumnRegex = /^\s*((?:\w+|"[^"]+"|\[[^\]]+\]))\s+(\w+(?:\s*\(\s*\d+(?:,\s*\d+)?\s*\))?)\s*(NOT\s+NULL)?\s*(PRIMARY\s+KEY)?\s*(IDENTITY(?:\s*\((\d+),(\d+)\))?)?/i;
        const colMatch = trimmedColDef.match(simpleColumnRegex);

        if (colMatch) {
          const [, rawName, dataType, notNull, inlinePrimaryKey, identityKeyword] = colMatch;
          const name = rawName.replace(/["\[\]]/g, '');
          columns.push({
            name: name,
            dataType: dataType.toUpperCase(),
            isIdentity: !!identityKeyword,
            isPrimaryKey: !!inlinePrimaryKey || pkColumnNames.has(getCanonicalColumnName(name)),
            isNullable: !notNull,
          });
        }
      }

      statements.push({
        tableName: canonicalTableName,
        definitionContent: originalDefinitionContent,
        columns: columns,
        startIndex: startOfStatement,
        endIndex: cursor,
      });
      createTableKeyword.lastIndex = cursor;
    } else {
      createTableKeyword.lastIndex = startOfStatement + match[0].length;
    }
  }
  return statements;
};

const parseInsertStatements = (sql: string): InsertStatement[] => {
  const statements: InsertStatement[] = [];
  const allMatches: { match: RegExpExecArray; type: 'values' | 'select' }[] = [];

  const insertValuesRegex = /\bINSERT\s+INTO\s+(?:((?:\w+|"[^"]+"|\[[^\]]+\])\s*\.\s*)?(\w+|"[^"]+"|\[[^\]]+\]))\s*(?:\(([^)]*)\))?\s*VALUES\s*(\((?:[^()]|\([^()]*\))*\)(?:\s*,\s*\((?:[^()]|\([^()]*\))*\))*)/gi;
  const insertSelectStartRegex = /\bINSERT\s+INTO\s+(?:((?:\w+|"[^"]+"|\[[^\]]+\])\s*\.\s*)?(\w+|"[^"]+"|\[[^\]]+\]))\s*(?:\(([^)]*)\))?\s*SELECT\s+/gi;

  let match;
  insertValuesRegex.lastIndex = 0;
  while ((match = insertValuesRegex.exec(sql)) !== null) {
    allMatches.push({ match, type: 'values' });
  }

  insertSelectStartRegex.lastIndex = 0;
  while ((match = insertSelectStartRegex.exec(sql)) !== null) {
    allMatches.push({ match, type: 'select' });
  }

  allMatches.sort((a, b) => a.match.index - b.match.index);

  const individualValueRegex = /(?:'(?:[^']|'')*'|"(?:[^"]|"")*"|\b\w+\s*\((?:[^()]|\([^()]*\))*\)|\b[-+]?\d+(?:\.\d+)?\b|\b\w+\b)/g;

  for (let i = 0; i < allMatches.length; i++) {
    const { match, type } = allMatches[i];
    const rawTableName = match[2]?.replace(/["\[\]]/g, '');
    const canonicalTableName = rawTableName ? getCanonicalTableName(rawTableName) : null;

    if (!canonicalTableName) {
      continue;
    }

    const columnsPart = match[3];
    const columnsSpecified = columnsPart ? columnsPart.split(',').map(c => c.trim().replace(/["\[\]]/g, '')) : null;

    let statementEnd = -1;
    const rowsOfValues: string[][] = [];
    let isSelectInsert = false;

    if (type === 'values') {
      const valuesPart = match[4];
      if (valuesPart) {
        const valueRows = valuesPart.match(/\((?:[^()]|\([^()]*\))*\)/g);
        if (valueRows) {
          for (const row of valueRows) {
            const innerValues = row.substring(1, row.length - 1);
            const parsedValues = innerValues.match(individualValueRegex);
            if (parsedValues) {
              rowsOfValues.push(parsedValues.map(v => v.trim()));
            } else {
              rowsOfValues.push([]);
            }
          }
        }
      }
      statementEnd = match.index + match[0].length;
    } else {
      isSelectInsert = true;
      let nextStatementStart = sql.length;
      for (let j = i + 1; j < allMatches.length; j++) {
        if (allMatches[j].match.index > match.index) {
          nextStatementStart = allMatches[j].match.index;
          break;
        }
      }

      const searchArea = sql.substring(match.index);
      const semicolonMatch = searchArea.match(/;/);

      if (semicolonMatch && (match.index + semicolonMatch.index + 1) <= nextStatementStart) {
        statementEnd = match.index + semicolonMatch.index + 1;
      } else {
        statementEnd = nextStatementStart;
      }
    }

    if (statementEnd !== -1) {
      statements.push({
        tableName: canonicalTableName,
        columnsSpecified: columnsSpecified,
        values: rowsOfValues,
        isSelectInsert: isSelectInsert,
        startIndex: match.index,
        endIndex: statementEnd,
      });
    }
  }
  return statements;
};

const buildFkDependencyMap = (createTableStatements: CreateTableStatement[]): Map<string, Set<string>> => {
  const dependencyMap = new Map<string, Set<string>>();

  for (const statement of createTableStatements) {
    const childTableName = statement.tableName;
    const content = statement.definitionContent;

    let fkMatch;
    staticFkRefCaptureRegex.lastIndex = 0;
    while ((fkMatch = staticFkRefCaptureRegex.exec(content)) !== null) {
      const referencedTableName = extractReferencedTableNameFromMatch(fkMatch);
      if (referencedTableName && referencedTableName !== childTableName) {
        if (!dependencyMap.has(childTableName)) {
          dependencyMap.set(childTableName, new Set<string>());
        }
        dependencyMap.get(childTableName)?.add(referencedTableName);
      }
    }
  }
  return dependencyMap;
};

export function gradeSql(sqlContent: string, fileName: string): { grade: string; feedback: string } {
  let score = 0;
  const excelFeedback: string[] = [];
  const detailedFeedback: string[] = [];
  const maxPossibleCreateTableScore = 25.0;
  const maxPossibleInsertScore = 20.0;
  const maxPossibleTotalScore = maxPossibleCreateTableScore + maxPossibleInsertScore;

  const pushMark = (mark: number, message: string) => {
    score += mark;
    excelFeedback.push(mark.toFixed(1).replace(/\.0$/, ''));
    detailedFeedback.push(message);
  };

  const createTableStatements = parseCreateTableStatements(sqlContent);
  const tableContents: { [key: string]: string | null } = {};
  const tableOrderErrors: { [key: string]: string[] } = {};

  const definedTableNamesInOrder: string[] = [];
  const tableColumnDefinitions = new Map<string, ColumnDefinition[]>();
  for (const statement of createTableStatements) {
    const currentTableName = statement.tableName;
    tableContents[currentTableName] = statement.definitionContent;
    tableColumnDefinitions.set(currentTableName, statement.columns);
    definedTableNamesInOrder.push(currentTableName);

    let fkMatch;
    staticFkRefCaptureRegex.lastIndex = 0;
    while ((fkMatch = staticFkRefCaptureRegex.exec(statement.definitionContent)) !== null) {
      const referencedTableName = extractReferencedTableNameFromMatch(fkMatch);
      if (referencedTableName && referencedTableName !== currentTableName) {
        const referencedTableIndex = definedTableNamesInOrder.indexOf(referencedTableName);
        const currentTableIndex = definedTableNamesInOrder.indexOf(currentTableName);
        if (referencedTableIndex === -1 || referencedTableIndex > currentTableIndex) {
          if (!tableOrderErrors[currentTableName]) {
            tableOrderErrors[currentTableName] = [];
          }
          if (!tableOrderErrors[currentTableName].includes(referencedTableName)) {
            tableOrderErrors[currentTableName].push(referencedTableName);
          }
        }
      }
    }
  }

  for (const tableName of canonicalTableNames) {
    const content = tableContents[tableName];
    const tableDef = createTableStatements.find(s => s.tableName === tableName);
    const orderErrors = tableOrderErrors[tableName];

    if (!content) {
      let numChecks = 0;
      switch (tableName) {
        case "Colour": numChecks = 2; break;
        case "Customer": numChecks = 2; break;
        case "Salesperson": numChecks = 2; break;
        case "Car": numChecks = 3; break;
        case "Sale": numChecks = 5; break;
        case "Payment": numChecks = 4; break;
        case "Supplier": numChecks = 2; break;
        case "Product": numChecks = 2; break;
        case "Orders": numChecks = 4; break;
        case "OrdersProduct": numChecks = 3; break;
      }
      for (let i = 0; i < numChecks; i++) {
        pushMark(0, `❌ ${tableName} table definition not found for this check. (0 marks)`);
      }
      continue;
    }

    if (tableName === "Colour") {
      const hasIdentity = /IDENTITY/i.test(content);
      pushMark(hasIdentity ? 0.5 : 0, hasIdentity ? "✅ Colour table has an IDENTITY column. (+0.5 marks)" : "❌ Colour table is missing an IDENTITY column. (0 marks)");
      const hasPk = /\bPRIMARY\s+KEY\b/i.test(content);
      pushMark(hasPk ? 1 : 0, hasPk ? "✅ Colour table has a PRIMARY KEY. (+1 marks)" : "❌ Colour table is missing a PRIMARY KEY. (0 marks)");
    } else if (tableName === "Customer") {
      const hasIdentity = /IDENTITY/i.test(content);
      pushMark(hasIdentity ? 0.5 : 0, hasIdentity ? "✅ Customer table has an IDENTITY column. (+0.5 marks)" : "❌ Customer table is missing an IDENTITY column. (0 marks)");
      const hasPk = /\bPRIMARY\s+KEY\b/i.test(content);
      pushMark(hasPk ? 1 : 0, hasPk ? "✅ Customer table has a PRIMARY KEY. (+1 marks)" : "❌ Customer table is missing a PRIMARY KEY. (0 marks)");
    } else if (tableName === "Salesperson") {
      const hasIdentity = /IDENTITY/i.test(content);
      pushMark(hasIdentity ? 0.5 : 0, hasIdentity ? "✅ Salesperson table has an IDENTITY column. (+0.5 marks)" : "❌ Salesperson table is missing an IDENTITY column. (0 marks)");
      const hasPk = /\bPRIMARY\s+KEY\b/i.test(content);
      pushMark(hasPk ? 1 : 0, hasPk ? "✅ Salesperson table has a PRIMARY KEY. (+1 marks)" : "❌ Salesperson table is missing a PRIMARY KEY. (0 marks)");
    } else if (tableName === "Car") {
      const hasPk = /\bPRIMARY\s+KEY\b/i.test(content);
      pushMark(hasPk ? 1 : 0, hasPk ? "✅ Car table has a PRIMARY KEY. (+1 marks)" : "❌ Car table is missing a PRIMARY KEY. (0 marks)");

      const referencedColourTableName = "Colour";
      const hasOrderingErrorForColour = orderErrors?.includes(referencedColourTableName);
      const hasFkColour = precomputedFkRegexes[referencedColourTableName].test(content);
      if (hasFkColour && !hasOrderingErrorForColour) {
        pushMark(1, "✅ Car table has a FOREIGN KEY referencing the Colour table. (+1 marks)");
      } else if (hasFkColour && hasOrderingErrorForColour) {
        pushMark(-1, "❌ Car table has a FOREIGN KEY referencing the Colour table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ Car table is missing a FOREIGN KEY referencing the Colour table. (0 marks)");
      }

      let regIdMark = 0;
      let regIdMessage = "";
      if (tableDef) {
        const regIdColumn = tableDef.columns.find(c => getCanonicalColumnName(c.name) === "registrationid");
        if (regIdColumn) {
          if (regIdColumn.dataType.includes("VARCHAR") || regIdColumn.dataType.includes("CHAR")) {
            const lengthMatch = regIdColumn.dataType.match(/\((\d+)\)/);
            const length = lengthMatch ? parseInt(lengthMatch[1]) : null;
            if (length !== null && length <= 20) {
              regIdMark = 1;
              regIdMessage = "✅ Car table's PRIMARY KEY (RegistrationID) is a VARCHAR with appropriate length. (+1 mark)";
            } else if (length !== null && length === 255) {
              regIdMark = 0.5;
              regIdMessage = "⚠️ Car table's PRIMARY KEY (RegistrationID) is a VARCHAR(255). Length is too large, but type is correct. (+0.5 marks)";
            } else {
              regIdMessage = "❌ Car table's PRIMARY KEY (RegistrationID) is a VARCHAR but has an inappropriate length or format. (0 marks)";
            }
          } else {
            regIdMessage = "❌ Car table's PRIMARY KEY (RegistrationID) is not a VARCHAR type. (0 marks)";
          }
        } else {
          regIdMessage = "❌ Car table is missing Registration_ID column (or a fuzzy match like car_id). (0 marks)";
        }
      } else {
        regIdMessage = "❌ Car table definition not found for detailed Registration_ID check. (0 marks)";
      }
      pushMark(regIdMark, regIdMessage);
    } else if (tableName === "Sale") {
      const hasPk = /\bPRIMARY\s+KEY\b/i.test(content);
      pushMark(hasPk ? 1 : 0, hasPk ? "✅ Sale table has a PRIMARY KEY. (+1 marks)" : "❌ Sale table is missing a PRIMARY KEY. (0 marks)");

      const referencedSalespersonTableName = "Salesperson";
      const hasOrderingErrorForSalesperson = orderErrors?.includes(referencedSalespersonTableName);
      const hasFkSalesperson = precomputedFkRegexes[referencedSalespersonTableName].test(content);
      if (hasFkSalesperson && !hasOrderingErrorForSalesperson) {
        pushMark(1, "✅ Sale table has a FOREIGN KEY referencing the Salesperson table. (+1 marks)");
      } else if (hasFkSalesperson && hasOrderingErrorForSalesperson) {
        pushMark(-1, "❌ Sale table has a FOREIGN KEY referencing the Salesperson table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ Sale table is missing a FOREIGN KEY referencing the Salesperson table. (0 marks)");
      }

      const referencedCustomerTableName = "Customer";
      const hasOrderingErrorForCustomer = orderErrors?.includes(referencedCustomerTableName);
      const hasFkCustomer = precomputedFkRegexes[referencedCustomerTableName].test(content);
      if (hasFkCustomer && !hasOrderingErrorForCustomer) {
        pushMark(1, "✅ Sale table has a FOREIGN KEY referencing the Customer table. (+1 marks)");
      } else if (hasFkCustomer && hasOrderingErrorForCustomer) {
        pushMark(-1, "❌ Sale table has a FOREIGN KEY referencing the Customer table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ Sale table is missing a FOREIGN KEY referencing the Customer table. (0 marks)");
      }

      const referencedCarTableName = "Car";
      const hasOrderingErrorForCar = orderErrors?.includes(referencedCarTableName);
      const hasFkCar = precomputedFkRegexes[referencedCarTableName].test(content);
      if (hasFkCar && !hasOrderingErrorForCar) {
        pushMark(1, "✅ Sale table has a FOREIGN KEY referencing the Car table. (+1 marks)");
      } else if (hasFkCar && hasOrderingErrorForCar) {
        pushMark(-1, "❌ Sale table has a FOREIGN KEY referencing the Car table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ Sale table is missing a FOREIGN KEY referencing the Car table. (0 marks)");
      }

      const hasIdentity = /IDENTITY/i.test(content);
      pushMark(hasIdentity ? 0.5 : 0, hasIdentity ? "✅ Sale table has an IDENTITY column. (+0.5 marks)" : "❌ Sale table is missing an IDENTITY column. (0 marks)");
    } else if (tableName === "Payment") {
      const hasPk = /\bPRIMARY\s+KEY\b/i.test(content);
      pushMark(hasPk ? 1 : 0, hasPk ? "✅ Payment table has a PRIMARY KEY. (+1 marks)" : "❌ Payment table is missing a PRIMARY KEY. (0 marks)");

      const referencedCustomerTableName = "Customer";
      const hasOrderingErrorForCustomer = orderErrors?.includes(referencedCustomerTableName);
      const hasFkCustomer = precomputedFkRegexes[referencedCustomerTableName].test(content);
      if (hasFkCustomer && !hasOrderingErrorForCustomer) {
        pushMark(1, "✅ Payment table has a FOREIGN KEY referencing the Customer table. (+1 marks)");
      } else if (hasFkCustomer && hasOrderingErrorForCustomer) {
        pushMark(-1, "❌ Payment table has a FOREIGN KEY referencing the Customer table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ Payment table is missing a FOREIGN KEY referencing the Customer table. (0 marks)");
      }

      const referencedSaleTableName = "Sale";
      const hasOrderingErrorForSale = orderErrors?.includes(referencedSaleTableName);
      const hasFkSale = precomputedFkRegexes[referencedSaleTableName].test(content);
      if (hasFkSale && !hasOrderingErrorForSale) {
        pushMark(1, "✅ Payment table has a FOREIGN KEY referencing the Sale table. (+1 marks)");
      } else if (hasFkSale && hasOrderingErrorForSale) {
        pushMark(-1, "❌ Payment table has a FOREIGN KEY referencing the Sale table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ Payment table is missing a FOREIGN KEY referencing the Sale table. (0 marks)");
      }

      const hasIdentity = /IDENTITY/i.test(content);
      pushMark(hasIdentity ? 0.5 : 0, hasIdentity ? "✅ Payment table has an IDENTITY column. (+0.5 marks)" : "❌ Payment table is missing an IDENTITY column. (0 marks)");
    } else if (tableName === "Supplier") {
      const hasPk = /\bPRIMARY\s+KEY\b/i.test(content);
      pushMark(hasPk ? 1 : 0, hasPk ? "✅ Supplier table has a PRIMARY KEY. (+1 marks)" : "❌ Supplier table is missing a PRIMARY KEY. (0 marks)");
      const hasIdentity = /IDENTITY/i.test(content);
      pushMark(hasIdentity ? 0.5 : 0, hasIdentity ? "✅ Supplier table has an IDENTITY column. (+0.5 marks)" : "❌ Supplier table is missing an IDENTITY column. (0 marks)");
    } else if (tableName === "Product") {
      const hasPk = /\bPRIMARY\s+KEY\b/i.test(content);
      pushMark(hasPk ? 1 : 0, hasPk ? "✅ Product table has a PRIMARY KEY. (+1 marks)" : "❌ Product table is missing a PRIMARY KEY. (0 marks)");
      const hasIdentity = /IDENTITY/i.test(content);
      pushMark(hasIdentity ? 0.5 : 0, hasIdentity ? "✅ Product table has an IDENTITY column. (+0.5 marks)" : "❌ Product table is missing an IDENTITY column. (0 marks)");
    } else if (tableName === "Orders") {
      const hasPk = /\bPRIMARY\s+KEY\b/i.test(content);
      pushMark(hasPk ? 1 : 0, hasPk ? "✅ Orders table has a PRIMARY KEY. (+1 marks)" : "❌ Orders table is missing a PRIMARY KEY. (0 marks)");
      const hasIdentity = /IDENTITY/i.test(content);
      pushMark(hasIdentity ? 0.5 : 0, hasIdentity ? "✅ Orders table has an IDENTITY column. (+0.5 marks)" : "❌ Orders table is missing an IDENTITY column. (0 marks)");

      const referencedSupplierTableName = "Supplier";
      const hasOrderingErrorForSupplier = orderErrors?.includes(referencedSupplierTableName);
      const hasFkSupplier = precomputedFkRegexes[referencedSupplierTableName].test(content);
      if (hasFkSupplier && !hasOrderingErrorForSupplier) {
        pushMark(1, "✅ Orders table has a FOREIGN KEY referencing the Supplier table. (+1 marks)");
      } else if (hasFkSupplier && hasOrderingErrorForSupplier) {
        pushMark(-1, "❌ Orders table has a FOREIGN KEY referencing the Supplier table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ Orders table is missing a FOREIGN KEY referencing the Supplier table. (0 marks)");
      }

      const referencedSalespersonTableName = "Salesperson";
      const hasOrderingErrorForSalesperson = orderErrors?.includes(referencedSalespersonTableName);
      const hasFkSalesperson = precomputedFkRegexes[referencedSalespersonTableName].test(content);
      if (hasFkSalesperson && !hasOrderingErrorForSalesperson) {
        pushMark(1, "✅ Orders table has a FOREIGN KEY referencing the Salesperson table. (+1 marks)");
      } else if (hasFkSalesperson && hasOrderingErrorForSalesperson) {
        pushMark(-1, "❌ Orders table has a FOREIGN KEY referencing the Salesperson table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ Orders table is missing a FOREIGN KEY referencing the Salesperson table. (0 marks)");
      }
    } else if (tableName === "OrdersProduct") {
      const referencedOrdersTableName = "Orders";
      const hasOrderingErrorForOrders = orderErrors?.includes(referencedOrdersTableName);
      const hasFkOrders = precomputedFkRegexes[referencedOrdersTableName].test(content);
      if (hasFkOrders && !hasOrderingErrorForOrders) {
        pushMark(1, "✅ OrdersProduct table has a FOREIGN KEY referencing the Orders table. (+1 marks)");
      } else if (hasFkOrders && hasOrderingErrorForOrders) {
        pushMark(-1, "❌ OrdersProduct table has a FOREIGN KEY referencing the Orders table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ OrdersProduct table is missing a FOREIGN KEY referencing the Orders table. (0 marks)");
      }

      const referencedProductTableName = "Product";
      const hasOrderingErrorForProduct = orderErrors?.includes(referencedProductTableName);
      const hasFkProduct = precomputedFkRegexes[referencedProductTableName].test(content);
      if (hasFkProduct && !hasOrderingErrorForProduct) {
        pushMark(1, "✅ OrdersProduct table has a FOREIGN KEY referencing the Product table. (+1 marks)");
      } else if (hasFkProduct && hasOrderingErrorForProduct) {
        pushMark(-1, "❌ OrdersProduct table has a FOREIGN KEY referencing the Product table, but ordering error detected. (-1 mark penalty)");
      } else {
        pushMark(0, "❌ OrdersProduct table is missing a FOREIGN KEY referencing the Product table. (0 marks)");
      }

      const hasCompositePk = /PRIMARY\s+KEY\s*\(\s*\w+\s*,\s*\w+\s*\)/i.test(content);
      pushMark(hasCompositePk ? 1 : 0, hasCompositePk ? "✅ OrdersProduct table has a composite PRIMARY KEY with two columns. (+1 marks)" : "❌ OrdersProduct table does not have a composite PRIMARY KEY with two columns. (0 marks)");
    }
  }

  excelFeedback.push("");
  excelFeedback.push("");

  const insertStatements = parseInsertStatements(sqlContent);
  const totalExpectedInserts = 235;

  let successfulInsertsCount = 0;
  const tablesWithInserts = new Set<string>();
  const fkDependencyMap = buildFkDependencyMap(createTableStatements);

  for (const insertStmt of insertStatements) {
    const targetTableColumns = tableColumnDefinitions.get(insertStmt.tableName);
    if (!targetTableColumns) {
      continue;
    }

    let effectiveRequiredColumns: ColumnDefinition[] = targetTableColumns.filter(c => !c.isIdentity);
    effectiveRequiredColumns = effectiveRequiredColumns.filter(c => {
      if (insertStmt.tableName === "Orders" && getCanonicalColumnName(c.name) === getCanonicalColumnName("total")) return false;
      if (insertStmt.tableName === "OrdersProduct" && getCanonicalColumnName(c.name) === getCanonicalColumnName("sub_total")) return false;
      return true;
    });
    if (insertStmt.tableName === "Orders") {
      const salespersonIdCol = targetTableColumns.find(c => getCanonicalColumnName(c.name) === getCanonicalColumnName("salespersonid"));
      if (salespersonIdCol && !salespersonIdCol.isIdentity && !effectiveRequiredColumns.some(c => getCanonicalColumnName(c.name) === getCanonicalColumnName("salespersonid"))) {
        effectiveRequiredColumns.push({ ...salespersonIdCol, isNullable: false });
      }
    }

    let statementHasOrderingError = false;
    const dependencies = fkDependencyMap.get(insertStmt.tableName);
    if (dependencies) {
      for (const parentTable of dependencies) {
        if (!tablesWithInserts.has(parentTable)) {
          statementHasOrderingError = true;
          break;
        }
      }
    }

    let statementHasIdentityColumnError = false;
    if (insertStmt.columnsSpecified) {
      for (const colName of insertStmt.columnsSpecified) {
        const columnDef = targetTableColumns.find(c => getCanonicalColumnName(c.name) === getCanonicalColumnName(colName));
        if (columnDef && columnDef.isIdentity) {
          statementHasIdentityColumnError = true;
          break;
        }
      }
    }

    if (!insertStmt.isSelectInsert && insertStmt.values.length > 0) {
      for (let rowIndex = 0; rowIndex < insertStmt.values.length; rowIndex++) {
        const currentRowValues = insertStmt.values[rowIndex];
        let isRowSuccessful = true;

        let expectedColumnCount: number;
        let relevantColumnsForCount: ColumnDefinition[];

        if (insertStmt.columnsSpecified) {
          expectedColumnCount = insertStmt.columnsSpecified.length;
          relevantColumnsForCount = insertStmt.columnsSpecified.map(colName =>
            targetTableColumns.find(c => getCanonicalColumnName(c.name) === getCanonicalColumnName(colName))
          ).filter((c): c is ColumnDefinition => c !== undefined);
        } else {
          relevantColumnsForCount = targetTableColumns.filter(c => !c.isIdentity);
          if (insertStmt.tableName === "Orders") {
            relevantColumnsForCount = relevantColumnsForCount.filter(c => getCanonicalColumnName(c.name) !== getCanonicalColumnName("total"));
          } else if (insertStmt.tableName === "OrdersProduct") {
            relevantColumnsForCount = relevantColumnsForCount.filter(c => getCanonicalColumnName(c.name) !== getCanonicalColumnName("sub_total"));
          }
          expectedColumnCount = relevantColumnsForCount.length;
        }

        if (currentRowValues.length !== expectedColumnCount) {
          isRowSuccessful = false;
        }

        if (isRowSuccessful && currentRowValues.length === expectedColumnCount) {
          for (let i = 0; i < currentRowValues.length; i++) {
            const colName = insertStmt.columnsSpecified ? insertStmt.columnsSpecified[i] : relevantColumnsForCount[i]?.name;
            const columnDef = targetTableColumns.find(c => getCanonicalColumnName(c.name) === getCanonicalColumnName(colName || ''));
            const value = currentRowValues[i];

            if (columnDef) {
              const isQuoted = value.startsWith("'") && value.endsWith("'");
              const isNumeric = /^-?\d+(\.\d+)?$/.test(value);
              const isInnerNumeric = isQuoted && /^-?\d+(\.\d+)?$/.test(value.slice(1, -1));

              if (columnDef.dataType.includes("INT") || columnDef.dataType.includes("NUMERIC") || columnDef.dataType.includes("DECIMAL") || columnDef.dataType.includes("MONEY")) {
                if (!isNumeric && (!isQuoted || !isInnerNumeric)) {
                  isRowSuccessful = false;
                  break;
                }
              } else if (columnDef.dataType.includes("CHAR") || columnDef.dataType.includes("TEXT") || columnDef.dataType.includes("VARCHAR")) {
                if (!isQuoted) {
                  isRowSuccessful = false;
                  break;
                }
              } else if (columnDef.dataType.includes("DATETIME")) {
                const isConvertFunction = value.toUpperCase().startsWith("CONVERT(DATETIME,");
                const isQuotedDateString = isQuoted && (
                  /\d{4}-\d{1,2}-\d{1,2}/.test(value.slice(1, -1)) ||
                  /\d{4}\/\d{1,2}\/\d{1,2}/.test(value.slice(1, -1)) ||
                  /\d{1,2}-\d{1,2}-\d{4}/.test(value.slice(1, -1))
                );
                if (!isConvertFunction && !isQuotedDateString) {
                  isRowSuccessful = false;
                  break;
                }
              }
            }
          }
        }

        if (isRowSuccessful && !statementHasOrderingError && !statementHasIdentityColumnError) {
          successfulInsertsCount++;
        }
      }
    } else if (insertStmt.isSelectInsert) {
      if (!statementHasOrderingError && !statementHasIdentityColumnError) {
        successfulInsertsCount++;
      }
    }
    tablesWithInserts.add(insertStmt.tableName);
  }

  const insertSectionScore = (successfulInsertsCount / totalExpectedInserts) * maxPossibleInsertScore;
  const cappedInsertSectionScore = Math.min(insertSectionScore, maxPossibleInsertScore);
  score += cappedInsertSectionScore;

  excelFeedback.push(cappedInsertSectionScore.toFixed(1).replace(/\.0$/, ''));

  excelFeedback.push("");
  excelFeedback.push("");
  excelFeedback.push("");

  detailedFeedback.push(`--- INSERT Summary ---`);
  detailedFeedback.push(`Total successful INSERT rows/statements: ${successfulInsertsCount}`);
  detailedFeedback.push(`Total expected INSERT rows/statements for full marks: ${totalExpectedInserts}`);
  detailedFeedback.push(`INSERT section score: ${cappedInsertSectionScore.toFixed(1)} / ${maxPossibleInsertScore.toFixed(1)} marks.`);

  const finalFeedback = excelFeedback.join('\n') + '\n' + detailedFeedback.join('\n');

  return {
    grade: `${score.toFixed(1)} / ${maxPossibleTotalScore.toFixed(1)}`,
    feedback: finalFeedback,
  };
}
