import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, Column } from "@/types/data-dictionary";
import { ColumnForm, ColumnFormRef } from "./ColumnForm";
import { PlusCircle, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface TableFormRef {
  forceSave: () => Promise<Table | null>;
}

interface TableFormProps {
  table: Table;
  onUpdate: (id: string, updatedTable: Table) => void;
  onRemove: (id: string) => void;
}

const tableSchema = z.object({
  tableName: z.string().min(1, "表名为必填项 / Table Name is required"),
});

function TableFormImpl({ table, onUpdate, onRemove }: TableFormProps, ref: React.Ref<TableFormRef>) {
  const { register, watch, getValues, trigger, formState: { errors } } = useForm<{ tableName: string }>({
    resolver: zodResolver(tableSchema),
    defaultValues: { tableName: table.tableName },
  });
  const columnsRef = React.useRef<Column[]>(table.columns);
  const [revision, setRevision] = React.useState(0);
  const columnRefs = React.useRef<Record<string, ColumnFormRef | null>>({});
  const currentTableName = watch("tableName");

  const handleAddColumn = React.useCallback(() => {
    const newColumn: Column = {
      id: crypto.randomUUID(),
      columnName: "",
      dataType: "VARCHAR",
      size: null,
      isPrimaryKey: false,
      isForeignKey: false,
      isOptional: "No",
      isAuto: false,
      defaultValue: null,
      referencesTable: null,
      referencesColumn: null,
      columnDescription: "",
    };
    columnsRef.current = [...columnsRef.current, newColumn];
    setRevision(prev => prev + 1);
  }, []);

  const handleUpdateColumn = React.useCallback((id: string, updatedColumn: Column) => {
    columnsRef.current = columnsRef.current.map(col => col.id === id ? { ...updatedColumn, id } : col);
    setRevision(prev => prev + 1);
  }, []);

  const handleRemoveColumn = React.useCallback((id: string) => {
    columnsRef.current = columnsRef.current.filter(col => col.id !== id);
    delete columnRefs.current[id];
    setRevision(prev => prev + 1);
  }, []);

  const moveColumn = (index: number, offset: number) => {
    const columns = [...columnsRef.current];
    [columns[index], columns[index + offset]] = [columns[index + offset], columns[index]];
    columnsRef.current = columns;
    setRevision(prev => prev + 1);
  };

  React.useImperativeHandle(ref, () => ({
    forceSave: async () => {
      const columns = await Promise.all(
        columnsRef.current.map(col => columnRefs.current[col.id]?.forceSave() ?? Promise.resolve(col))
      );
      const valid = await trigger();
      if (!valid || columns.some(col => col === null)) return null;
      const snapshot: Table = { id: table.id, tableName: getValues().tableName, columns: columns as Column[] };
      columnsRef.current = snapshot.columns;
      onUpdate(table.id, snapshot);
      return snapshot;
    },
  }));

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const snapshot = { id: table.id, tableName: getValues().tableName, columns: columnsRef.current };
      if (JSON.stringify(snapshot) !== JSON.stringify(table)) onUpdate(table.id, snapshot);
    }, 300);
    return () => clearTimeout(timeout);
  }, [currentTableName, revision, onUpdate, table, getValues]);

  return (
    <div className="border p-3 sm:p-6 rounded-lg shadow-sm space-y-6 bg-card">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h3 className="text-xl font-semibold break-all">Table: {currentTableName || "New Table"}</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              删除表 / Remove Table
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定要删除吗？ / Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                此操作无法撤销。将永久删除表“{currentTableName || "新表"}”及其所有列。<br />
                This action cannot be undone. This will permanently remove the table "{currentTableName || "New Table"}" and all its columns.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消 / Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onRemove(table.id)}>继续 / Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`tableName-${table.id}`}>Table Name 表名</Label>
          <Input id={`tableName-${table.id}`} {...register("tableName")} className="mt-1" />
          {errors.tableName && <p className="text-red-600 text-sm">{errors.tableName.message}</p>}
        </div>
      </div>
      <Separator />
      <h4 className="text-lg font-medium">Columns 列</h4>
      <div className="space-y-4">
        {columnsRef.current.map((column, index) => (
          <div key={column.id}>
            <div className="flex justify-end gap-1 mb-1">
              <Button
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => moveColumn(index, -1)}
                aria-label={`Move ${column.columnName || 'column'} up`}
              >
                <ArrowUp className="h-4 w-4 mr-1" />
                Up
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={index === columnsRef.current.length - 1}
                onClick={() => moveColumn(index, 1)}
                aria-label={`Move ${column.columnName || 'column'} down`}
              >
                <ArrowDown className="h-4 w-4 mr-1" />
                Down
              </Button>
            </div>
            <ColumnForm
              column={column}
              onUpdate={handleUpdateColumn}
              onRemove={handleRemoveColumn}
              ref={el => { columnRefs.current[column.id] = el; }}
            />
          </div>
        ))}
      </div>
      <Button onClick={handleAddColumn} className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm">
        <PlusCircle className="h-4 w-4 mr-2" />
        Add Column 添加列
      </Button>
    </div>
  );
}

export const TableForm = React.forwardRef(TableFormImpl);
