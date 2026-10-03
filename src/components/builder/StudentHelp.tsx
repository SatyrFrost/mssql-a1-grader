import { BookOpen } from "lucide-react";

export function StudentHelp() {
  return (
    <details className="rounded-lg border bg-slate-50 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-blue-800">
        <BookOpen className="mr-2 inline h-4 w-4" />
        <span lang="zh-Hans">学生帮助 · 使用说明</span> / <span lang="en">Student help · How it works</span>
      </summary>
      <div lang="zh-Hans" className="mt-4 space-y-3 leading-relaxed text-slate-700">
        <h3 className="font-semibold text-slate-900">简体中文</h3>
        <p>本页面是一个交互式工具，学生可以使用它创建和管理数据字典。你可以：</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>添加新表并设置表名。</li>
          <li>为每个表添加、编辑和删除列（字段）。</li>
          <li>为每列设置名称、数据类型（例如 VARCHAR、INT）、大小、是否为主键或外键、是否允许为空、是否自动递增，以及需要时使用的默认值和列描述。</li>
          <li>将内容保存到浏览器的本地存储，加载之前保存的数据，将数据字典下载为 <strong>JSON 文件</strong>，或清空所有内容后重新开始。</li>
        </ul>
        <p>使用每列上方的 <strong>Up（上移）</strong>和 <strong>Down（下移）</strong>按钮调整列的顺序。保存或下载时，系统会检查必填的名称和描述，以及填写的大小是否为正整数。</p>
        <p><strong>Save（保存）</strong>会在当前浏览器中保存一份快照。<strong>Download（下载）</strong>会生成可携带的 JSON 备份文件。<strong>Load Saved（加载已保存内容）</strong>可以恢复浏览器中保存的快照，或加载兼容的 JSON 文件。确认加载后，当前数据字典将被替换。</p>
        <p>当浏览器存储可用时，草稿会自动保存。保存的数据仅属于当前浏览器和 Moodle 网站，并不与个人账户绑定：离开页面、更换设备或使用共用电脑时，请先下载你的作品。本活动不会提交作品，也不会报告完成状态。</p>
      </div>
      <div lang="en" className="mt-6 space-y-3 border-t pt-4 leading-relaxed text-slate-700">
        <h3 className="font-semibold text-slate-900">English</h3>
        <p>This page is an interactive tool where students can create and manage their Data Dictionaries. They can:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Add new tables and define their names.</li>
          <li>For each table, they can add, edit, and remove columns.</li>
          <li>For each column, they can specify details like its name, data type (e.g., VARCHAR, INT), size, whether it's a primary key or foreign key, if it's optional, if it auto-increments, its default value if necessary, and a description.</li>
          <li>They can save their work to their browser's local storage, load previously saved data, download their data dictionary as a <strong>JSON file</strong>, or clear all their entries to start fresh.</li>
        </ul>
        <p>Use <strong>Up</strong> and <strong>Down</strong> above a column to change its position. Required names and descriptions, and positive whole-number sizes, are checked when you save or download.</p>
        <p><strong>Save</strong> keeps a snapshot in this browser. <strong>Download</strong> makes a portable JSON backup. <strong>Load Saved</strong> can restore the browser snapshot or a compatible JSON file. Loading replaces your current dictionary after confirmation.</p>
        <p>Drafts are kept automatically when browser storage is available. Storage is specific to this browser and Moodle site, not your account: download your work before leaving, changing devices, or using a shared computer. This activity does not submit work or report completion.</p>
      </div>
    </details>
  );
}
