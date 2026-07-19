/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OrgPerson {
  role: string;
  name: string;
  description: string;
}

export interface OrgDivision {
  name: string;
  members: string[];
}

export interface OrgStructure {
  school: {
    kepalaSekolah: OrgPerson;
    wakaKurikulum: OrgPerson;
    wakaKesiswaan: OrgPerson;
    pembinaOsis: OrgPerson;
  };
  osis: {
    ketuaOsis: OrgPerson;
    wakilKetuaOsis: OrgPerson;
    sekretaris1: OrgPerson;
    sekretaris2: OrgPerson;
    bendahara1: OrgPerson;
    bendahara2: OrgPerson;
    divisions: OrgDivision[];
  };
}

export const ORG_STRUCTURE: OrgStructure = {
  school: {
    kepalaSekolah: {
      role: 'Kepala Sekolah',
      name: 'HM. Haris Zarkasi, MA.',
      description: 'Pimpinan & Penanggung Jawab Utama Sekolah',
    },
    wakaKurikulum: {
      role: 'Wakil Kepala Sekolah Bid. Kurikulum',
      name: 'Farhan Perdana, S.Pd.',
      description: 'Perencana & Koordinator Kurikulum Akademik',
    },
    wakaKesiswaan: {
      role: 'Wakil Kepala Sekolah Bid. Kesiswaan',
      name: 'Ida Farida, S.Pd.',
      description: 'Pembina Karakter & Organisasi Siswa',
    },
    pembinaOsis: {
      role: 'Pembina OSIS',
      name: 'Tristian Novansyah, S.Kom.',
      description: 'Pembimbing & Fasilitator Kegiatan OSIS',
    },
  },
  osis: {
    ketuaOsis: { role: 'Ketua OSIS', name: 'Naufal Rafa Argani Wibowo', description: 'Ketua Umum OSIS' },
    wakilKetuaOsis: { role: 'Wakil Ketua OSIS', name: 'Naura Mahrin Fathona', description: 'Wakil Ketua Umum OSIS' },
    sekretaris1: { role: 'Sekretaris 1', name: 'Ainayya Fathiyyaturahma Ayudia', description: 'Sekretaris I OSIS' },
    sekretaris2: { role: 'Sekretaris 2', name: 'Aurora Jeanneta Putri Wijaya', description: 'Sekretaris II OSIS' },
    bendahara1: { role: 'Bendahara 1', name: 'Bastian Naufal Heryawan', description: 'Bendahara I OSIS' },
    bendahara2: { role: 'Bendahara 2', name: 'Khaira Alisha Kurniawan', description: 'Bendahara II OSIS' },
    divisions: [
      {
        name: 'KOORDINATOR UMUM',
        members: ['Izzul Hanif', 'Febian Fadzri Bimo Asmoro', 'Dzaky Damar Dewantara'],
      },
      {
        name: 'BADAN PENGECEK HARIAN & PIKET',
        members: ['Adinda Zaidatul Khusna', 'Nadhif Adhyastha Pratomo'],
      },
      {
        name: 'DIVISI KEAMANAN',
        members: [
          'Hafizh Fajar Saputra',
          'Muhammad Najmal Huda',
          'Rava Syafiqzi Rianta Putra',
          'Erza Amali Waldan',
          'Arrazi Rasyaa Hafiz',
          'Luqman Nur Hakim',
          'Rayyan Rabbani Trisnadi',
          'Farizqi Budi Irawan',
        ],
      },
      {
        name: 'DIVISI KREATIF/MADING',
        members: [
          'Alisha Humaira Khalidah',
          'Nola Audrey Ramadhani Premadi',
          'Rani Amelia',
          'Yusuf Nur Hidayat',
          'Keyan Dzaky Pangestu',
          'Aireen Afya Azzahra',
          'Raisya Kayla Rangkuti',
          'Zaskia Zavilia Cahyani',
          'Sabrina Adelia',
        ],
      },
      {
        name: 'DIVISI DOKUMENTASI',
        members: ['Seyla Afrilia Hardiana', 'Emyra Azza Rayhani', 'Fabian Rayyan Athalla', 'Azka Nayaka Nafisa Maajid'],
      },
      {
        name: 'DIVISI EDITING',
        members: ['Khansa Qonita Sahasika', 'Anjeli Bunga Atribar', 'Muhammad Fariz Haryanto', 'Rezvan Defriano Aldebara'],
      },
      {
        name: 'DIVISI ROHANI',
        members: ['Juanita Raihanna Hapsari', 'Muhammad Dzikri Al-Farisi', 'Ghazy Aidan Benzema', 'Raffael Fernandito Wibowo'],
      },
    ],
  },
};

export const AKREDITASI_IMAGE_URL =
  'https://lh3.googleusercontent.com/d/1bcaCvH6dbLd4KUsBuA_9qdwBsOayu810';

export const SEJARAH_IMAGE_URL =
  'https://lh3.googleusercontent.com/d/1eKLOgwJwwB9u1qYf-XfRR3ttsO2pRsIH';

export const PPDB_HERO_IMAGE_URL =
  'https://lh3.googleusercontent.com/d/1-EU7yxqLPlSGAHvRkntaQsAk8DFsJnEo';

export const PPDB_PROMO_IMAGE_URL =
  'https://lh3.googleusercontent.com/d/1kOm5TA6bExQtUGccMbOjhotmHIHK9xEv';

export const PPDB_FLOW_IMAGE_URL =
  'https://lh3.googleusercontent.com/d/1yQE1ZU-jTLP5cvrTjpt8o5WeERmiJrqg';

export const PPDB_FORM_URL = 'https://online.tamhar.sch.id/ticket/#beli';

export const DIGITAL_MPLS_URL =
  import.meta.env.VITE_DIGITAL_MPLS_URL?.trim() ||
  'https://www.smptamhar.com/mpls/';