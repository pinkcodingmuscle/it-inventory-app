import { useState } from "react";
import { BarChart3, FileText, Download } from "lucide-react";
import { DataState } from "../components/DataState";
import { downloadLowStock, downloadPurchaseHistory, downloadStockMovement, downloadStockOnHand } from "../lib/reports";

interface ReportDef {
  name: string;
  description: string;
  icon: typeof FileText;
  tag: string;
  dateRange: boolean;
  /** Downloads the CSV and returns how many rows it contained. */
  run: (from?: string, to?: string) => number;
}

const reports: ReportDef[] = [
  {
    name: "Stock On Hand Report",
    description: "Every inventory item with total, available, and checked-out quantities by location.",
    icon: FileText,
    tag: "Inventory",
    dateRange: false,
    run: downloadStockOnHand,
  },
  {
    name: "Low Stock Report",
    description: "Items at or below their reorder threshold with current stock levels.",
    icon: BarChart3,
    tag: "Inventory",
    dateRange: false,
    run: downloadLowStock,
  },
  {
    name: "Stock Movement Report",
    description: "Receipts, checkouts, returns, and adjustments within a date range, with who performed them.",
    icon: FileText,
    tag: "Transactions",
    dateRange: true,
    run: downloadStockMovement,
  },
  {
    name: "Purchase History Report",
    description: "All purchase orders within a date range with vendor and spend breakdown.",
    icon: FileText,
    tag: "Purchases",
    dateRange: true,
    run: downloadPurchaseHistory,
  },
];

const tagColors: Record<string, string> = {
  Inventory:    "bg-purple-100 text-purple-700",
  Transactions: "bg-amber-100 text-amber-700",
  Purchases:    "bg-indigo-100 text-indigo-700",
};

function ReportCard({ report }: { report: ReportDef }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const Icon = report.icon;
  const badRange = Boolean(from && to && from > to);

  function generate() {
    const rows = report.run(from || undefined, to || undefined);
    setResult(rows === 0 ? "Downloaded — no rows matched, so the file only has headers." : `Downloaded ${rows} row${rows === 1 ? "" : "s"}.`);
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          <Icon size={20} />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{report.name}</p>
          <p className="mt-1 text-sm text-gray-500">{report.description}</p>
          <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tagColors[report.tag]}`}>
            {report.tag}
          </span>
        </div>
      </div>
      {report.dateRange && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-500">
            From
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700" />
          </label>
          <label className="text-xs text-gray-500">
            To
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700" />
          </label>
        </div>
      )}
      <div className="mt-auto pt-5">
        <button
          onClick={generate}
          disabled={badRange}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <Download size={14} />
          Generate Report
        </button>
        <p className="mt-2 min-h-4 text-center text-xs text-gray-500" aria-live="polite">
          {badRange ? "“From” must be on or before “To”." : result ?? (report.dateRange ? "Leave dates empty for all time." : "")}
        </p>
      </div>
    </div>
  );
}

export default function Reports() {
  return (
    <DataState>
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Generate and export inventory reports as spreadsheets (CSV, opens in Excel).</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {reports.map((report) => <ReportCard key={report.name} report={report} />)}
      </div>
    </div>
    </DataState>
  );
}
