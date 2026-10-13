// A numbered text response keeps the existing submission/storage contract.
// This is an option list, not the grading key; no correct selections are prefilled.
export const soapOptions = ["S — Subjective","O — Objective","A — Assessment","P — Plan"];
export const soapStatements = ["Patient reports pain with inspiration.","You hear crackles during examination.","You consider a pulmonary cause.","You propose a chest X-ray."];
export function soapSelections(response) {
 const values=["","","",""];
 for(const match of String(response || "").matchAll(/^([1-4]): ([SOAP])$/gm)) values[Number(match[1])-1]=match[2];
 return values;
}
export function updateSoapSelection(response,index,value) {
 const values=soapSelections(response);values[index]=/^[SOAP]$/.test(value)?value:"";
 return values.map((v,i)=>v?`${i+1}: ${v}`:"").filter(Boolean).join("\n");
}
export function soapResponseComplete(response) {return soapSelections(response).every(Boolean);}
