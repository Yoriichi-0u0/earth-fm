// Appearance: a three-way segmented control (Auto, Light, Dark). One press, no menu.
import {Monitor,Moon,Sun} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {useAppearance} from '../lib/AppearanceProvider';
import type {AppearancePreference} from '../lib/appearance';
import './AppearanceSelector.css';

const OPTIONS:readonly {value:AppearancePreference;label:string;Icon:LucideIcon}[]=[
  {value:'auto',label:'Auto',Icon:Monitor},
  {value:'light',label:'Light',Icon:Sun},
  {value:'dark',label:'Dark',Icon:Moon},
];

export default function AppearanceSelector(){
  const {preference,setPreference}=useAppearance();
  return <div className="appearance-switch" role="group" aria-label="Appearance">
    {OPTIONS.map(({value,label,Icon})=><button key={value} type="button" aria-pressed={preference===value} aria-label={`${label} appearance`} title={`${label} appearance`} onClick={()=>setPreference(value)}>
      <Icon size={15} strokeWidth={1.75} aria-hidden="true"/><span aria-hidden="true">{label}</span>
    </button>)}
  </div>;
}
