import { z } from "zod";
import { DataDictionary } from "@/types/data-dictionary";

const savedColumn = z.object({
  id: z.string().optional(),
  columnName: z.string(),
  dataType: z.string().min(1),
  size: z.union([z.number().finite(), z.string(), z.null()]).transform(value => {
    if (value === null || String(value).trim() === "" || value === "-") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error("Invalid field size in saved file.");
    return number;
  }),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  isOptional: z.enum(["Yes", "No"]),
  isAuto: z.boolean(),
  defaultValue: z.string().nullable(),
  referencesTable: z.string().nullable().default(null),
  referencesColumn: z.string().nullable().default(null),
  columnDescription: z.string(),
});

const savedDictionary = z.object({
  tables: z.array(z.object({
    id: z.string().optional(),
    tableName: z.string(),
    columns: z.array(savedColumn),
  })),
});

export function parseDictionary(text: string): DataDictionary {
  const data = savedDictionary.parse(JSON.parse(text)) as DataDictionary;
  // Imported IDs are internal only: regenerate to prevent duplicate React keys/ref collisions.
  return {
    tables: data.tables.map(table => ({
      ...table,
      id: crypto.randomUUID(),
      columns: table.columns.map(column => ({
        ...column,
        id: crypto.randomUUID(),
      })),
    })),
  };
}

export const storageKey = "dataDictionaryBuilderState";
export const draftKey = "dataDictionaryBuilderDraft";

export function downloadDictionary(data: DataDictionary) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  anchor.href = url;
  anchor.download = `DataDictionary-${timestamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
