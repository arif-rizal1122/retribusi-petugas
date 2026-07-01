type TaxObjectLike = {
  status?: string | null;
};

type TaxpayerLike = {
  is_active?: boolean | null;
  tax_objects?: TaxObjectLike[] | null;
};

export function getAccountStatus(taxpayer: TaxpayerLike) {
  return taxpayer.is_active
    ? {
        label: 'Akun Aktif',
        className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      }
    : {
        label: 'Akun Nonaktif',
        className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
      };
}

export function getObjectVerificationStatus(taxpayer: TaxpayerLike) {
  const objects = taxpayer.tax_objects || [];
  const active = objects.filter((object) => object.status === 'active').length;
  const pending = objects.filter((object) => object.status === 'pending').length;
  const rejected = objects.filter((object) => object.status === 'rejected').length;

  if (objects.length === 0) {
    return {
      label: 'Belum Ada Objek',
      description: 'Akun sudah ada, objek retribusi belum didaftarkan.',
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    };
  }

  if (active > 0) {
    return {
      label: active === objects.length ? 'Objek Terverifikasi' : `${active}/${objects.length} Objek Aktif`,
      description: 'Minimal satu objek sudah disetujui dan dapat ditagihkan.',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    };
  }

  if (pending > 0) {
    return {
      label: 'Menunggu Verifikasi',
      description: 'Objek sudah diajukan dan belum disetujui.',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    };
  }

  if (rejected > 0) {
    return {
      label: 'Objek Ditolak',
      description: 'Pengajuan objek ditolak dan perlu diperbaiki.',
      className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    };
  }

  return {
    label: 'Objek Belum Aktif',
    description: 'Objek belum dapat ditagihkan.',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  };
}
