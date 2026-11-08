import {useEffect,useRef,useState} from 'react';
import {decodePersonalImage,ImageSelection,PersonalImageError} from './personalImage';
import type {ImageProblem,PersonalImage} from './personalImage';

export const imageMessages:Record<ImageProblem,string>={
  format:'Choose a PNG, JPEG or WebP image. Other formats are not supported.',
  bytes:'This image is over 10 MB. Choose a smaller file.',
  dimensions:'Choose an image up to 4096 pixels per edge, 12.6 megapixels and an 8:1 aspect ratio.',
  animated:'Choose a still image. Animated PNG and WebP are not supported.',
  invalid:'This file is incomplete or malformed. Choose another image.',
  decode:'This image could not be opened. Try exporting it as a new PNG, JPEG or WebP.',
};

/** Owns all personal URLs, including results waiting for a React commit. */
export function usePersonalImage(){
  const [selection]=useState(()=>new ImageSelection());
  const [image,setImage]=useState<PersonalImage|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const owned=useRef(new Set<string>());
  useEffect(()=>()=>{selection.cancel();for(const url of owned.current)URL.revokeObjectURL(url);owned.current.clear();},[selection]);
  // Release replaced URLs after React has detached their old media elements.
  useEffect(()=>{for(const url of owned.current)if(url!==image?.url){URL.revokeObjectURL(url);owned.current.delete(url);}},[image]);
  async function choose(file:File){
    setLoading(true);setError('');
    try{
      const next=await selection.load(signal=>decodePersonalImage(file,signal),value=>URL.revokeObjectURL(value.url));
      if(!next)return;
      owned.current.add(next.url);setImage(next);setLoading(false);
    }catch(cause){setLoading(false);setError(imageMessages[cause instanceof PersonalImageError?cause.problem:'decode']);}
  }
  function cancel(){selection.cancel();setLoading(false);setError('');}
  function remove(){cancel();setImage(null);}
  return {image,loading,error,choose,cancel,remove};
}
