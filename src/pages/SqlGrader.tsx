"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { gradeSql } from "@/utils/gradeSql";

const SqlGrader = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [gradeResult, setGradeResult] = useState<{ grade: string; feedback: string } | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setGradeResult(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target?.result as string);
      };
      reader.onerror = () => {
        showError("Failed to read file.");
        setFileContent("");
      };
      reader.readAsText(file);
    } else {
      setSelectedFile(null);
      setFileContent("");
    }
    event.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileContent) {
      showError("Please select a SQL or TXT file to upload.");
      return;
    }

    setIsSubmitting(true);
    setGradeResult(null);

    try {
      const result = gradeSql(fileContent, selectedFile.name);
      setGradeResult(result);
      showSuccess("SQL file graded successfully!");
    } catch (error: any) {
      showError(`Failed to grade SQL: ${error.message || "Unknown error"}`);
      console.error("Grading error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 min-h-[calc(100vh-4rem)] flex justify-center items-start">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">SQL Grader for Teachers</CardTitle>
          <CardDescription className="text-center">
            Upload a .sql or .txt file containing student's SQL statements to receive an automatic grade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="sql-file" className="mb-2 block text-lg font-medium">
                Upload SQL File (.sql or .txt)
              </Label>
              <Input
                id="sql-file"
                type="file"
                accept=".sql,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm h-12 flex items-center
                text-transparent
                file:mr-4 file:py-1.5 file:px-4 file:h-auto file:cursor-pointer
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected file: <span className="font-medium">{selectedFile.name}</span>
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !selectedFile}>
              {isSubmitting ? "Grading..." : "Upload and Grade SQL"}
            </Button>
          </form>

          {gradeResult && (
            <div className="mt-8 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
              <h3 className="text-xl font-semibold mb-2">Grading Result:</h3>
              <p className="text-lg">
                Grade: <span className="font-bold text-green-600 dark:text-green-400">{gradeResult.grade}</span>
              </p>
              <div className="mt-2 space-y-1">
                {gradeResult.feedback.split("\n").map((item, index) => (
                  <p key={index} className="text-sm text-gray-700 dark:text-gray-300">
                    {item === "" ? <>&nbsp;</> : item}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SqlGrader;
