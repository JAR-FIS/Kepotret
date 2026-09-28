export const hostRoutes = {
  dashboard: '/dashboard',
  albums: '/album',
  collaborations: '/kolaborasi',
  assignedAlbums: '/kolaborasi/album',
  createAlbum: '/album/baru',
  album: (albumId: string) => `/album/${encodeURIComponent(albumId)}`,
  setup: (albumId: string, step: string) =>
    `/album/${encodeURIComponent(albumId)}/setup/${step}`,
  ready: (albumId: string) => `/album/${encodeURIComponent(albumId)}/siap`,
  gallery: (albumId: string) => `/album/${encodeURIComponent(albumId)}/galeri`,
  photo: (albumId: string, photoId: string) => `/album/${encodeURIComponent(albumId)}/galeri/${encodeURIComponent(photoId)}`,
  trash: (albumId: string) => `/album/${encodeURIComponent(albumId)}/galeri/sampah`,
  sharing: (albumId: string) => `/album/${encodeURIComponent(albumId)}/berbagi`,
  preparation: (albumId: string) => `/album/${encodeURIComponent(albumId)}/berbagi/panduan`,
  checkout: (albumId: string, packageVersionId: string) => `/album/${encodeURIComponent(albumId)}/checkout/${encodeURIComponent(packageVersionId)}`,
  paymentStatus: (albumId: string, transactionId: string) => `/album/${encodeURIComponent(albumId)}/pembayaran/${encodeURIComponent(transactionId)}/status`,
  payments: (albumId: string) => `/album/${encodeURIComponent(albumId)}/pembayaran`,
  payment: (albumId: string, transactionId: string) => `/album/${encodeURIComponent(albumId)}/pembayaran/${encodeURIComponent(transactionId)}`,
  upgrade: (albumId: string) => `/album/${encodeURIComponent(albumId)}/upgrade`,
  exports: (albumId: string) => `/album/${encodeURIComponent(albumId)}/ekspor`,
  export: (albumId: string, exportJobId: string) => `/album/${encodeURIComponent(albumId)}/ekspor/${encodeURIComponent(exportJobId)}`,
  reschedule: (albumId: string) => `/album/${encodeURIComponent(albumId)}/jadwal-ulang`,
  lifecycle: (albumId: string) => `/album/${encodeURIComponent(albumId)}/retensi`,
  recovery: (albumId: string) => `/album/${encodeURIComponent(albumId)}/pemulihan`,
  recoveryMedia: (albumId: string) => `/album/${encodeURIComponent(albumId)}/pemulihan/media`,
  collaborators: (albumId: string) => `/album/${encodeURIComponent(albumId)}/kolaborator`,
  invitations: (albumId: string) => `/album/${encodeURIComponent(albumId)}/kolaborator/undangan`,
  permissions: (albumId: string) => `/album/${encodeURIComponent(albumId)}/izin`,
} as const;

export const setupSteps = [
  'acara',
  'jadwal',
  'akses',
  'moderasi',
  'desain',
  'paket',
  'kolaborator',
  'review',
] as const;

export type SetupStep = (typeof setupSteps)[number];
