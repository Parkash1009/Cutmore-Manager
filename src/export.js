import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function excel(rows, filename="cutmore-entries.xlsx") {
  const data=rows.map(r=>({"Date":r.date,"Time":r.time,"Customer Name":r.customerName,"PCS":r.pcs,"Tunch":r.tunch}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),"Entries");
  const out=XLSX.write(wb,{bookType:"xlsx",type:"array"});
  saveAs(new Blob([out],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),filename);
}
export function pdf(rows,title) {
  const p=new jsPDF("l","mm","a4");
  p.setFontSize(18); p.text("Cutmore Manager",14,16);
  p.setFontSize(11); p.text(title,14,24);
  autoTable(p,{startY:30,head:[["Date","Time","Customer Name","PCS","Tunch"]],body:rows.map(r=>[r.date,r.time,r.customerName,r.pcs,r.tunch])});
  p.save("cutmore-entries.pdf");
}
