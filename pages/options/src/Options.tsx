import '@src/Options.css';
import { t } from '@extension/i18n';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { focusgateSettingsStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useState } from 'react';
import type { BlockSite } from '@extension/block-engine';

/** storage 補助関数が投げる Error.message を i18n メッセージへ変換する。 */
const messageForError = (error: unknown): string => {
  const code = error instanceof Error ? error.message : '';
  switch (code) {
    case 'INVALID_DOMAIN':
      return t('errorInvalidDomain');
    case 'DUPLICATE_DOMAIN':
      return t('errorDuplicateDomain');
    default:
      return t('errorInvalidDomain');
  }
};

const Switch = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
      checked ? 'bg-blue-500' : 'bg-gray-400',
    )}>
    <span
      className={cn(
        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
        checked ? 'translate-x-4' : 'translate-x-1',
      )}
    />
  </button>
);

const AddSiteForm = () => {
  const [domain, setDomain] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async () => {
    try {
      await focusgateSettingsStorage.addSite({ domain, label: label.trim() === '' ? undefined : label.trim() });
      setDomain('');
      setLabel('');
      setError(null);
    } catch (e) {
      setError(messageForError(e));
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder={t('domainPlaceholder')}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder={t('labelPlaceholder')}
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600">
          {t('addSite')}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};

const SiteRow = ({ site }: { site: BlockSite }) => {
  const [editing, setEditing] = useState(false);
  const [domain, setDomain] = useState(site.domain);
  const [label, setLabel] = useState(site.label ?? '');
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setDomain(site.domain);
    setLabel(site.label ?? '');
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await focusgateSettingsStorage.updateSite(site.id, {
        domain,
        label: label.trim() === '' ? null : label.trim(),
      });
      setEditing(false);
      setError(null);
    } catch (e) {
      setError(messageForError(e));
    }
  };

  if (editing) {
    return (
      <li className="flex flex-col gap-1 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={domain}
            onChange={e => setDomain(e.target.value)}
            placeholder={t('domainPlaceholder')}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={t('labelPlaceholder')}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-blue-500 px-2 py-1 text-xs font-medium text-white hover:bg-blue-600">
            {t('save')}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100">
            {t('cancel')}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-2">
      <Switch
        checked={site.enabled}
        onChange={() => focusgateSettingsStorage.toggleSite(site.id)}
        label={site.label ?? site.domain}
      />
      <div className={cn('flex min-w-0 flex-1 flex-col', site.enabled ? 'text-gray-900' : 'text-gray-400')}>
        <span className="truncate text-sm font-medium">{site.label ?? site.domain}</span>
        {site.label && <span className="truncate text-xs text-gray-500">{site.domain}</span>}
      </div>
      <button
        type="button"
        onClick={startEdit}
        className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100">
        {t('edit')}
      </button>
      <button
        type="button"
        onClick={() => focusgateSettingsStorage.removeSite(site.id)}
        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
        {t('delete')}
      </button>
    </li>
  );
};

const Options = () => {
  const settings = useStorage(focusgateSettingsStorage);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 bg-slate-50 p-6 text-gray-900">
      <h1 className="text-xl font-bold">{t('optionsTitle')}</h1>

      <AddSiteForm />

      <ul className="flex flex-col divide-y divide-gray-200 border-y border-gray-200">
        {settings.sites.length === 0 ? (
          <li className="py-3 text-center text-sm text-gray-400">{t('noSites')}</li>
        ) : (
          settings.sites.map(site => <SiteRow key={site.id} site={site} />)
        )}
      </ul>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
