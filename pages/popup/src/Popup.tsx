import '@src/Popup.css';
import { t } from '@extension/i18n';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { focusgateSettingsStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner } from '@extension/ui';
import type { BlockSite, WarningLevel } from '@extension/block-engine';

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

const LevelSelector = ({ level, onSelect }: { level: WarningLevel; onSelect: (level: WarningLevel) => void }) => (
  <div className="inline-flex overflow-hidden rounded border border-gray-300">
    {(['B', 'C'] as const).map(value => (
      <button
        key={value}
        type="button"
        onClick={() => onSelect(value)}
        className={cn(
          'px-3 py-1 text-xs font-medium transition-colors',
          level === value ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100',
        )}>
        {value === 'B' ? t('levelB') : t('levelC')}
      </button>
    ))}
  </div>
);

const SiteRow = ({ site }: { site: BlockSite }) => (
  <li className="flex items-center justify-between gap-2 py-1">
    <span className={cn('truncate text-xs', site.enabled ? 'text-gray-800' : 'text-gray-400')}>
      {site.label ?? site.domain}
    </span>
    <Switch
      checked={site.enabled}
      onChange={() => focusgateSettingsStorage.toggleSite(site.id)}
      label={site.label ?? site.domain}
    />
  </li>
);

const Popup = () => {
  const settings = useStorage(focusgateSettingsStorage);

  return (
    <div className="flex h-full min-w-[18rem] flex-col gap-3 bg-slate-50 p-4 text-gray-900">
      <header className="flex items-center justify-between">
        <h1 className="text-base font-bold">{t('popupTitle')}</h1>
        <Switch
          checked={settings.globalEnabled}
          onChange={() => focusgateSettingsStorage.setGlobalEnabled(!settings.globalEnabled)}
          label={t('globalEnabled')}
        />
      </header>

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{t('warningLevel')}</span>
        <LevelSelector
          level={settings.warningLevel}
          onSelect={level => focusgateSettingsStorage.setWarningLevel(level)}
        />
      </div>

      <ul className="flex flex-1 flex-col divide-y divide-gray-200 overflow-y-auto border-y border-gray-200">
        {settings.sites.length === 0 ? (
          <li className="py-2 text-center text-xs text-gray-400">{t('noSites')}</li>
        ) : (
          settings.sites.map(site => <SiteRow key={site.id} site={site} />)
        )}
      </ul>

      <button
        type="button"
        onClick={() => chrome.runtime.openOptionsPage()}
        className="rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-600">
        {t('openOptions')}
      </button>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
