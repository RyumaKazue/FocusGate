import { BlockEngine } from './block-engine.js';
import { describe, expect, it } from 'vitest';
import type { BlockSite, FocusGateSettings, WarningLevel } from './types.js';

const site = (overrides: Partial<BlockSite> = {}): BlockSite => ({
  id: 'id-youtube',
  domain: 'youtube.com',
  label: 'YouTube',
  enabled: true,
  isDefault: true,
  ...overrides,
});

const settings = (overrides: Partial<FocusGateSettings> = {}): FocusGateSettings => ({
  version: 1,
  globalEnabled: true,
  warningLevel: 'C',
  sites: [site()],
  ...overrides,
});

describe('BlockEngine.decide', () => {
  it('全体OFFなら対象サイトでも blocked:false', () => {
    expect(BlockEngine.decide('https://youtube.com', settings({ globalEnabled: false }))).toEqual({ blocked: false });
  });

  it('サービスOFF（site.enabled=false）なら blocked:false', () => {
    const s = settings({ sites: [site({ enabled: false })] });
    expect(BlockEngine.decide('https://youtube.com', s)).toEqual({ blocked: false });
  });

  it.each([
    ['https://m.youtube.com', 'サブドメイン m'],
    ['https://music.youtube.com', 'サブドメイン music'],
    ['https://youtube.com', '完全一致'],
    ['https://www.youtube.com', 'www 除去後一致'],
  ])('%s は blocked:true (%s)', url => {
    const result = BlockEngine.decide(url, settings());
    expect(result.blocked).toBe(true);
  });

  it('notyoutube.com は blocked:false（部分文字列だが終端不一致）', () => {
    expect(BlockEngine.decide('https://notyoutube.com', settings())).toEqual({ blocked: false });
  });

  it('非httpスキーム（chrome://）は blocked:false', () => {
    expect(BlockEngine.decide('chrome://extensions', settings())).toEqual({ blocked: false });
  });

  it.each<WarningLevel>(['B', 'C'])('warningLevel %s が結果の level に反映される', level => {
    const result = BlockEngine.decide('https://youtube.com', settings({ warningLevel: level }));
    expect(result).toEqual({ blocked: true, level, site: site() });
  });

  it('最初にマッチした有効サイトが site として返る', () => {
    const first = site({ id: 'id-1', domain: 'youtube.com', label: 'first' });
    const second = site({ id: 'id-2', domain: 'youtube.com', label: 'second' });
    const result = BlockEngine.decide('https://m.youtube.com', settings({ sites: [first, second] }));
    expect(result).toEqual({ blocked: true, level: 'C', site: first });
  });
});
