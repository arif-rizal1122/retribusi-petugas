import { useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Calendar as CalendarIcon,
  PieChart,
  FileText,
  TrendingUp,
  Loader2,
  DollarSign,
  Table as TableIcon
} from 'lucide-react';
import { api } from '../lib/api';

interface RevenueByType {
  type: string;
  amount: number;
  percentage: number;
  target: number;
}

interface RecentReport {
  id: number;
  taxpayer_name: string;
  type: string;
  amount: number;
  date: string;
  method: string;
  status: string;
}

interface ReportSummary {
  total_revenue: number;
  revenue_by_type: RevenueByType[];
  stats: {
    total_transactions: number;
    avg_transaction: number;
  };
}

export default function Reporting() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  
  const [periodStart, setPeriodStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('month');

  const handleFilterChange = (type: 'day' | 'week' | 'month') => {
    setFilterType(type);
    const end = new Date();
    const start = new Date();

    if (type === 'day') {
      // Today already set
    } else if (type === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (type === 'month') {
      start.setMonth(end.getMonth() - 1);
    }

    setPeriodStart(start.toISOString().split('T')[0]);
    setPeriodEnd(end.toISOString().split('T')[0]);
  };

  const fetchReportingData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, recentRes] = await Promise.all([
        api.get('/api/reports/summary', { params: { start_date: periodStart, end_date: periodEnd } }),
        api.get('/api/reports/recent')
      ]);
      setSummary(summaryRes);
      setRecentReports(recentRes);
    } catch (error) {
      console.error('Error fetching reporting data:', error);
    } finally {
      setLoading(false);
    }
  }, [periodStart, periodEnd]);

  useEffect(() => {
    fetchReportingData();
  }, [fetchReportingData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = () => {
    if (!summary) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Kategori,Jumlah,Persentase,Target\n";
    summary.revenue_by_type.forEach(row => {
      csvContent += `${row.type},${row.amount},${row.percentage}%,${row.target}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Petugas_${periodStart}_ke_${periodEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Laporan Petugas</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Rekapitulasi dan analisis data operasional lapangan
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <input 
              type="date" 
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white p-0"
            />
            <span className="text-slate-400">sampai</span>
            <input 
              type="date" 
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white p-0"
            />
          </div>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-1">
          <button 
            onClick={() => handleFilterChange('day')}
            className={`flex-1 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'day' ? 'bg-white dark:bg-slate-700 text-[#0F2547] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Harian
          </button>
          <button 
            onClick={() => handleFilterChange('week')}
            className={`flex-1 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'week' ? 'bg-white dark:bg-slate-700 text-[#0F2547] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pekanan
          </button>
          <button 
            onClick={() => handleFilterChange('month')}
            className={`flex-1 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filterType === 'month' ? 'bg-white dark:bg-slate-700 text-[#0F2547] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Bulanan
          </button>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">Pendapatan Terinput</p>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.total_revenue || 0)}
          </p>
          <p className="text-sm text-emerald-600 mt-1">Periode Terpilih</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">Jumlah Transaksi</p>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {summary?.stats.total_transactions || 0}
          </p>
          <p className="text-sm text-blue-600 mt-1">Total Entri</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">Rata-rata Setoran</p>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatCurrency(summary?.stats.avg_transaction || 0)}
          </p>
          <p className="text-sm text-purple-600 mt-1">Per Transaksi</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Kontribusi per Objek
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                summary?.revenue_by_type.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.type}</span>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(item.amount)}</p>
                        <p className="text-xs text-slate-500">{item.percentage}% dari total</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-blue-600" />
              Entri Terakhir
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-750 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Wajib Retribusi</th>
                  <th className="px-6 py-4 text-right">Setoran</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      Memuat data...
                    </td>
                  </tr>
                ) : recentReports.length > 0 ? (
                  recentReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-white">{report.taxpayer_name}</p>
                        <p className="text-xs text-slate-500">{report.type}</p>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-blue-600">
                        {formatCurrency(report.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-md">
                          {report.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      Belum ada data setoran.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
