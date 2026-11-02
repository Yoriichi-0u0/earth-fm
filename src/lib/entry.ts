/** Preserve old deep links while making the reviewed Studio the canonical entry. */
export function isLegacyEntry(search: string, hash: string): boolean {
  const params=new URLSearchParams(search);
  if(params.get('legacy')==='1')return true;
  if(params.has('studio'))return false;
  return ['track','sound','tempo','from','to'].some(key=>params.has(key)) || ['#climate-spiral','#visual-radio','#tracks','#listen','#explore'].includes(hash);
}
