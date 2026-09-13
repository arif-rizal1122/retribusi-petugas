import { User } from '../types';

/**
 * Helper deteksi OPD petugas lapangan M-PAD
 */
export const isBapendaOfficer = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const opdCode = (user.opd?.code || '').toUpperCase();
  const opdName = (user.opd?.name || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  return (
    user.opd_id === 5 ||
    opdCode === 'BAPENDA' ||
    opdCode === 'DISPENDA' ||
    opdName.includes('pendapatan daerah') ||
    dept.includes('pendapatan daerah')
  );
};

export const isDishubOfficer = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const opdCode = (user.opd?.code || '').toUpperCase();
  const opdName = (user.opd?.name || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  return (
    user.opd_id === 2 ||
    opdCode === 'DISHUB' ||
    opdName.includes('perhubungan') ||
    dept.includes('perhubungan')
  );
};

export const isPerikananOfficer = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const opdCode = (user.opd?.code || '').toUpperCase();
  const opdName = (user.opd?.name || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  return (
    user.opd_id === 10 ||
    user.opd_id === 12 ||
    user.opd_id === 26 ||
    opdCode === 'PERIKANAN' ||
    opdCode === 'DISKAN' ||
    opdName.includes('perikanan') ||
    dept.includes('perikanan')
  );
};

export const isDlhOfficer = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const opdCode = (user.opd?.code || '').toUpperCase();
  const opdName = (user.opd?.name || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  return (
    user.opd_id === 4 ||
    opdCode === 'DLH' ||
    opdName.includes('lingkungan hidup') ||
    dept.includes('lingkungan hidup')
  );
};

export const isDisperindagOfficer = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const opdCode = (user.opd?.code || '').toUpperCase();
  const opdName = (user.opd?.name || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  return (
    user.opd_id === 3 ||
    opdCode === 'DISPERINDAG' ||
    opdName.includes('perdagangan') ||
    dept.includes('perdagangan')
  );
};

export const isPariwisataOfficer = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const opdCode = (user.opd?.code || '').toUpperCase();
  const opdName = (user.opd?.name || '').toLowerCase();
  const dept = (user.department || '').toLowerCase();
  return (
    user.opd_id === 16 ||
    opdCode === 'PARIWISATA' ||
    opdName.includes('pariwisata') ||
    dept.includes('pariwisata')
  );
};

/**
 * Filter wewenang akses rute & menu petugas lapangan M-PAD
 * Berdasarkan Hybrid RBAC + OPD Scoping
 */
export const officerCanAccessPath = (user: User | null | undefined, path: string): boolean => {
  if (!user) return false;

  // Super Admin dan Admin Bapenda memiliki akses global
  if (user.role === 'super_admin') return true;

  // Halaman publik/umum operasional yang selalu boleh diakses semua petugas
  const commonOfficerPaths = [
    '/dashboard',
    '/peta',
    '/tasks',
    '/taxpayers',
    '/billing',
    '/officer-payment',
    '/scanner',
    '/qr-saya',
    '/payment-confirmation',
    '/mpad-printer',
    '/tax-calculator',
    '/user-guide',
    '/field-check',
    '/presentation',
    '/download',
    '/about',
    '/profile',
  ];

  if (commonOfficerPaths.some((p) => path === p || path.startsWith(p + '/'))) {
    return true;
  }

  // 1. Layanan Parkir Tepi Jalan & Khusus: Khusus Dishub
  if (path === '/parkir' || path.startsWith('/parkir/')) {
    return isDishubOfficer(user);
  }

  // 2. Layanan Lelang Ikan TPI: Khusus Dinas Perikanan
  if (path === '/tpi-lelang' || path.startsWith('/tpi-lelang/')) {
    return isPerikananOfficer(user);
  }

  // 3. Layanan PBB-P2 & BPHTB: Khusus Bapenda
  if (path === '/pbb-bapenda' || path.startsWith('/pbb-bapenda/')) {
    return isBapendaOfficer(user);
  }
  if (path === '/bphtb' || path.startsWith('/bphtb/')) {
    return isBapendaOfficer(user);
  }

  // 4. Layanan Retribusi Persampahan Pasar & Kelurahan: Khusus DLH & Bapenda
  if (path === '/dlh-collector' || path.startsWith('/dlh-collector/') || path === '/sampah-dlh') {
    return isDlhOfficer(user) || isBapendaOfficer(user);
  }

  // 4. Verifikasi Pembayaran & Penerbitan SKPD Mandiri
  if (path === '/verification' || path.startsWith('/verification/')) {
    return user.role === 'opd';
  }
  if (path === '/create-skpd' || path.startsWith('/create-skpd/')) {
    return user.role === 'opd' || isBapendaOfficer(user) || isDlhOfficer(user);
  }

  // 5. Reporting
  if (path === '/reporting' || path.startsWith('/reporting/')) {
    return true;
  }

  return true;
};
