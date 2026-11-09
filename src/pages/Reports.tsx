import { BarChart3, FileText, Download } from "lucide-react";

const reports = [
  {
    name: "Stock On Hand Report",
    description: "Every inventory item with total, available, and checked-out quantities by location.",
    icon: FileText,
    tag: "Inventory",
  },
  {
    name: "Low Stock Report",
    description: "Items at or below their reorder threshold with current stock levels.",
    icon: BarChart3,
    tag: "Inventory",
  },
  {
    name: "Stock Movement Report",
    description: "Receipts, checkouts, returns, and adjustments within a date range, with who performed them.",
    icon: FileText,
    tag: "Transactions",
  },
  {
    name: "Purchase History Report",
    description: "All purchase orders within a date range with vendor and spend breakdown.",
    icon: FileText,
    tag: "Purchases",
  },
];

const tagColors: Record<string, string> = {
  Inventory:    "bg-purple-100 text-purple-700",
  Transactions: "bg-amber-100 text-amber-700",
  Purchases:    "bg-indigo-100 text-indigo-700",
};

export default function Reports() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-gray-500">Generate and export inventory reports.</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <div key={report.name} className="flex flex-col rounded-xl border border-gray-200 bg-white p-6">
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
              <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
                <Download size={14} />
                Generate Report
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}