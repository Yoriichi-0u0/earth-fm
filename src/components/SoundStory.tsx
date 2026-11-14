// "About this sound": the 5W1H card under every record (What, Who, When, Where, Why, How).
import type {CSSProperties} from 'react';
import {Clock,HelpCircle,MapPin,Music,Users,Wand2} from 'lucide-react';
import type {JukeboxRecord} from '../data/jukeboxRecords';
import {SOUND_STORIES} from '../data/soundStories';
import {useStudioLanguage} from '../lib/studioLanguage';
import './SoundStory.css';

const ROWS=[['what','What is this sound?',Music],['who','Who made the data and the picture?',Users],['when','When is it from?',Clock],['where','Where on Earth?',MapPin],['why','Why listen?',HelpCircle],['how','How does it become sound?',Wand2]] as const;

export default function SoundStory({record}:{record:JukeboxRecord}){
  const {t}=useStudioLanguage();const story=SOUND_STORIES[record.id];
  if(!story)return null;
  return <section className="ss-story" aria-labelledby="ss-story-title" style={{'--story-accent':record.accent} as CSSProperties}>
    <header><p>{t('ABOUT THIS SOUND · 5W1H')}</p><h2 id="ss-story-title">{t(record.title)}: {t('what you are hearing')}</h2></header>
    <dl>{ROWS.map(([key,label,Icon])=><div key={key} data-w={key}><dt><Icon size={16} aria-hidden="true"/><span>{t(label)}</span></dt><dd>{t(story[key])}</dd></div>)}</dl>
    <p className="ss-story-source">{t('Source')}: <a href={record.sourceUrl} target="_blank" rel="noreferrer">{record.source} ↗</a></p>
  </section>;
}
