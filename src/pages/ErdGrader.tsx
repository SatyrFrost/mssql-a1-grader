"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import { gradeErd } from "@/utils/erd-grader"; // Import the new grading function

const ErdGrader = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [report, setReport] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setReport(""); // Clear previous report
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      showError("Please select an XML file to upload.");
      return;
    }

    setIsLoading(true);
    setReport("Processing your ERD...");

    try {
      const fileContent = await selectedFile.text(); // Read file content as text
      const { report: generatedReport, score } = gradeErd(fileContent); // Use the new grading function
      setReport(generatedReport);
      showSuccess(`ERD processed successfully! Score: ${score.toFixed(2)}/40`);
    } catch (error) {
      console.error("Grading error:", error);
      showError("Failed to process ERD. Please ensure it's a valid draw.io XML file.");
      setReport("Error: Could not process the ERD file. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">ERD Grader</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600 mb-6">
            Upload your `draw.io` XML file for automatic grading of Part 1: ERD.
          </p>
          <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
            <Label htmlFor="erd-file">ERD XML File</Label>
            <Input
              id="erd-file"
              type="file"
              accept=".xml"
              onChange={handleFileChange}
              className="mb-4"
            />
            <Button onClick={handleUpload} disabled={!selectedFile || isLoading}>
              {isLoading ? "Processing..." : "Upload and Grade"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Grading Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={report}
              readOnly
              rows={20}
              className="font-mono text-sm bg-gray-50 dark:bg-gray-900 resize-none"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ErdGrader;