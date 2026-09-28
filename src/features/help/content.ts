export type HelpLocale = 'id' | 'en';

export type TutorialStep = { id: string; title: string; body: string; note?: string };
export type TutorialSection = { id: string; title: string; lead: string; steps: TutorialStep[] };

type HelpContent = {
  navigation: { home: string; host: string; collaborator: string; albums: string; language: string; indonesian: string; english: string; switchToLight: string; switchToDark: string };
  landing: { eyebrow: string; title: string; description: string; guideLabel: string; guideTitle: string; guideDescription: string; guideAction: string; collaboratorTitle: string; collaboratorDescription: string; collaboratorAction: string; quickTitle: string; quickDescription: string; createAction: string; albumsAction: string };
  host: { eyebrow: string; title: string; description: string; contents: string; progress: string; back: string; start: string; sections: TutorialSection[]; finishTitle: string; finishDescription: string; finishAction: string };
  collaborator: { eyebrow: string; title: string; description: string; back: string; sections: { title: string; body: string }[] };
};

export const helpContent: Record<HelpLocale, HelpContent> = {
  id: {
    navigation: { home: 'Pusat bantuan', host: 'Panduan Host', collaborator: 'Panduan kolaborator', albums: 'Album saya', language: 'Bahasa', indonesian: 'Bahasa Indonesia', english: 'Bahasa Inggris', switchToLight: 'Ganti ke tema terang', switchToDark: 'Ganti ke tema gelap' },
    landing: { eyebrow: 'BANTUAN KEPOTRET', title: 'Siapkan album, bagikan momen.', description: 'Panduan singkat yang mengikuti alur nyata Kepotret, dari membuat album hingga mengelola foto setelah acara.', guideLabel: 'MULAI DI SINI', guideTitle: 'Panduan untuk Host', guideDescription: 'Pelajari Waktu Potret, batas foto, QR, pengaturan album, galeri, pembayaran, dan pemulihan dalam langkah yang mudah diikuti.', guideAction: 'Buka panduan Host', collaboratorTitle: 'Panduan kolaborator', collaboratorDescription: 'Pelajari cara menerima undangan, melihat album yang ditugaskan, dan memahami izin di setiap album.', collaboratorAction: 'Buka panduan kolaborator', quickTitle: 'Sudah punya album?', quickDescription: 'Buka ruang kerja untuk melanjutkan persiapan atau melihat album yang sudah dibuat.', createAction: 'Buat album', albumsAction: 'Lihat album saya' },
    host: {
      eyebrow: 'PANDUAN HOST', title: 'Dari album baru hingga momen terakhir.', description: 'Ikuti alur ini sesuai kebutuhan acaramu. Setiap tindakan di ruang kerja tetap mengikuti status album, izin, dan keputusan server.', contents: 'Isi panduan', progress: '19 langkah dalam 5 bagian', back: 'Pusat bantuan', start: 'Mulai buat album',
      sections: [
        { id: 'mulai-album', title: 'Mulai album', lead: 'Buat ruang untuk mengumpulkan momen, lalu tetapkan waktu kamera dan reveal.', steps: [
          { id: 'buat-album', title: 'Membuat album', body: 'Mulai dari draft album. Setelah dibuat, lanjutkan persiapan acara sebelum membagikan QR kepada peserta.' },
          { id: 'informasi-acara', title: 'Informasi acara', body: 'Isi nama, lokasi, kategori, dan zona waktu acara. Zona waktu ini digunakan untuk menampilkan Waktu Potret dan jadwal lain.' },
          { id: 'waktu-potret', title: 'Waktu Potret', body: 'Tentukan Mulai memotret dan Berhenti memotret. Kamera baru tersedia saat server membuka periode ini dan tidak menerima pengambilan baru setelah berakhir.', note: 'QR atau tautan dapat tetap berguna sesudah kamera tutup, sesuai aturan akses dan reveal.' },
          { id: 'reveal', title: 'Reveal D+1, D+3, D+5, D+7', body: 'Pilih jeda publikasi yang disediakan. Reveal menentukan kapan foto dapat dilihat; waktunya terpisah dari periode kamera.' },
        ] },
        { id: 'siapkan-aturan', title: 'Siapkan pengalaman peserta', lead: 'Pilih batas, akses, dan tampilan yang cocok untuk album ini.', steps: [
          { id: 'batas-foto', title: 'Batas foto per peserta', body: 'Batas awal adalah 30 foto per sesi peserta. Kamu dapat memilih 5, 10, 30, 50, 70, atau 100 selama kapasitas album mengizinkan. Batas sesi tidak mencadangkan kuota album.' },
          { id: 'akses-pin', title: 'Akses dan PIN', body: 'PIN album bersifat opsional. Peserta masuk melalui QR atau tautan tanpa membuat akun; aturan akses tetap diperiksa oleh server.' },
          { id: 'moderasi', title: 'Moderasi', body: 'Atur cara foto tampil sesuai pengaturan album. Foto yang disembunyikan atau dihapus sementara tetap mengikuti aturan kapasitas dan siklus hidup.' },
          { id: 'desain', title: 'Desain album', body: 'Tinjau pilihan sampul yang tersedia untuk album. Tampilan ini membantu peserta mengenali acara saat membuka tautan.' },
          { id: 'paket', title: 'Paket dan kapasitas', body: 'FREE30 menyediakan 30 foto per album. Paket berbayar dan upgrade berlaku per album; pilihan paket saat setup belum menambah kapasitas sebelum pembayaran terverifikasi.' },
          { id: 'review-setup', title: 'Review Setup', body: 'Periksa ringkasan dan masalah yang ditandai server sebelum konfirmasi. Album gratis dapat menjadi siap; pilihan berbayar dilanjutkan ke pembayaran.' },
        ] },
        { id: 'saat-acara', title: 'Bagikan dan kelola', lead: 'Siapkan QR, ikuti status album, dan rawat foto yang masuk.', steps: [
          { id: 'qr', title: 'QR dan Siapkan Acara', body: 'Bagikan QR atau tautan aktif kepada peserta. Setelah Waktu Potret berakhir, tautan dapat tetap membuka pengalaman reveal atau galeri saat server mengizinkan, tetapi kamera tidak terbuka lagi.' },
          { id: 'edit-pengaturan', title: 'Edit pengaturan album', body: 'Buka bagian setup atau pengelolaan album untuk meninjau pengaturan yang tersedia. Kemampuan mengedit bergantung pada status album, siklus hidup, izin, dan aturan server; tidak semua pengaturan selalu dapat diubah.', note: 'Jika server menolak perubahan karena data sudah berubah, muat ulang keadaan terbaru sebelum mencoba lagi.' },
          { id: 'galeri-moderasi', title: 'Galeri dan moderasi', body: 'Tinjau kiriman, kelola visibilitas, dan gunakan tindakan moderasi yang diizinkan. Foto yang dihapus sementara tetap dihitung dalam kapasitas album.' },
          { id: 'sharing', title: 'Berbagi', body: 'Gunakan tautan album dan kontrol berbagi yang aktif. Perubahan tautan lama memengaruhi akses berikutnya, jadi perbarui materi QR yang telah tersebar bila tautan dirotasi.' },
        ] },
        { id: 'kapasitas-arsip', title: 'Kapasitas dan arsip', lead: 'Tindakan komersial dan unduhan mengikuti jendela waktu serta izin server.', steps: [
          { id: 'upgrade', title: 'Upgrade paket', body: 'Pilih kapasitas lebih tinggi untuk album bila checkout masih tersedia. Pembelian ditutup 120 menit sebelum Waktu Potret berakhir; hasil pembayaran diperiksa dari status server.' },
          { id: 'zip', title: 'Ekspor ZIP', body: 'Buat arsip ZIP ketika album dan izin mengizinkan. Pembuatan berlangsung bertahap; unduhan tersedia setelah siap dan tautannya memiliki masa berlaku.' },
          { id: 'reschedule', title: 'Jadwal ulang', body: 'Tinjau perubahan Waktu Potret sebelum menyimpan. Server menentukan batas jadwal, versi terbaru, dan dampak pembayaran yang tertunda.' },
        ] },
        { id: 'siklus-album', title: 'Sesudah acara', lead: 'Pahami batas akses dan pilihan pemulihan yang tetap tersedia.', steps: [
          { id: 'retensi', title: 'Retensi D+30', body: 'Akses normal berakhir menurut jadwal retensi album. Pemulihan foto yang dihapus juga berakhir pada D+30; tindakan sesudahnya mengikuti status server.' },
          { id: 'pemulihan', title: 'Pemulihan pemilik D+30 hingga D+37', body: 'Dalam jendela tetap ini, hanya Pemilik yang dapat mengaktifkan akses pemulihan untuk media yang masih tersedia dan membuat ZIP pemulihan. Aktivasi tidak memperpanjang tenggat D+37.' },
        ] },
      ], finishTitle: 'Siap melanjutkan?', finishDescription: 'Buka album yang sudah ada atau buat album baru. Panduan ini dapat kamu buka kembali dari ruang kerja Host.', finishAction: 'Lihat album saya',
    },
    collaborator: { eyebrow: 'PANDUAN KOLABORATOR', title: 'Bekerja bersama dengan akses yang jelas.', description: 'Kolaborasi ditetapkan per album. Kamu masuk dengan akun biasa dan tidak memerlukan akun khusus WO/EO.', back: 'Pusat bantuan', sections: [
      { title: 'Menerima undangan', body: 'Buka tautan undangan dan periksa nama acara serta izin yang diberikan. Masuk dengan alamat email yang menerima undangan. Jika perlu Google sign-in, alamat undangan tetap dibawa melalui proses masuk dengan aman. Terima undangan untuk membuka album.' },
      { title: 'Melihat album untukmu', body: 'Ruang Kolaborator menampilkan album yang memang ditugaskan kepadamu. Album milikmu sendiri tetap berada di Album Saya. Status undangan dan akses mengikuti keputusan server.' },
      { title: 'Memahami izin per album', body: 'Pemilik dapat memberi izin setup, moderasi, dan ekspor ZIP secara terpisah. Izin pada satu album tidak otomatis berlaku pada album lain. Lihat halaman Izin Saya untuk akses saat ini.' },
      { title: 'Batas akses', body: 'Pemilik tetap mengelola kolaborator, konfirmasi akhir setup, pembayaran, rotasi tautan, jadwal ulang, pemulihan, dan pemulihan foto terhapus. Akses dapat dicabut oleh Pemilik.' },
    ] },
  },
  en: {
    navigation: { home: 'Help center', host: 'Host guide', collaborator: 'Collaborator guide', albums: 'My albums', language: 'Language', indonesian: 'Indonesian', english: 'English', switchToLight: 'Switch to light theme', switchToDark: 'Switch to dark theme' },
    landing: { eyebrow: 'KEPOTRET HELP', title: 'Set up the album. Share the moments.', description: 'A concise guide through the real Kepotret flow, from creating an album to managing photos after the event.', guideLabel: 'START HERE', guideTitle: 'Guide for Hosts', guideDescription: 'Learn capture timing, photo limits, QR sharing, album settings, the gallery, payments, and recovery in clear steps.', guideAction: 'Open the Host guide', collaboratorTitle: 'Collaborator guide', collaboratorDescription: 'Learn how to accept an invitation, find assigned albums, and understand album permissions.', collaboratorAction: 'Open the collaborator guide', quickTitle: 'Already have an album?', quickDescription: 'Open your workspace to continue setup or review an existing album.', createAction: 'Create an album', albumsAction: 'View my albums' },
    host: {
      eyebrow: 'HOST GUIDE', title: 'From a new album to the final moment.', description: 'Follow the parts relevant to your event. Workspace actions always depend on album state, permissions, and server decisions.', contents: 'Guide contents', progress: '19 steps in 5 sections', back: 'Help center', start: 'Create an album',
      sections: [
        { id: 'mulai-album', title: 'Start an album', lead: 'Create a place for moments, then set camera availability and reveal.', steps: [
          { id: 'buat-album', title: 'Create an album', body: 'Begin with a draft album. Complete event setup before sharing its QR code with participants.' },
          { id: 'informasi-acara', title: 'Event details', body: 'Enter the event name, location, category, and time zone. That time zone is used to display the capture window and other schedules.' },
          { id: 'waktu-potret', title: 'Capture window', body: 'Set when capturing starts and stops. The camera opens only when the server allows it and cannot start new captures after the window ends.', note: 'The QR code or link may still be useful after capture closes, subject to access and reveal rules.' },
          { id: 'reveal', title: 'Reveal on D+1, D+3, D+5, or D+7', body: 'Choose an available publication delay. Reveal controls when photos can be viewed; it is separate from camera availability.' },
        ] },
        { id: 'siapkan-aturan', title: 'Prepare the participant experience', lead: 'Choose the limits, access, and presentation that fit this album.', steps: [
          { id: 'batas-foto', title: 'Photos per participant', body: 'The initial limit is 30 photos per participant session. You can choose 5, 10, 30, 50, 70, or 100 when album capacity allows. Session allowance does not reserve album quota.' },
          { id: 'akses-pin', title: 'Access and PIN', body: 'An album PIN is optional. Participants enter through the QR code or link without an account; the server still checks access.' },
          { id: 'moderasi', title: 'Moderation', body: 'Choose how photos appear under the album settings. Hidden or soft-deleted photos still follow capacity and lifecycle rules.' },
          { id: 'desain', title: 'Album design', body: 'Review the available cover selection so participants recognize the event when opening its link.' },
          { id: 'paket', title: 'Packages and capacity', body: 'FREE30 includes 30 photos per album. Paid packages and upgrades apply per album; selecting one during setup does not add capacity before verified payment.' },
          { id: 'review-setup', title: 'Review Setup', body: 'Check the summary and server-reported issues before confirming. A free album can become ready; a paid selection continues to checkout.' },
        ] },
        { id: 'saat-acara', title: 'Share and manage', lead: 'Prepare the QR code, follow album status, and care for incoming photos.', steps: [
          { id: 'qr', title: 'QR and event preparation', body: 'Share the active QR code or link. After the capture window ends, the link may still open reveal or gallery views when the server allows it, but the camera does not reopen.' },
          { id: 'edit-pengaturan', title: 'Edit album settings', body: 'Open album setup or management to review available settings. Editing depends on album state, lifecycle, permissions, and server rules; not every setting remains editable.', note: 'If the server reports a conflict, reload current album state before trying again.' },
          { id: 'galeri-moderasi', title: 'Gallery and moderation', body: 'Review submissions, control visibility, and use authorized moderation actions. Soft-deleted photos continue to count toward album capacity.' },
          { id: 'sharing', title: 'Sharing', body: 'Use the active album link and sharing controls. Rotating a link changes future access, so replace previously distributed QR material if the link is rotated.' },
        ] },
        { id: 'kapasitas-arsip', title: 'Capacity and archives', lead: 'Purchases and downloads follow the server’s time windows and permissions.', steps: [
          { id: 'upgrade', title: 'Upgrade a package', body: 'Choose a higher capacity when checkout remains available. Purchases close 120 minutes before the capture window ends; payment outcome comes from server status.' },
          { id: 'zip', title: 'ZIP export', body: 'Create a ZIP when the album and your permissions allow it. Processing takes place in stages; the download becomes available when ready and its link expires.' },
          { id: 'reschedule', title: 'Reschedule', body: 'Review capture-window changes before saving. The server decides schedule bounds, current version, and the effect on pending payments.' },
        ] },
        { id: 'siklus-album', title: 'After the event', lead: 'Understand access deadlines and the recovery choices that remain.', steps: [
          { id: 'retensi', title: 'D+30 retention', body: 'Normal access ends under the album retention schedule. Restoration of soft-deleted photos also ends at D+30; later actions follow server state.' },
          { id: 'pemulihan', title: 'Owner recovery from D+30 to D+37', body: 'During this fixed window, only the Owner can activate recovery access to remaining media and create a recovery ZIP. Activation does not extend the D+37 deadline.' },
        ] },
      ], finishTitle: 'Ready to continue?', finishDescription: 'Open an existing album or create a new one. You can return to this guide from the Host workspace.', finishAction: 'View my albums',
    },
    collaborator: { eyebrow: 'COLLABORATOR GUIDE', title: 'Work together with clear access.', description: 'Collaboration is assigned per album. You use an ordinary account and do not need a special WO/EO account.', back: 'Help center', sections: [
      { title: 'Accepting an invitation', body: 'Open the invitation link and review the event and permissions. Sign in with the email address that received the invitation. If Google sign-in is needed, the invitation continues safely through sign-in. Accept it to open the album.' },
      { title: 'Finding assigned albums', body: 'The Collaborations workspace lists albums assigned to you. Albums you own remain under My Albums. Invitation status and access follow the server’s current decision.' },
      { title: 'Understanding album permissions', body: 'The Owner can grant setup, moderation, and ZIP export independently. Permission on one album does not carry over to another. Visit My Permissions to review current access.' },
      { title: 'Access boundaries', body: 'The Owner manages collaborators, final setup confirmation, billing, link rotation, rescheduling, recovery, and restoring deleted photos. The Owner can revoke access.' },
    ] },
  },
};
