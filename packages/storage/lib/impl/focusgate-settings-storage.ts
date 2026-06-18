import { createStorage, StorageEnum } from '../base/index.js';
import { DEFAULT_SETTINGS, DomainNormalizer, STORAGE_KEY } from '@extension/block-engine';
import type { BaseStorageType } from '../base/index.js';
import type { BlockSite, FocusGateSettings, WarningLevel } from '@extension/block-engine';

/**
 * `addSite` の入力。`domain` は未正規化でよい（内部で正規化・検証する）。
 */
type AddSiteInput = {
  domain: string;
  label?: string;
};

/**
 * `updateSite` の更新パッチ。指定したフィールドのみ更新する。
 * `domain` を含む場合は再正規化・再検証・重複チェックを行う。
 */
type UpdateSitePatch = Partial<Pick<BlockSite, 'domain' | 'label' | 'enabled'>>;

/**
 * FocusGate 設定ストレージの型。`createStorage` の基本操作に
 * 設定操作の補助関数を加えたもの。UI/SW はこの窓口経由でのみ設定を読み書きする。
 */
type FocusGateSettingsStorageType = BaseStorageType<FocusGateSettings> & {
  setGlobalEnabled: (value: boolean) => Promise<void>;
  setWarningLevel: (level: WarningLevel) => Promise<void>;
  addSite: (input: AddSiteInput) => Promise<void>;
  updateSite: (id: string, patch: UpdateSitePatch) => Promise<void>;
  removeSite: (id: string) => Promise<void>;
  toggleSite: (id: string) => Promise<void>;
};

/**
 * 入力ドメインを正規化し妥当性を検証する。不正なら例外を投げる。
 */
const normalizeAndValidate = (domain: string): string => {
  const normalized = DomainNormalizer.normalize(domain);
  if (!DomainNormalizer.isValid(normalized)) {
    throw new Error('INVALID_DOMAIN');
  }
  return normalized;
};

const storage = createStorage<FocusGateSettings>(STORAGE_KEY, DEFAULT_SETTINGS, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const focusgateSettingsStorage: FocusGateSettingsStorageType = {
  ...storage,

  setGlobalEnabled: async value => {
    await storage.set(current => ({ ...current, globalEnabled: value }));
  },

  setWarningLevel: async level => {
    await storage.set(current => ({ ...current, warningLevel: level }));
  },

  addSite: async ({ domain, label }) => {
    const normalized = normalizeAndValidate(domain);
    await storage.set(current => {
      if (current.sites.some(site => site.domain === normalized)) {
        throw new Error('DUPLICATE_DOMAIN');
      }
      const newSite: BlockSite = {
        id: crypto.randomUUID(),
        domain: normalized,
        label: label ?? null,
        enabled: true,
        isDefault: false,
      };
      return { ...current, sites: [...current.sites, newSite] };
    });
  },

  updateSite: async (id, patch) => {
    const normalizedDomain = patch.domain === undefined ? undefined : normalizeAndValidate(patch.domain);
    await storage.set(current => {
      const target = current.sites.find(site => site.id === id);
      if (!target) {
        throw new Error('SITE_NOT_FOUND');
      }
      if (
        normalizedDomain !== undefined &&
        current.sites.some(site => site.id !== id && site.domain === normalizedDomain)
      ) {
        throw new Error('DUPLICATE_DOMAIN');
      }
      const sites = current.sites.map(site =>
        site.id === id
          ? {
              ...site,
              ...patch,
              ...(normalizedDomain !== undefined ? { domain: normalizedDomain } : {}),
            }
          : site,
      );
      return { ...current, sites };
    });
  },

  removeSite: async id => {
    await storage.set(current => ({
      ...current,
      sites: current.sites.filter(site => site.id !== id),
    }));
  },

  toggleSite: async id => {
    await storage.set(current => {
      const target = current.sites.find(site => site.id === id);
      if (!target) {
        throw new Error('SITE_NOT_FOUND');
      }
      const sites = current.sites.map(site => (site.id === id ? { ...site, enabled: !site.enabled } : site));
      return { ...current, sites };
    });
  },
};

export { focusgateSettingsStorage };
export type { AddSiteInput, UpdateSitePatch, FocusGateSettingsStorageType };
