/**
 * Climate Coil geometry: every monthly GISTEMP v4 anomaly as one continuous coil.
 * x = time (first year → last year), angle = calendar month (January at the top), distance from the axis =
 * anomaly on the same fixed −1.00…+1.50 °C span as Side B. No rescaling per view and no bridging of missing months.
 */
export const COIL_SPAN={low:-1,high:1.5} as const;
export const COIL_LENGTH=6.4,COIL_R_LOW=.24,COIL_R_HIGH=1.18;
export type CoilRow={year:number;months:readonly (number|null)[]};

export function coilRadius(anomaly:number){
  return COIL_R_LOW+(anomaly-COIL_SPAN.low)/(COIL_SPAN.high-COIL_SPAN.low)*(COIL_R_HIGH-COIL_R_LOW);
}
export function coilX(year:number,month:number,first:number,last:number){
  return -COIL_LENGTH/2+(year-first+(month-.5)/12)/(last-first+1)*COIL_LENGTH;
}
export function coilPoint(year:number,month:number,anomaly:number,first:number,last:number):[number,number,number]{
  const angle=(month-1)/12*Math.PI*2,r=coilRadius(anomaly);
  return [coilX(year,month,first,last),r*Math.cos(angle),r*Math.sin(angle)];
}
/** Consecutive available months become one run; a missing month ends the run instead of being interpolated. */
export function coilRuns(rows:readonly CoilRow[]){
  const first=rows[0].year,last=rows.at(-1)!.year;
  const runs:{positions:number[];anomalies:number[]}[]=[];let current={positions:[] as number[],anomalies:[] as number[]};
  const close=()=>{if(current.anomalies.length>1)runs.push(current);current={positions:[],anomalies:[]};};
  for(const row of rows)row.months.forEach((value,index)=>{
    if(value===null||!Number.isFinite(value)){close();return;}
    current.positions.push(...coilPoint(row.year,index+1,value,first,last));current.anomalies.push(value);
  });
  close();
  return {first,last,runs};
}
