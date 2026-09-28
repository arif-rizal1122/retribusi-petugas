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
  const dept = (user.department || (user as any).metadata?.department || '').toLowerCase();
  const roleCode = ((user as any).role_code || (user as any).metadata?.role_code || '').toLowerCase();
  const subRole = ((user as any).metadata?.sub_role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (
    user.opd_id === 3 ||
    ['DISPERINDAG', 'PERINDAG', 'DISPERINDAGKOP', 'PERDAGINKOP'].includes(opdCode) ||
    opdName.includes('perdagangan') ||
    opdName.includes('perindustrian') ||
    dept.includes('perdagangan') ||
    dept.includes('pasar') ||
    roleCode.includes('perindag') ||
    roleCode.includes('pasar') ||
    subRole.includes('pasar') ||
    email.includes('pasar') ||
    email.includes('disperindag') ||
    !!(user as any).access?.flags?.disperindag ||
    !!(user as any).access?.flags?.pasar
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

export const isPuprOfficer = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const opdCode = (user.opd?.code || '').toUpperCase();
  const opdName = (user.opd?.name || '').toLowerCase();
  const dept = (user.department || (user as any).metadata?.department || '').toLowerCase();
  const roleCode = ((user as any).role_code || (user as any).metadata?.role_code || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (
    user.opd_id === 9 ||
    opdCode === 'PUPR' ||
    opdCode === 'DINAS_PUPR' ||
    opdName.includes('pekerjaan umum') ||
    dept.includes('peralatan') ||
    dept.includes('workshop') ||
    roleCode.includes('pupr') ||
    email.includes('pupr') ||
    !!(user as any).access?.flags?.pupr ||
    !!(user as any).access?.flags?.pupr_aset
  );
};

export const isPerkimOfficer = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const opdCode = (user.opd?.code || '').toUpperCase();
  const opdName = (user.opd?.name || '').toLowerCase();
  const dept = (user.department || (user as any).metadata?.department || '').toLowerCase();
  const roleCode = ((user as any).role_code || (user as any).metadata?.role_code || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return (
    user.opd_id === 11 ||
    opdCode === 'PERKIM' ||
    opdCode === 'DISPERKIM' ||
    opdName.includes('perumahan') ||
    opdName.includes('permukiman') ||
    dept.includes('rusun') ||
    dept.includes('perumahan') ||
    roleCode.includes('perkim') ||
    roleCode.includes('rusun') ||
    email.includes('perkim') ||
    email.includes('rusun') ||
    !!(user as any).access?.flags?.perkim
  );
};

/**
 * Filter wewenang akses rute & menu petugas lapangan M-PAD
 * Berdasarkan Hybrid RBAC + OPD Scoping
 */
export const officerCanAccessPath = (user: User | null | undefined, path: string): boolean => {
  if (!user) return false;

  // Super Admin memiliki akses global
  if (user.role === 'super_admin') return true;

  // 1. ISOLASI KETAT PETUGAS PUPR: HANYA BOLEH MENGAKSES URUSAN PUPR & ALAT BERAT
  if (isPuprOfficer(user)) {
    const puprAllowedPaths = [
      '/dashboard',
      '/pupr-inspection',
      '/tasks',
      '/peta',
      '/profile',
      '/download',
      '/about',
      '/user-guide',
    ];
    return puprAllowedPaths.some((p) => path === p || path.startsWith(p + '/'));
  }

  // 2. ISOLASI KETAT PETUGAS DISPERINDAGKOP: HANYA BOLEH MENGAKSES LAYANAN PASAR & PERDAGANGAN
  if (isDisperindagOfficer(user)) {
    const disperindagAllowedPaths = [
      '/dashboard',
      '/pasar',
      '/disperindag-pasar',
      '/mpad-printer',
      '/qr-saya',
      '/scanner',
      '/profile',
      '/download',
      '/about',
      '/user-guide',
    ];
    return disperindagAllowedPaths.some((p) => path === p || path.startsWith(p + '/'));
  }

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

  // 4. Layanan Retribusi Persampahan Pasar & Kelurahan: KHUSUS petugas OPD DLH.
  //    Super admin tetap lolos lewat guard di atas; Bapenda/petugas lain DITOLAK.
  if (path === '/dlh-collector' || path.startsWith('/dlh-collector/') || path === '/sampah-dlh') {
    return isDlhOfficer(user);
  }

  // 5. Layanan Retribusi Pasar & Kios: KHUSUS petugas OPD Disperindag
  if (path === '/pasar' || path.startsWith('/pasar/') || path === '/disperindag-pasar') {
    return isDisperindagOfficer(user);
  }

  // 4. Verifikasi Pembayaran & Penerbitan SKPD Mandiri
  if (path === '/verification' || path.startsWith('/verification/')) {
    return user.role === 'opd';
  }
  if (path === '/create-skpd' || path.startsWith('/create-skpd/')) {
    return user.role === 'opd' || isDlhOfficer(user);
  }

  // 5. Reporting
  if (path === '/reporting' || path.startsWith('/reporting/')) {
    return true;
  }

  return true;
};

/**
 * Gate akses tab Inspektur Patroli (Sidak) di modul Parkir Dishub.
 * Hanya role opd / pengawas(kabid/kasubid) / super admin (matriks RBAC parkir).
 */
export const canParkingInspect = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const role = user.role as string;
  if (role === 'super_admin' || role === 'admin') return true;
  if (!isDishubOfficer(user)) return false;
  return ['opd', 'pengawas', 'kabid_pengawas', 'kasubid_pengawas'].includes(role);
};
