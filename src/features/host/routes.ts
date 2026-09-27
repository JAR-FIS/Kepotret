export const hostRoutes = {
  dashboard: '/dashboard',
  albums: '/album',
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
