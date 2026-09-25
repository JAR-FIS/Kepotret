export const fe2Surfaces = [
  { code: 'H01', route: '/', shell: 'SH01', navigation: 'NAV01', template: 'TP01' },
  { code: 'H02', route: '/cara-kerja', shell: 'SH01', navigation: 'NAV01', template: 'TP02' },
  { code: 'H03', route: '/harga', shell: 'SH01', navigation: 'NAV01', template: 'TP03' },
  { code: 'H04', route: '/faq', shell: 'SH01', navigation: 'NAV01', template: 'TP02' },
  { code: 'H05', route: '/bantuan', shell: 'SH01', navigation: 'NAV01', template: 'TP02' },
  { code: 'H06', route: '/kebijakan-privasi', shell: 'SH01', navigation: 'NAV01', template: 'TP04' },
  { code: 'H07', route: '/syarat-ketentuan', shell: 'SH01', navigation: 'NAV01', template: 'TP04' },
  { code: 'H08', route: '/keamanan', shell: 'SH01', navigation: 'NAV01', template: 'TP02' },
  { code: 'H09', route: 'not-found.tsx', shell: 'SH02', template: 'TP05' },
  { code: 'H10', route: '/akses-ditolak', shell: 'SH02', template: 'TP05' },
  { code: 'H11', route: 'error.tsx / global-error.tsx', shell: 'SH02', template: 'TP05' },
  { code: 'H12', route: '/maintenance', shell: 'SH02', template: 'TP05' },
  { code: 'H13', route: '/kompatibilitas', shell: 'SH02', template: 'TP05' },
  { code: 'H14', route: '/masuk', shell: 'SH02', template: 'TP06' },
  { code: 'H15', route: '/auth/google/memproses', shell: 'SH02', template: 'TP07' },
  { code: 'H16', route: '/masuk/gagal', shell: 'SH02', template: 'TP05' },
  { code: 'H17', route: '/undangan/kolaborator/[invitationId]', shell: 'SH02', template: 'TP08' },
  { code: 'H18', route: '/undangan/kolaborator/tidak-valid', shell: 'SH02', template: 'TP05' },
  { code: 'H19', route: '/akun', shell: 'SH03', navigation: 'NAV02', template: 'TP08' },
  { code: 'H23', route: '/masuk-ulang', shell: 'SH02', template: 'TP05' },
] as const;

export const fe2SharedSurfaces = [
  'M35', 'D01', 'D10', 'P02', 'A17', 'T16', 'E13', 'E14', 'E15', 'E16', 'E17',
  'C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08', 'C09', 'O07', 'O08',
] as const;
