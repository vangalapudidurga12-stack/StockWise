import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { API, authHeaders } from "./api";

const aliases = {
  productName: ["productname", "product", "name", "itemname", "item"], sku: ["sku", "barcode", "productcode", "code"],
  category: ["category", "type"], quantity: ["quantity", "qty", "stock", "currentstock"],
  unitPrice: ["unitprice", "price", "cost", "rate"], safetyStock: ["safetystock", "minimumstock", "minstock"],
  leadTimeDays: ["leadtimedays", "leadtime"], targetStock: ["targetstock", "maximumstock"],
  expiryDate: ["expirydate", "expiry", "expirationdate"], lastSaleDate: ["lastsaledate", "lastsale"], supplierName: ["suppliername", "supplier", "vendor"]
};
function normalizeKey(k) { return String(k || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function excelDate(value) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number") { const d = XLSX.SSF.parse_date_code(value); if (!d) return ""; return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`; }
  const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0,10);
}
function mapRow(row) {
  const normalized = {}; for (const [key, value] of Object.entries(row)) normalized[normalizeKey(key)] = value;
  const result = {};
  for (const [field, names] of Object.entries(aliases)) { const match = names.find(n => normalized[n] !== undefined); if (match !== undefined) result[field] = normalized[match]; }
  if (result.expiryDate !== undefined) result.expiryDate = excelDate(result.expiryDate);
  if (result.lastSaleDate !== undefined) result.lastSaleDate = excelDate(result.lastSaleDate);
  result.productName = String(result.productName ?? "").trim(); result.sku = String(result.sku ?? "").trim();
  result.quantity = Number(result.quantity); result.unitPrice = Number(result.unitPrice || 0);
  return result;
}
export default function ImportPage() {
  const [file,setFile] = useState(null), [rows,setRows] = useState([]), [error,setError] = useState(""), [result,setResult] = useState(null), [busy,setBusy] = useState(false);
  const nav = useNavigate(); const user = JSON.parse(localStorage.getItem("user") || "{}");
  async function readFile(f) {
    setError(""); setResult(null); setFile(f); if (!f) { setRows([]); return; }
    try { const data = await f.arrayBuffer(); const wb = XLSX.read(data, { type: "array", cellDates: false }); const sheet = wb.Sheets[wb.SheetNames[0]]; const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const mapped = raw.map(mapRow); if (!mapped.length) throw new Error("The selected Excel sheet has no data rows."); setRows(mapped);
    } catch (e) { setRows([]); setError(e.message || "Unable to read this Excel file."); }
  }
  async function upload() {
    setBusy(true); setError(""); setResult(null);
    try { const r = await fetch(`${API}/api/products/bulk-import`, { method:"POST", headers:{"Content-Type":"application/json",...authHeaders()}, body:JSON.stringify({products:rows}) }); const d = await r.json(); if (!r.ok) throw new Error(d.message || "Import failed."); setResult(d);
      if (d.addedCount > 0) { const nextUser = {...user, hasCompletedInitialImport:true}; localStorage.setItem("user", JSON.stringify(nextUser)); }
    } catch(e) { setError(e.message || "Unable to connect to server."); } finally { setBusy(false); }
  }
  const completed = user.hasCompletedInitialImport !== false;
  return <main className="auth-page"><section className="auth-card" style={{width:"min(900px,96vw)",maxWidth:900}}>
    <div className="brand-mark">S</div><h1>{completed ? "Import more products" : "Import your inventory"}</h1>
    <p className="muted">Upload an Excel workbook (.xlsx or .xls). New products are added; existing products are never replaced.</p>
    <p className="muted">Expected columns: Product Name, SKU, Category, Quantity, Unit Price, Safety Stock, Lead Time Days, Target Stock, Expiry Date, Last Sale Date, Supplier Name.</p>
    <input type="file" accept=".xlsx,.xls" onChange={e=>readFile(e.target.files?.[0])}/>
    {error && <p className="error">{error}</p>}
    {rows.length > 0 && <><p><strong>{file?.name}</strong> · {rows.length} rows ready to import</p><div style={{maxHeight:260,overflow:"auto"}}><table><thead><tr><th>Product</th><th>SKU</th><th>Quantity</th><th>Unit price</th></tr></thead><tbody>{rows.slice(0,12).map((p,i)=><tr key={i}><td>{p.productName}</td><td>{p.sku}</td><td>{p.quantity}</td><td>{p.unitPrice}</td></tr>)}</tbody></table>{rows.length>12&&<p className="muted">Showing first 12 rows.</p>}</div><button className="primary full" disabled={busy} onClick={upload}>{busy?"Importing...":"Import products"}</button></>}
    {result && <div><p className="success">{result.message}</p><p>Added: {result.addedCount} · Failed/skipped: {result.failed?.length || 0}</p>{result.failed?.length > 0 && <details><summary>View failed rows</summary><ul>{result.failed.map((f,i)=><li key={i}>Row {f.row}: {f.message}</li>)}</ul></details>}
      {result.addedCount > 0 && <button className="primary full" onClick={()=>nav("/dashboard")}>Continue to dashboard</button>}</div>}
    <p className="center"><button className="secondary" onClick={()=>nav(completed?"/dashboard":"/import")}>{completed?"Back to dashboard":"Stay on import page"}</button></p>
    {completed && <p className="center muted"><a href="/products">Manage products</a> · <a href="/history">Daily history</a></p>}
  </section></main>;
}
