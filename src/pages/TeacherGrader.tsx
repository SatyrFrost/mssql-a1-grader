"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataDictionary, Table, Column } from "@/types/data-dictionary";
import { DataDictionaryTableDisplay } from "@/components/data-dictionary/DataDictionaryTableDisplay";
import { toast } from "sonner";
import referenceDataDictionaryRaw from "@/data/modelDataDictionary.json";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Upload } from "lucide-react";
import { compareTwoStrings } from "string-similarity";

const referenceDataDictionary = referenceDataDictionaryRaw as unknown as DataDictionary;

function normalizeString(str: string): string {
  let normalized = str.toLowerCase().replace(/[_ ]/g, "");
  normalized = normalized.replace(/num/g, "number");
  return normalized;
}

const TeacherGrader = () => {
  const [studentDataDictionary, setStudentDataDictionary] = React.useState<DataDictionary | null>(null);
  const [gradingResults, setGradingResults] = React.useState<string[]>([]);
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsedData: DataDictionary = JSON.parse(content);
          setStudentDataDictionary(parsedData);
          setGradingResults([]);
          toast.success("Student data dictionary loaded successfully!");
        } catch (error) {
          console.error("Error parsing JSON file:", error);
          toast.error("Failed to parse JSON file. Please ensure it's a valid JSON.");
          setStudentDataDictionary(null);
          setSelectedFileName(null);
          setGradingResults([]);
        }
      };
      reader.readAsText(file);
    } else {
      setSelectedFileName(null);
      setStudentDataDictionary(null);
      setGradingResults([]);
    }
  };

  const gradeSubmission = React.useCallback(() => {
    if (!studentDataDictionary) {
      toast.error("Please upload a student's data dictionary first.");
      return;
    }

    setGradingResults([]);

    const detailedChecks: string[] = [];
    let keysScore = 0;
    let fieldsScore = 0;
    let formatsScore = 0;
    let sizesScore = 0;
    let descsScore = 0;

    const TABLE_NAME_FUZZY_THRESHOLD = 0.7;
    const COLUMN_NAME_FUZZY_THRESHOLD = 0.5;

    let MAX_KEYS_POSSIBLE = 0;
    let MAX_FIELDS_POSSIBLE = 0;
    let MAX_FORMATS_POSSIBLE = 0;
    let MAX_SIZES_POSSIBLE = 0;
    let MAX_DESCS_POSSIBLE = 0;

    referenceDataDictionary.tables.forEach((refTable: Table) => {
      refTable.columns.forEach((refColumn: Column) => {
        MAX_FIELDS_POSSIBLE += 1;
        MAX_FORMATS_POSSIBLE += 1;
        MAX_DESCS_POSSIBLE += 1;

        if (refColumn.isPrimaryKey) {
          MAX_KEYS_POSSIBLE += 1;
        }
        if (refColumn.isForeignKey) {
          MAX_KEYS_POSSIBLE += 1;
        }
        MAX_SIZES_POSSIBLE += 1;
      });
    });

    const getEffectiveSize = (sizeValue: number | null | string): number | null => {
      if (sizeValue === null || sizeValue === "" || sizeValue === "-") {
        return null;
      }
      const num = Number(sizeValue);
      return isNaN(num) ? null : num;
    };

    referenceDataDictionary.tables.forEach((refTable: Table) => {
      const normalizedRefTableName = normalizeString(refTable.tableName);
      let bestStudentTableMatch: Table | undefined = undefined;
      let highestSimilarity = 0;

      studentDataDictionary.tables.forEach((st: Table) => {
        const normalizedStudentTableName = normalizeString(st.tableName);
        const similarity = compareTwoStrings(normalizedRefTableName, normalizedStudentTableName);
        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestStudentTableMatch = st;
        }
      });

      if (bestStudentTableMatch) {
        const normalizedBestStudentTableName = normalizeString(bestStudentTableMatch.tableName);
        const similarity = compareTwoStrings(normalizedRefTableName, normalizedBestStudentTableName);

        if (similarity >= TABLE_NAME_FUZZY_THRESHOLD) {
          detailedChecks.push(`  ✅ Table "${refTable.tableName}" found as "${bestStudentTableMatch.tableName}" (match, similarity: ${similarity.toFixed(2)}).`);
        } else {
          detailedChecks.push(`❌ Table "${refTable.tableName}" not found.`);
          return;
        }

        refTable.columns.forEach((refColumn: Column) => {
          const normalizedRefColumnName = normalizeString(refColumn.columnName);
          let studentColumn: Column | undefined = undefined;
          let highestColumnSimilarity = 0;

          bestStudentTableMatch!.columns.forEach((sc: Column) => {
            const normalizedStudentColumnName = normalizeString(sc.columnName);
            const similarity = compareTwoStrings(normalizedRefColumnName, normalizedStudentColumnName);
            if (similarity > highestColumnSimilarity) {
              highestColumnSimilarity = similarity;
              studentColumn = sc;
            }
          });

          if (studentColumn) {
            const normalizedStudentColumnName = normalizeString(studentColumn.columnName);
            const similarity = compareTwoStrings(normalizedRefColumnName, normalizedStudentColumnName);

            if (similarity >= COLUMN_NAME_FUZZY_THRESHOLD) {
              detailedChecks.push(`    ✅ Column "${refColumn.columnName}" in "${refTable.tableName}" found as "${studentColumn.columnName}" (match, similarity: ${similarity.toFixed(2)}).`);
              fieldsScore += 1;
            } else {
              detailedChecks.push(`    ❌ Column "${refColumn.columnName}" in "${refTable.tableName}" not found in student's "${bestStudentTableMatch.tableName}" (similarity: ${similarity.toFixed(2)}).`);
              return;
            }

            if (studentColumn.dataType === refColumn.dataType) {
              detailedChecks.push(`      ✅ Data type for "${refColumn.columnName}" matches.`);
              formatsScore += 1;
            } else {
              detailedChecks.push(`      ❌ Data type for "${refColumn.columnName}" mismatch. Expected "${refColumn.dataType}", got "${studentColumn.dataType}".`);
            }

            let sizeScoreAwarded = false;
            const isRefAutoIncrementPK = refColumn.isPrimaryKey && refColumn.isAuto && getEffectiveSize(refColumn.size) === null;
            const effectiveRefSize = getEffectiveSize(refColumn.size);
            const effectiveStudentSize = getEffectiveSize(studentColumn.size);

            if (effectiveRefSize !== null) {
              if (refColumn.dataType === "VARCHAR") {
                if (effectiveStudentSize !== null && effectiveStudentSize > 0 && studentColumn.isAuto === refColumn.isAuto) {
                  sizeScoreAwarded = true;
                }
              } else {
                if (effectiveStudentSize === effectiveRefSize && studentColumn.isAuto === refColumn.isAuto) {
                  sizeScoreAwarded = true;
                }
              }
            } else {
              if (isRefAutoIncrementPK) {
                if (studentColumn.isPrimaryKey && studentColumn.isAuto && effectiveStudentSize === null) {
                  sizeScoreAwarded = true;
                }
              } else {
                if (effectiveStudentSize === null && studentColumn.isAuto === refColumn.isAuto) {
                  sizeScoreAwarded = true;
                }
              }
            }

            if (sizeScoreAwarded) {
              detailedChecks.push(`      ✅ Size/Auto-increment for "${refColumn.columnName}" matches.`);
              sizesScore += 1;
            } else {
              detailedChecks.push(`      ❌ Size/Auto-increment for "${refColumn.columnName}" mismatch. Expected size "${refColumn.size}" and auto-increment "${refColumn.isAuto}", got size "${studentColumn.size}" and auto-increment "${studentColumn.isAuto}".`);
            }

            if (refColumn.isPrimaryKey && studentColumn.isPrimaryKey) {
              keysScore += 1;
              detailedChecks.push(`      ✅ Primary Key status for "${refColumn.columnName}" matches.`);
            } else if (refColumn.isPrimaryKey && !studentColumn.isPrimaryKey) {
              detailedChecks.push(`      ❌ Primary Key status for "${refColumn.columnName}" mismatch. Expected PK, got NOT PK. (-1 mark)`);
            } else if (!refColumn.isPrimaryKey && studentColumn.isPrimaryKey) {
              detailedChecks.push(`      ❌ Primary Key status for "${refColumn.columnName}" mismatch. Expected NOT PK, got PK. (-1 mark)`);
            } else {
              detailedChecks.push(`      ➖ Primary Key status for "${refColumn.columnName}" correctly not marked as PK.`);
            }

            if (refColumn.isForeignKey && studentColumn.isForeignKey) {
              keysScore += 1;
              detailedChecks.push(`      ✅ Foreign Key status for "${refColumn.columnName}" matches.`);
            } else if (refColumn.isForeignKey && !studentColumn.isForeignKey) {
              detailedChecks.push(`      ❌ Foreign Key status for "${refColumn.columnName}" mismatch. Expected FK, got NOT FK. (-1 mark)`);
            } else if (!refColumn.isForeignKey && studentColumn.isForeignKey) {
              detailedChecks.push(`      ❌ Foreign Key status for "${refColumn.columnName}" mismatch. Expected NOT FK, got FK. (-1 mark)`);
            } else {
              detailedChecks.push(`      ➖ Foreign Key status for "${refColumn.columnName}" correctly not marked as FK.`);
            }

            if (studentColumn.columnDescription && studentColumn.columnDescription.trim().length > 0) {
              detailedChecks.push(`      ✅ Description for "${refColumn.columnName}" provided.`);
              descsScore += 0.5;
            } else {
              detailedChecks.push(`      ❌ Description for "${refColumn.columnName}" is missing.`);
            }
          } else {
            detailedChecks.push(`    ❌ Column "${refColumn.columnName}" in "${refTable.tableName}" not found in student's "${bestStudentTableMatch.tableName}".`);
          }
        });
      } else {
        detailedChecks.push(`❌ Table "${refTable.tableName}" not found.`);
      }
    });

    const totalRawScore = keysScore + fieldsScore + formatsScore + sizesScore + descsScore;
    const maxPossibleRawScore = MAX_KEYS_POSSIBLE + MAX_FIELDS_POSSIBLE + MAX_FORMATS_POSSIBLE + (MAX_DESCS_POSSIBLE * 0.5) + MAX_SIZES_POSSIBLE;
    const conversionFactor = 15 / maxPossibleRawScore;
    const finalMark = totalRawScore * conversionFactor;

    const summaryResults: string[] = [];
    summaryResults.push(`--- Detailed Scores ---`);
    summaryResults.push(`Keys Score: ${keysScore}/${MAX_KEYS_POSSIBLE}`);
    summaryResults.push(`Fields Score: ${fieldsScore}/${MAX_FIELDS_POSSIBLE}`);
    summaryResults.push(`Formats Score: ${formatsScore}/${MAX_FORMATS_POSSIBLE}`);
    summaryResults.push(`Sizes Score: ${sizesScore}/${MAX_SIZES_POSSIBLE}`);
    summaryResults.push(`Descriptions Score: ${descsScore.toFixed(2)}/${(MAX_DESCS_POSSIBLE * 0.5).toFixed(2)}`);
    summaryResults.push(`Total Raw Score: ${totalRawScore.toFixed(2)}/${maxPossibleRawScore.toFixed(2)}`);
    summaryResults.push(`Final Mark (out of 15): ${finalMark.toFixed(2)}`);
    summaryResults.push(`${keysScore}`);
    summaryResults.push(`${fieldsScore}`);
    summaryResults.push(`${formatsScore}`);
    summaryResults.push(`${sizesScore}`);
    summaryResults.push(`${descsScore}`);
    summaryResults.push(`&nbsp;`);

    const individualChecksHeader = `--- Individual Checks ---`;

    setGradingResults([...summaryResults, individualChecksHeader, ...detailedChecks]);
    toast.info("Grading complete!");
  }, [studentDataDictionary]);

  return (
    <div className="container mx-auto py-8 space-y-8 min-h-[calc(100vh-4rem)]">
      <h1 className="text-3xl font-bold text-center">Data Dictionary Teacher Grading Page</h1>

      <Card className="p-6 space-y-4">
        <CardTitle>Upload Student Submission</CardTitle>
        <CardContent className="space-y-4">
          <Label htmlFor="student-file-upload" className="block text-sm font-medium text-foreground mb-2">
            Upload Student's Data Dictionary JSON
          </Label>
          <div className="space-y-2">
            <Button
              asChild
              className="bg-[hsl(222.2deg_96.53%_50.55%_/_90%)] hover:bg-[hsl(222.2deg_96.53%_40.55%_/_90%)] text-white w-40"
            >
              <label htmlFor="student-file-upload" className="cursor-pointer flex items-center justify-center">
                <span className="flex items-center">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Choose File</span>
                </span>
              </label>
            </Button>
            <Input
              id="student-file-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="sr-only"
            />
            {selectedFileName && (
              <span className="text-sm text-muted-foreground block text-center mt-2">
                {selectedFileName}
              </span>
            )}
          </div>
          <Button onClick={gradeSubmission} disabled={!studentDataDictionary} className="w-40">
            Grade Submission
          </Button>
        </CardContent>
      </Card>

      {gradingResults.length > 0 && (
        <Card className="p-6 space-y-4">
          <CardTitle>Grading Results</CardTitle>
          <CardContent>
            <div className="space-y-2">
              {gradingResults.map((result, index) => (
                <p
                  key={index}
                  className={`text-sm ${
                    result.startsWith("Final Mark")
                      ? "font-bold text-base text-foreground"
                      : result.startsWith("✅")
                      ? "text-green-600"
                      : result.startsWith("❌")
                      ? "text-red-600"
                      : result.startsWith("➖")
                      ? "text-gray-500"
                      : result.startsWith("⚠️")
                      ? "text-yellow-600"
                      : "text-foreground"
                  }`}
                >
                  {result === "&nbsp;" ? <span dangerouslySetInnerHTML={{ __html: result }} /> : result}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {studentDataDictionary && (
        <Card className="p-6 space-y-4">
          <CardTitle>Student's Submitted Data Dictionary</CardTitle>
          <CardContent>
            <DataDictionaryTableDisplay dataDictionary={studentDataDictionary} />
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card className="p-6 space-y-4">
        <CardTitle>Reference Data Dictionary (for comparison)</CardTitle>
        <CardContent>
          <DataDictionaryTableDisplay dataDictionary={referenceDataDictionary} />
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherGrader;
