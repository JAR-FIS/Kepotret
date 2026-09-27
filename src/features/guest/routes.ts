export const guestRoutes = {
  entry: (linkId: string) => `/j/${encodeURIComponent(linkId)}`,
  gallery: (linkId: string) => `/j/${encodeURIComponent(linkId)}/galeri`,
  photo: (linkId: string, photoId: string) => `/j/${encodeURIComponent(linkId)}/galeri/${encodeURIComponent(photoId)}`,
  ended: (linkId: string) => `/j/${encodeURIComponent(linkId)}/akses-berakhir`,
  postEventEnd: (linkId: string) => `/j/${encodeURIComponent(linkId)}/akhir-acara`,
} as const;
