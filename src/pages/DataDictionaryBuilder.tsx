import React from "react";
import { Button } from "@/components/ui/button";
import { TableForm, TableFormRef } from "@/components/builder/TableForm";
import { DataDictionary, Table } from "@/types/data-dictionary";
import { PlusCircle, Download, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { DataDictionaryTableDisplay } from "@/components/builder/DataDictionaryTableDisplay";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { StudentHelp } from "@/components/builder/StudentHelp";
import {
  parseDictionary,
  storageKey,
  draftKey,
  downloadDictionary,
} from "@/utils/dictionary-files";
import { useAuth } from "@/context/AuthContext";
import modelDataDictionary from "@/data/modelDataDictionary.json";

const newTable = (number: number): Table => ({
  id: crypto.randomUUID(),
  tableName: `NewTable${number}`,
  columns: [],
});

const DataDictionaryBuilder = () => {
  const { isAuthenticated } = useAuth();

  const [initial] = React.useState(() => {
    try {
      const saved =
        localStorage.getItem(draftKey) ?? localStorage.getItem(storageKey);
      if (saved) return { tables: parseDictionary(saved).tables, warning: "" };
    } catch {
      return {
        tables: [newTable(1)],
        warning:
          "浏览器存储不可用或保存的数据无效。请使用“下载”保留你的作品。 / Browser storage is unavailable or contains invalid data. Use Download to keep your work.",
      };
    }
    return { tables: [newTable(1)], warning: "" };
  });

  const [tables, setTables] = React.useState<Table[]>(initial.tables);
  const [expandedTableIds, setExpandedTableIds] = React.useState<string[]>(
    initial.tables.slice(0, 1).map((table) => table.id)
  );
  const tableRefs = React.useRef<Record<string, TableFormRef | null>>({});
  const [warning, setWarning] = React.useState(initial.warning);
  const [loadOpen, setLoadOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState<{
    description: string;
    confirm: () => void;
  } | null>(null);

  React.useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ tables }));
    } catch {
      setWarning(
        "浏览器存储不可用。请使用“下载”保留作品的 JSON 备份。 / Browser storage is unavailable. Use Download to keep a JSON backup of your work."
      );
    }
  }, [tables]);

  const handleAddTable = () => {
    const table = newTable(tables.length + 1);
    setTables((prev) => [...prev, table]);
    setExpandedTableIds((prev) => [...prev, table.id]);
  };

  const handleUpdateTable = React.useCallback(
    (id: string, updatedTable: Table) => {
      setTables((prev) =>
        prev.map((table) => (table.id === id ? { ...updatedTable, id } : table))
      );
    },
    []
  );

  const handleRemoveTable = React.useCallback((id: string) => {
    setTables((prev) => prev.filter((table) => table.id !== id));
    setExpandedTableIds((prev) => prev.filter((tableId) => tableId !== id));
    delete tableRefs.current[id];
  }, []);

  const flushAllChanges = async (): Promise<DataDictionary | null> => {
    const snapshots = await Promise.all(
      tables.map(
        (table) =>
          tableRefs.current[table.id]?.forceSave() ?? Promise.resolve(table)
      )
    );
    if (snapshots.some((table) => table === null)) {
      setExpandedTableIds(tables.map((table) => table.id));
      toast.error(
        "请先更正标出的字段，再保存或下载。 / Please correct the highlighted fields before saving or downloading."
      );
      return null;
    }
    const snapshot = { tables: snapshots as Table[] };
    setTables(snapshot.tables);
    return snapshot;
  };

  const save = async (download: boolean) => {
    setBusy(true);
    try {
      const snapshot = await flushAllChanges();
      if (!snapshot) return;
      if (download) {
        downloadDictionary(snapshot);
        toast.success(
          "数据字典已下载为 JSON 文件！ / Data dictionary downloaded as JSON!",
          {
            duration: 15000,
            description: (
              <div className="mt-2 max-h-[60dvh] overflow-y-auto space-y-3 leading-relaxed">
                <p lang="zh-Hans">
                  无需提交本页面。请前往 Moodle
                  中对应作业的提交页面，将刚下载的 JSON
                  文件与其他要求提交的文档一起上传，并按页面提示完成提交。在本页面点击“保存”或“下载”并不代表已提交作业。
                </p>
                <p lang="en">
                  You do not need to submit this page. Go to the relevant
                  assignment submission page in Moodle, upload your downloaded
                  JSON file alongside your other required documents, and follow
                  the instructions there to complete your submission. Saving or
                  downloading here does not submit your assignment.
                </p>
              </div>
            ),
          }
        );
      } else {
        localStorage.setItem(storageKey, JSON.stringify(snapshot));
        localStorage.setItem(draftKey, JSON.stringify(snapshot));
        toast.success(
          "数据字典已保存到浏览器本地存储！ / Data dictionary saved to local storage!"
        );
      }
    } catch {
      toast.error(
        "无法保存。如果浏览器存储被禁用，请改用“下载”。 / Could not save. If browser storage is blocked, use Download instead."
      );
    } finally {
      setBusy(false);
    }
  };

  const replaceDictionary = (dictionary: DataDictionary) => {
    setConfirmation({
      description:
        "要加载此存档并替换当前作品吗？如有需要，请先下载备份。 / Load this saved dictionary and replace your current work? Download a backup first if needed.",
      confirm: () => {
        tableRefs.current = {};
        setTables(dictionary.tables);
        setExpandedTableIds(
          dictionary.tables.slice(0, 1).map((table) => table.id)
        );
        setLoadOpen(false);
        toast.success(
          "数据字典加载成功！ / Data dictionary loaded successfully!"
        );
      },
    });
  };

  const handleLoadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        toast.info(
          "浏览器本地存储中没有已保存的数据。 / No saved data found in local storage."
        );
        return;
      }
      replaceDictionary(parseDictionary(saved));
    } catch {
      toast.error(
        "无法加载已保存的数据。请改选兼容的 JSON 备份文件。 / Failed to load saved data. Choose a compatible JSON backup instead."
      );
    }
  };

  const handleLoadFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(
        "请选择小于 10 MB 的 JSON 文件。 / Please choose a JSON file smaller than 10 MB."
      );
      return;
    }
    try {
      replaceDictionary(parseDictionary(await file.text()));
    } catch {
      toast.error(
        "这不是兼容的数据字典 JSON 文件。你当前的作品未被更改。 / This is not a compatible Data Dictionary JSON file. Your current work has not changed."
      );
    }
  };

  const handleLoadModelAnswer = () => {
    try {
      const freshModelDictionary = parseDictionary(
        JSON.stringify(modelDataDictionary)
      );
      tableRefs.current = {};
      setTables(freshModelDictionary.tables);
      setExpandedTableIds(
        freshModelDictionary.tables.slice(0, 1).map((table) => table.id)
      );
      toast.success(
        "参考答案加载成功！ / Model answer loaded successfully!"
      );
    } catch (error) {
      console.error("Error loading model data dictionary", error);
      toast.error(
        "无法加载参考答案。 / Failed to load model answer."
      );
    }
  };

  const handleClearAll = () => {
    setConfirmation({
      description:
        "确定要清空所有数据吗？此操作无法撤销。 / Are you sure you want to clear all data? This cannot be undone.",
      confirm: () => {
        const table = newTable(1);
        tableRefs.current = {};
        setTables([table]);
        setExpandedTableIds([table.id]);
        try {
          localStorage.removeItem(storageKey);
          localStorage.removeItem(draftKey);
        } catch {
          setWarning(
            "浏览器存储不可用。请使用“下载”保留你的作品。 / Browser storage is unavailable. Use Download to keep your work."
          );
        }
        toast.success("数据字典已清空！ / Data dictionary cleared!");
      },
    });
  };

  const actions = (
    <div className="flex flex-wrap justify-end gap-2">
      {isAuthenticated && (
        <Button
          variant="outline"
          onClick={handleLoadModelAnswer}
          disabled={busy}
          className="bg-white"
        >
          <Upload className="h-4 w-4 mr-2" />
          加载参考答案 / Load Model Answer
        </Button>
      )}
      <Button
        onClick={() => setLoadOpen(true)}
        disabled={busy}
        className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
      >
        <Upload className="h-4 w-4 mr-2" />
        加载已保存内容 / Load Saved
      </Button>
      <Button
        onClick={() => save(false)}
        disabled={busy}
        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
      >
        <Save className="h-4 w-4 mr-2" />
        保存 / Save
      </Button>
      <Button
        onClick={() => save(true)}
        disabled={busy}
        className="bg-blue-600 hover:bg-blue-700 shadow-sm"
      >
        <Download className="h-4 w-4 mr-2" />
        下载 / Download
      </Button>
      <Button variant="destructive" onClick={handleClearAll} disabled={busy}>
        <Trash2 className="h-4 w-4 mr-2" />
        清空全部 / Clear All
      </Button>
    </div>
  );

  return (
    <main className="container mx-auto px-3 sm:px-8 py-8 space-y-8 min-h-[calc(100vh-4rem)] max-w-[1400px]">
      <h1 className="text-3xl font-bold text-center text-slate-900">
        <span lang="en">Data Dictionary Builder</span> /{" "}
        <span lang="zh-Hans">数据字典构建工具</span>
      </h1>

      {warning && (
        <p
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm"
        >
          {warning}
        </p>
      )}

      {actions}

      <details
        open
        className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5 text-sm leading-relaxed text-blue-950"
      >
        <summary className="cursor-pointer font-semibold text-base">
          <span lang="zh-Hans">作业提交说明</span> /{" "}
          <span lang="en">Submitting your work</span>
        </summary>
        <div className="mt-3 space-y-3">
          <p lang="zh-Hans">
            本页面仅用于创建数据字典，无需提交本页面。完成后，请点击
            <strong>“下载 / Download”</strong>，将数据字典保存为{" "}
            <strong>JSON 文件</strong>。然后前往 Moodle
            中对应作业的提交页面，将该 JSON
            文件与其他要求提交的文档一起上传，并按页面提示完成提交。在本页面点击“保存”或“下载”并不代表已提交作业。
          </p>
          <p lang="en">
            Use this page to create your data dictionary—you do not need to
            submit the page itself. When you have finished, select{" "}
            <strong>Download</strong> to save your data dictionary as a{" "}
            <strong>JSON file</strong>. Then go to the relevant assignment
            submission page in Moodle, upload the JSON file alongside your other
            required documents, and follow the instructions there to complete
            your submission. Saving or downloading here does not submit your
            assignment.
          </p>
        </div>
      </details>

      <StudentHelp />

      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <Accordion
          type="multiple"
          className="w-full"
          value={expandedTableIds}
          onValueChange={setExpandedTableIds}
        >
          {tables.map((table) => (
            <AccordionItem
              value={table.id}
              key={table.id}
              className="border rounded-lg shadow-sm bg-card mb-4"
            >
              <AccordionTrigger className="px-4 sm:px-6 py-4 text-xl font-semibold hover:no-underline text-left break-all">
                Table: {table.tableName || "New Table"}
              </AccordionTrigger>
              <AccordionContent
                forceMount
                style={{
                  display: expandedTableIds.includes(table.id)
                    ? undefined
                    : "none",
                }}
                className="p-2 sm:p-6 pt-0"
              >
                <TableForm
                  table={table}
                  onUpdate={handleUpdateTable}
                  onRemove={handleRemoveTable}
                  ref={(el) => {
                    tableRefs.current[table.id] = el;
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <Button
          onClick={handleAddTable}
          className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Table 添加表
        </Button>
      </fieldset>

      <div className="border p-3 sm:p-6 rounded-lg shadow-sm bg-card space-y-4">
        <h2 className="text-2xl font-semibold">
          Formatted Data Dictionary Table View 格式化数据字典表视图
        </h2>
        <DataDictionaryTableDisplay dataDictionary={{ tables }} />
      </div>

      {actions}

      <AlertDialog open={loadOpen} onOpenChange={setLoadOpen}>
        <AlertDialogContent className="rounded-xl max-w-lg max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>加载已保存内容 / Load Saved</AlertDialogTitle>
            <AlertDialogDescription>
              恢复浏览器中保存的快照，或加载已下载的数据字典 JSON
              文件。替换当前作品前会请你确认。 / Restore a saved browser
              snapshot or load a Data Dictionary JSON download. You will be
              asked before replacing your current work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Button
            onClick={handleLoadFromLocalStorage}
            className="bg-sky-600 hover:bg-sky-700"
          >
            <Upload className="mr-2 h-4 w-4" />
            加载浏览器存档 / Load browser save
          </Button>
          <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
            <label
              htmlFor="dictionary-file"
              className="block font-medium text-sm"
            >
              加载已保存的 JSON 文件 / Load a saved JSON file
            </label>
            <input
              id="dictionary-file"
              type="file"
              accept=".json,application/json"
              onChange={handleLoadFile}
              className="hidden"
            />
            <Button
              variant="outline"
              className="bg-white"
              onClick={() =>
                document.getElementById("dictionary-file")?.click()
              }
            >
              选择文件 / Choose file
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>关闭 / Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <AlertDialogContent className="rounded-xl max-h-[90dvh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>请确认 / Please confirm</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消 / Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmation?.confirm();
                setConfirmation(null);
              }}
            >
              继续 / Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
};

export default DataDictionaryBuilder;
