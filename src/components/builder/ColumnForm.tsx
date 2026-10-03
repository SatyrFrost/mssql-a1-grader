import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Column } from "@/types/data-dictionary";
import { XCircle } from "lucide-react";
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

export interface ColumnFormRef {
  forceSave: () => Promise<Column | null>;
}

interface ColumnFormProps {
  column: Column;
  onUpdate: (id: string, updatedColumn: Column) => void;
  onRemove: (id: string) => void;
}

const columnSchema = z.object({
  columnName: z.string().min(1, "列名为必填项 / Column Name is required"),
  dataType: z.string().min(1, "数据类型为必填项 / Data Type is required"),
  size: z.preprocess((val) => {
    const trimmedVal = val == null ? "" : String(val).trim();
    if (trimmedVal === "" || trimmedVal === "-") return null;
    const num = Number(trimmedVal);
    return isNaN(num) ? null : num;
  }, z.number({ invalid_type_error: "大小必须为数字 / Size must be a number" }).int("大小必须为整数 / Size must be a whole number").positive("大小必须大于零 / Size must be greater than zero").nullable()),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  isOptional: z.enum(['Yes', 'No'], { required_error: "请选择是否允许为空 / Optional status is required" }),
  isAuto: z.boolean(),
  defaultValue: z.string().nullable(),
  columnDescription: z.string().min(1, "描述为必填项 / Description is required"),
});

const dataTypes = ["VARCHAR", "INT", "DATETIME", "MONEY"];

type ColumnFormValues = Omit<Column, 'id' | 'size' | 'referencesTable' | 'referencesColumn'> & { size: number | string | null };

function ColumnFormImpl({ column, onUpdate, onRemove }: ColumnFormProps, ref: React.Ref<ColumnFormRef>) {
  const { register, control, watch, getValues, trigger, formState: { errors } } = useForm<ColumnFormValues>({
    resolver: zodResolver(columnSchema),
    defaultValues: {
      ...column,
      size: column.size === null ? "" : column.size,
      defaultValue: column.defaultValue === null ? "" : column.defaultValue,
      isOptional: column.isOptional || 'No',
    },
  });
  const allFields = watch();

  const formatData = React.useCallback((data: ColumnFormValues): Column => ({
    ...column,
    ...data,
    size: data.size === "" || data.size === null || data.size === "-" || isNaN(Number(data.size)) ? null : Number(data.size),
    defaultValue: data.defaultValue === "" ? null : data.defaultValue,
  }), [column]);

  React.useImperativeHandle(ref, () => ({
    forceSave: async () => {
      if (!await trigger()) return null;
      const data = formatData(columnSchema.parse(getValues()) as ColumnFormValues);
      onUpdate(column.id, data);
      return data;
    },
  }));

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const data = formatData(getValues());
      if (JSON.stringify(data) !== JSON.stringify(column)) onUpdate(column.id, data);
    }, 300);
    return () => clearTimeout(timeout);
  }, [allFields, column, formatData, getValues, onUpdate]);

  return (
    <div className="relative border p-4 pt-12 rounded-md space-y-4" style={{ backgroundColor: 'hsl(210 36.85% 88.1% / 90%)' }}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive hover:bg-destructive/10">
            <XCircle className="h-5 w-5" /><span className="sr-only">Remove Column</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？ / Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>此操作无法撤销。将从表中永久删除列“{column.columnName || "新列"}”。<br />This action cannot be undone. This will permanently remove the column "{column.columnName || "New Column"}" from your table.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消 / Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRemove(column.id)}>继续 / Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`columnName-${column.id}`}>Column Name 列名</Label>
          <Input id={`columnName-${column.id}`} {...register("columnName")} className="mt-1" />
          {errors.columnName && <p className="text-red-600 text-sm">{errors.columnName.message}</p>}
        </div>
        <div>
          <Label htmlFor={`dataType-${column.id}`}>Data Type 数据类型</Label>
          <Controller name="dataType" control={control} render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id={`dataType-${column.id}`} className="w-full mt-1"><SelectValue placeholder="Select a data type" /></SelectTrigger>
              <SelectContent>{Array.from(new Set([...dataTypes, column.dataType])).map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          {errors.dataType && <p className="text-red-600 text-sm">{errors.dataType.message}</p>}
        </div>
        <div>
          <Label htmlFor={`size-${column.id}`}>Size (optional) 大小（可选）</Label>
          <Input id={`size-${column.id}`} type="text" {...register("size")} className="mt-1" placeholder="e.g., 255 for VARCHAR" />
          {errors.size && <p className="text-red-600 text-sm">{errors.size.message}</p>}
        </div>
        <div>
          <Label htmlFor={`defaultValue-${column.id}`}>Values (optional) 值（可选）</Label>
          <Input id={`defaultValue-${column.id}`} {...register("defaultValue")} className="mt-1" placeholder="For example, DEFAULT" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="flex items-center space-x-2">
          <Controller name="isPrimaryKey" control={control} render={({ field }) => <Checkbox className="bg-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900" id={`isPrimaryKey-${column.id}`} checked={field.value} onCheckedChange={field.onChange} />} />
          <Label htmlFor={`isPrimaryKey-${column.id}`}>Primary Key 主键</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Controller name="isForeignKey" control={control} render={({ field }) => <Checkbox className="bg-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900" id={`isForeignKey-${column.id}`} checked={field.value} onCheckedChange={field.onChange} />} />
          <Label htmlFor={`isForeignKey-${column.id}`}>Foreign Key 外键</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Controller name="isOptional" control={control} render={({ field }) => (
            <Select onValueChange={field.onChange} value={field.value}>
              <SelectTrigger id={`isOptional-${column.id}`} className="w-[100px] mt-1"><SelectValue placeholder="Optional?" /></SelectTrigger>
              <SelectContent><SelectItem value="Yes">Yes</SelectItem><SelectItem value="No">No</SelectItem></SelectContent>
            </Select>
          )} />
          <Label htmlFor={`isOptional-${column.id}`}>Optional 可为空</Label>
          {errors.isOptional && <p className="text-red-600 text-sm">{errors.isOptional.message}</p>}
        </div>
        <div className="flex items-center space-x-2">
          <Controller name="isAuto" control={control} render={({ field }) => <Checkbox className="bg-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900" id={`isAuto-${column.id}`} checked={field.value} onCheckedChange={field.onChange} />} />
          <Label htmlFor={`isAuto-${column.id}`}>Auto 自动递增</Label>
        </div>
      </div>
      <div>
        <Label htmlFor={`columnDescription-${column.id}`}>Column Description 列描述</Label>
        <Textarea id={`columnDescription-${column.id}`} {...register("columnDescription")} className="mt-1" placeholder="A brief description of what this column stores" />
        {errors.columnDescription && <p className="text-red-600 text-sm">{errors.columnDescription.message}</p>}
      </div>
    </div>
  );
}

export const ColumnForm = React.forwardRef(ColumnFormImpl);
