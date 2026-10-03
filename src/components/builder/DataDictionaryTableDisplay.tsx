import { DataDictionary, Table, Column } from "@/types/data-dictionary";
import { Table as ShadcnTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface DataDictionaryTableDisplayProps {
  dataDictionary: DataDictionary;
}

const MutedDash = () => <span className="font-bold text-slate-800 dark:text-slate-200 text-base select-none">—</span>;
const MutedCross = () => (
  <span className="inline-flex items-center justify-center text-slate-500">
    <X className="h-4 w-4 stroke-[2.5]" />
    <span className="sr-only">No</span>
  </span>
);
const renderFlag = (val: boolean) =>
  val ? (
    <span className="inline-flex items-center text-emerald-600 font-bold" aria-label="Yes">
      ✅
    </span>
  ) : (
    <MutedCross />
  );

export function DataDictionaryTableDisplay({ dataDictionary }: DataDictionaryTableDisplayProps) {
  if (!dataDictionary || !dataDictionary.tables || dataDictionary.tables.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No tables defined yet. Add a new table to see the data dictionary here.
        <br />
        尚未定义任何表。添加一个新表以在此处查看数据字典。
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {dataDictionary.tables.map((table: Table) => (
        <Card key={table.id} className="rounded-lg shadow-sm">
          <CardHeader>
            <CardTitle className="flex flex-wrap gap-2 items-center justify-between">
              <span className="break-all">Table: {table.tableName}</span>
              <Badge variant="secondary">{table.columns.length} Columns</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {table.columns.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No columns defined for this table.</p>
            ) : (
              <div className="overflow-x-auto">
                <ShadcnTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column Name</TableHead>
                      <TableHead>Data Type</TableHead>
                      <TableHead className="text-center">Size</TableHead>
                      <TableHead className="text-center">PK</TableHead>
                      <TableHead className="text-center">FK</TableHead>
                      <TableHead className="text-center">Optional</TableHead>
                      <TableHead className="text-center">Auto</TableHead>
                      <TableHead className="text-center">Values</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {table.columns.map((column: Column) => {
                      const hasSize = column.size !== null && column.size !== undefined;
                      const hasDefaultValue =
                        column.defaultValue !== null &&
                        column.defaultValue !== undefined &&
                        column.defaultValue !== "" &&
                        column.defaultValue !== "-";
                      const hasDescription =
                        column.columnDescription != null && column.columnDescription.trim() !== "";
                      return (
                        <TableRow key={column.id}>
                          <TableCell className="font-medium">{column.columnName}</TableCell>
                          <TableCell>{column.dataType}</TableCell>
                          <TableCell className="text-center">{hasSize ? column.size : <MutedDash />}</TableCell>
                          <TableCell className="text-center">{renderFlag(column.isPrimaryKey)}</TableCell>
                          <TableCell className="text-center">{renderFlag(column.isForeignKey)}</TableCell>
                          <TableCell className="text-center">{renderFlag(column.isOptional === "Yes")}</TableCell>
                          <TableCell className="text-center">{renderFlag(column.isAuto)}</TableCell>
                          <TableCell className="text-center">{hasDefaultValue ? column.defaultValue : <MutedDash />}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={column.columnDescription}>
                            {hasDescription ? column.columnDescription : <MutedDash />}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
