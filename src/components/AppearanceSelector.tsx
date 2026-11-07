import {useAppearance} from '../lib/AppearanceProvider';
import {parseAppearancePreference} from '../lib/appearance';
import {useStudioLanguage} from '../lib/studioLanguage';
import './AppearanceSelector.css';

export default function AppearanceSelector() {
  const {preference, setPreference} = useAppearance();
  const {t} = useStudioLanguage();
  return <label className="appearance-selector"><span>{t('Appearance')}</span>
    <select aria-label={t('Appearance')} value={preference} onChange={event => setPreference(parseAppearancePreference(event.target.value))}>
      <option value="auto">{t('Auto')}</option><option value="light">{t('Light')}</option><option value="dark">{t('Dark')}</option>
    </select>
  </label>;
}
