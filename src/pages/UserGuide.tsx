import { 
  BookOpen, 
  LogIn, 
  LayoutDashboard, 
  Users, 
  ScanLine, 
  Database, 
  FileText, 
  BarChart3, 
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Eye,
  Trash2,
  Edit3,
  Download,
  HelpCircle,
  Printer,
  Presentation,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GuideHighlight = ({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'emerald' | 'rose' | 'amber' | 'slate' }) => {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800',
    rose: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-800',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800',
    slate: 'bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 border-slate-100 dark:border-slate-800',
  };
  
  return (
    <span className={`px-1.5 py-0.5 rounded-md border font-black text-[0.9em] whitespace-nowrap ${colors[color]}`}>
      {children}
    </span>
  );
};

export default function UserGuide() {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'login',
      title: '1. Modul Login',
      icon: <LogIn className="w-6 h-6 text-emerald-500" />,
      color: 'emerald',
      description: 'Gerbang utama untuk memverifikasi identitas Anda sebagai petugas resmi Pemerintah Kota Baubau.',
      content: (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg">
            <img src="/user-guide/login.png" alt="Login" className="w-full h-auto" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
                <tr>
                  <th className="px-4 py-3 font-black uppercase tracking-wider">Aksi</th>
                  <th className="px-4 py-3 font-black uppercase tracking-wider">Cara</th>
                  <th className="px-4 py-3 font-black uppercase tracking-wider">Hasil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                <tr>
                  <td className="px-4 py-3 font-bold">Masuk</td>
                  <td className="px-4 py-3">Email & Password, tekan <GuideHighlight color="blue">Login</GuideHighlight></td>
                  <td className="px-4 py-3 italic">Buka Dashboard</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold">Cek Password</td>
                  <td className="px-4 py-3">Tekan ikon <Eye className="inline w-4 h-4" /></td>
                  <td className="px-4 py-3 italic">Karakter terlihat</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-bold">Membatalkan</td>
                  <td className="px-4 py-3">Tutup tab/aplikasi</td>
                  <td className="px-4 py-3 italic">Sesi aman</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard',
      title: '2. Modul Dashboard',
      icon: <LayoutDashboard className="w-6 h-6 text-blue-500" />,
      color: 'blue',
      description: 'Monitor hasil kerja harian Anda dalam satu layar ringkas.',
      content: (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg">
            <img src="/user-guide/dashboard.png" alt="Dashboard" className="w-full h-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Total Penerimaan Hari Ini', desc: 'Total uang (Rupiah) yang Anda terima hari ini.' },
              { label: 'Total Billing Aktif', desc: 'Tagihan yang sudah dibuat tapi belum lunas.' },
              { label: 'Wajib Retribusi Aktif', desc: 'Jumlah orang/toko yang sudah Anda data.' },
              { label: 'Peta Potensi', desc: 'Lokasi objek retribusi yang terdaftar di wilayah Anda.' }
            ].map((item, i) => (
              <div key={i} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 font-bold">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">{item.label}</p>
                <p className="text-xs text-gray-700 dark:text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'manajemen',
      title: '3. Manajemen Wajib Retribusi',
      icon: <Users className="w-6 h-6 text-orange-500" />,
      color: 'orange',
      description: 'Tempat mengelola "Buku Induk" Wajib Retribusi (Daftar, Edit, Hapus).',
      content: (
          <div className="space-y-8">
            <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg mb-4">
              <img src="/user-guide/wp_list.png" alt="Daftar WP" className="w-full h-auto" />
            </div>

            {/* Create Flow */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
              <h4 className="font-black text-sm uppercase tracking-tight mb-6 flex items-center gap-2 text-orange-600">
                <CheckCircle2 className="w-5 h-5" />
                Alur Pendaftaran (WP Baru)
              </h4>
              <div className="space-y-6">
                <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-md mb-4 bg-gray-50">
                  <img src="/user-guide/wp_form.png" alt="Registrasi Step 1" className="w-full h-auto" />
                </div>
                {[
                  { s: '1', t: 'Identitas & Objek', d: 'Masukkan NIK, Nama Lengkap, No. WhatsApp, Nama Toko, dan Alamat.' },
                  { s: '2', t: 'Kategori', d: 'Pilih jenis retribusi dan klasifikasi bidang usaha yang sesuai.' },
                  { s: '3', t: 'Persyaratan', d: 'Isi data teknis dan upload dokumentasi foto/berkas.' },
                  { s: '4', t: 'Lokasi Map', d: 'Tentukan titik koordinat tepat di peta untuk akurasi data.' },
                  { s: '5', t: 'Review & Selesai', d: 'Pastikan semua data benar, lalu tekan "Daftarkan".' }
                ].map((step) => (
                  <div key={step.s} className="flex gap-4 group">
                    <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-[10px] font-black text-orange-600 shrink-0 group-hover:scale-110 transition-transform">{step.s}</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">{step.t}</p>
                      <p className="text-xs text-gray-500 font-medium">{step.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Flow */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-800">
              <h4 className="font-black text-sm uppercase tracking-tight mb-8 flex items-center gap-3 text-blue-600">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Edit3 className="w-5 h-5" />
                </div>
                Cara Mengubah (Edit) Data
              </h4>
              <div className="space-y-6">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  1. Cari nama warga, tekan ikon <GuideHighlight color="blue">Pensil Biru</GuideHighlight>.
                </p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  2. Lakukan perubahan pada bagian yang salah.
                </p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  3. Simpan perubahan di tahap terakhir. Tekan <GuideHighlight color="rose">X</GuideHighlight> untuk membatalkan.
                </p>
              </div>
            </div>

            {/* Delete Flow */}
            <div className="bg-rose-50/50 dark:bg-rose-900/10 p-8 rounded-[2.5rem] border border-rose-100 dark:border-rose-800">
              <h4 className="font-black text-sm uppercase tracking-tight mb-8 flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                Cara Menghapus Data
              </h4>
              <div className="space-y-6">
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  1. Tekan tombol <GuideHighlight color="rose">Ikon Tempat Sampah Merah</GuideHighlight>.
                </p>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  2. Konfirmasi dengan menekan <GuideHighlight color="rose">Ya, Hapus</GuideHighlight> atau <GuideHighlight color="slate">Batal</GuideHighlight>.
                </p>
                <div className="flex items-start gap-3 p-4 bg-rose-600 text-white rounded-2xl shadow-lg">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <p className="text-[11px] font-black uppercase tracking-wider leading-relaxed">
                    DATA YANG DIHAPUS TIDAK DAPAT DIKEMBALIKAN.
                  </p>
                </div>
              </div>
            </div>
          </div>
      )
    },
    {
      id: 'scanner',
      title: '4. Modul Scanner Lapangan',
      icon: <ScanLine className="w-6 h-6 text-indigo-500" />,
      color: 'indigo',
      description: 'Mencari data warga secepat kilat menggunakan kamera.',
      content: (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg">
            <img src="/user-guide/scanner.png" alt="Scanner" className="w-full h-auto" />
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 font-bold">
              <p className="text-sm text-indigo-900 dark:text-indigo-300">Scan QR Code: Arahkan kamera ke QR kartu atau invoice.</p>
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800 font-bold">
              <p className="text-sm text-indigo-900 dark:text-indigo-300">Input Manual: Ketik NIK atau Nomor Invoice jika kamera sulit fokus.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'master',
      title: '5. Modul Master Data',
      icon: <Database className="w-6 h-6 text-slate-500" />,
      color: 'slate',
      description: 'Pusat informasi harga dan aturan (Read-Only).',
      content: (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg mb-4">
            <img src="/user-guide/master_data.png" alt="Master Data" className="w-full h-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['Jenis', 'Klasifikasi', 'Zona', 'Tarif'].map((tab) => (
              <div key={tab} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Tab {tab}</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Berisi referensi {tab.toLowerCase()} resmi yang berlaku.</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'billing',
      title: '6. Billing & Pembayaran',
      icon: <FileText className="w-6 h-6 text-teal-500" />,
      color: 'teal',
      description: 'Mencetak Nota (Tagihan) dan menerima Bayaran.',
      content: (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg overflow-x-auto">
            <img src="/user-guide/billing.png" alt="Billing List" className="w-full h-auto" />
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
            <h5 className="font-black text-xs text-emerald-600 uppercase tracking-widest">Alur Terima Setoran</h5>
            <div className="space-y-3 font-bold text-sm">
              <p>1. Cari Invoice <GuideHighlight color="amber">Pending</GuideHighlight>, tekan tombol <GuideHighlight color="emerald">Bayar</GuideHighlight>.</p>
              <p>2. Pastikan uang fisik sudah diterima dari wajib pajak.</p>
              <p>3. Tekan tombol <GuideHighlight color="emerald">KONFIRMASI BAYAR</GuideHighlight> di jendela modal.</p>
              <p>4. Status otomatis berubah menjadi <GuideHighlight color="emerald">Lunas</GuideHighlight>.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'reporting',
      title: '7. Modul Laporan',
      icon: <BarChart3 className="w-6 h-6 text-purple-500" />,
      color: 'purple',
      description: 'Laporan rekapitulasi setoran harian/bulanan.',
      content: (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg">
            <img src="/user-guide/reporting.png" alt="Reporting" className="w-full h-auto" />
          </div>
          <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-3xl border border-purple-100 dark:border-purple-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-purple-900 dark:text-purple-300">Ekspor Data CSV/Excel</p>
              <p className="text-xs text-purple-600">Klik tombol <GuideHighlight color="blue">Ekspor</GuideHighlight> untuk unduh rekap.</p>
            </div>
            <Download className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      )
    },
    {
      id: 'profile',
      title: '8. Profil & Logout',
      icon: <Users className="w-6 h-6 text-slate-500" />,
      color: 'slate',
      description: 'Kelola identitas dan keluar dari aplikasi aman.',
      content: (
        <div className="space-y-6">
          <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-lg">
            <img src="/user-guide/profile.png" alt="Profile" className="w-full h-auto" />
          </div>
          <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
            Tekan menu <GuideHighlight color="slate">Profile</GuideHighlight> di bawah, lalu pilih <GuideHighlight color="rose">Keluar dari Akun</GuideHighlight> untuk logout.
          </p>
        </div>
      )
    }
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 pt-8 px-6 lg:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-gray-500"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">User Guide</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Instruksi Operasional Petugas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/presentation')}
            className="print:hidden w-14 h-14 bg-[#0F2547] hover:bg-[#063852] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95"
            title="Lihat Presentasi"
          >
            <Presentation size={24} />
          </button>
          <button 
            onClick={handlePrint}
            className="print:hidden w-14 h-14 bg-emerald-600 hover:bg-emerald-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
            title="Cetak User Guide"
          >
            <Printer size={24} />
          </button>
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <BookOpen size={28} />
          </div>
        </div>
      </div>

      {/* Intro Card */}
      <div className="bg-[#0F2547] rounded-[3rem] p-10 text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-black mb-4 tracking-tighter">Siap Bertugas?</h2>
          <p className="text-blue-50/70 font-bold leading-relaxed text-sm">
            Klik dan pelajari setiap modul di bawah ini. Kami menandai teks-teks penting dengan <GuideHighlight color="amber">Warna Kuning</GuideHighlight> untuk membantu Anda fokus.
          </p>
        </div>
        <HelpCircle className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 rotate-12" />
      </div>

      {/* Sections Loop */}
      <div className="space-y-20">
        {sections.map((section) => (
          <div key={section.id} id={section.id} className="scroll-mt-24 group">
            <div className="flex items-center gap-6 mb-8">
              <div className={`w-16 h-16 rounded-3xl bg-${section.color}-500 flex items-center justify-center text-white shadow-lg shadow-${section.color}-500/20 group-hover:scale-110 transition-transform duration-500`}>
                {section.icon}
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">{section.title}</h3>
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest opacity-60">{section.description}</p>
              </div>
            </div>
            
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
              {section.content}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-10 bg-slate-50 dark:bg-gray-800 rounded-[3rem] border border-slate-100 dark:border-gray-700 text-center space-y-8">
        <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Butuh bantuan lebih lanjut?</h4>
        <div className="flex flex-wrap justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-none">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin OPD</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-none">
              <Download className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manual PDF</p>
          </div>
        </div>
      </div>
    </div>
  );
}
