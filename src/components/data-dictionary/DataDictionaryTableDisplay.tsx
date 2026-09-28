"use client";

import React from "react";
import { DataDictionary, Table, Column } from "@/types/data-dictionary";
import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DataDictionaryTableDisplayProps {
  dataDictionary: DataDictionary;
}

export function DataDictionaryTableDisplay({ dataDictionary }: DataDictionaryTableDisplayProps) {
  if (!dataDictionary || !dataDictionary.tables || dataDictionary.tables.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No tables defined yet. Add a new table to see the data dictionary here.<br />尚未定义任何表。添加一个新表以在此处查看数据字典。
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {dataDictionary.tables.map((table: Table, tableIndex: number) => (
        <Card key={tableIndex}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Table: {table.tableName}</span>
              <Badge variant="secondary">{table.columns.length} Columns</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {table.columns.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No columns defined for this table.</p>
            ) : (
              <div className="overflow-x-auto">
                <ShadcnTable>
                  <TableHeader>
                    <TableRow><TableHead>Column Name</TableHead><TableHead>Data Type</TableHead><TableHead>Size</TableHead><TableHead>PK</TableHead><TableHead>FK</TableHead><TableHead>Optional</TableHead><TableHead>Auto</TableHead><TableHead>Values</TableHead><TableHead>Description</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.columns.map((column: Column, columnIndex: number) => (
                      <TableRow key={columnIndex}><TableCell className="font-medium">{column.columnName}</TableCell><TableCell>{column.dataType}</TableCell><TableCell>{column.size !== null ? column.size : "-"}</TableCell><TableCell>{column.isPrimaryKey ? "✅" : "❌"}</TableCell><TableCell>{column.isForeignKey ? "✅" : "❌"}</TableCell><TableCell>{column.isOptional === "Yes" ? "✅" : "❌"}</TableCell><TableCell>{column.isAuto ? "✅" : "❌"}</TableCell><TableCell>{column.defaultValue !== null ? column.defaultValue : "-"}</TableCell><TableCell className="max-w-[200px] truncate">{column.columnDescription}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </ShadcnTable>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}