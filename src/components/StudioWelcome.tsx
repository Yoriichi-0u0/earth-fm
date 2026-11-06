import JukeboxHome from './JukeboxHome';

type Props={playing:boolean;motion:boolean;onListen:()=>void};
/** Preserve the Home entry contract while the listening deck becomes its primary experience. */
export default function StudioWelcome({motion}:Props){
  return <JukeboxHome motion={motion}/>;
}
