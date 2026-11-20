import test from 'node:test';
import assert from 'node:assert/strict';
import { getEndingPresentation } from '../.test-dist/src/gameplay/endings/ending-presentation.js';

test('mended-veil presentation reflects the restored boundary and chosen branch', () => {
  const ending = getEndingPresentation('ending-mended-veil');
  assert.ok(ending);
  assert.equal(ending.title, 'PERDE ONARILDI');
  assert.equal(ending.choiceLabel, 'SON KARARIN  •  PERDEYİ ONAR');
  assert.match(ending.story, /Perde yeniden örüldü/);
  assert.match(ending.epilogue, /korunmuş bir sınır/);
});

test('beyond-veil presentation reflects the released unknown world and chosen branch', () => {
  const ending = getEndingPresentation('ending-beyond-veil');
  assert.ok(ending);
  assert.equal(ending.title, 'PERDENİN ÖTESİ');
  assert.equal(ending.choiceLabel, 'SON KARARIN  •  PERDEYİ YIRT');
  assert.match(ending.story, /Perde yırtıldı/);
  assert.match(ending.epilogue, /Perde’nin ötesinde/);
});

test('unknown or absent ending IDs do not produce a false victory presentation', () => {
  assert.equal(getEndingPresentation(null), null);
  assert.equal(getEndingPresentation(undefined), null);
  assert.equal(getEndingPresentation('not-an-ending'), null);
});
