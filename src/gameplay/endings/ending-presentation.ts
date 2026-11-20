export type EndingId = 'ending-mended-veil' | 'ending-beyond-veil';

export interface EndingPresentation {
  id: EndingId;
  eyebrow: string;
  title: string;
  choiceLabel: string;
  story: string;
  epilogue: string;
}

const ENDING_PRESENTATIONS: Record<EndingId, EndingPresentation> = {
  'ending-mended-veil': {
    id: 'ending-mended-veil',
    eyebrow: 'SON • DÜNYALAR YENİDEN AYRILDI',
    title: 'PERDE ONARILDI',
    choiceLabel: 'SON KARARIN  •  PERDEYİ ONAR',
    story: 'Yazılmamış Hükümdar’ın iradesi sustu. Perde yeniden örüldü; iki dünya arasındaki yara kapandı. Uzun zamandır ilk kez şafak, Lanetli Kale’nin taşlarına ulaştı.',
    epilogue: 'Avcıların yemini sürüyor. Bu kez dünya, korunmuş bir sınırın ardında yeniden nefes alıyor.'
  },
  'ending-beyond-veil': {
    id: 'ending-beyond-veil',
    eyebrow: 'SON • BİLİNMEYEN DÜNYA UYANDI',
    title: 'PERDENİN ÖTESİ',
    choiceLabel: 'SON KARARIN  •  PERDEYİ YIRT',
    story: 'Yazılmamış Hükümdar’ın gücü serbest kaldı. Perde yırtıldı; öte dünyanın karanlığı gerçekliğe taştı. Eski düzen sona erdi ve bilinmeyen bir çağ başladı.',
    epilogue: 'Avcıların yolu bitmedi. Artık av, Perde’nin ötesinde devam ediyor.'
  }
};

export function getEndingPresentation(endingId: string | null | undefined): EndingPresentation | null {
  if (!endingId || !Object.prototype.hasOwnProperty.call(ENDING_PRESENTATIONS, endingId)) return null;
  return ENDING_PRESENTATIONS[endingId as EndingId];
}
