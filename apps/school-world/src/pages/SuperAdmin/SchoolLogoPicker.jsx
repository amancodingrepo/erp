import React, { useState } from "react";
import { UploadCloud, Trash2, Image as ImageIcon } from "lucide-react";

async function compressSchoolLogo(file) {
  if (!file || !String(file.type || '').startsWith('image/')) throw new Error('Choose a PNG, JPEG, WebP, or other browser-supported image file.');
  if (file.size > 12 * 1024 * 1024) throw new Error('The original logo must be smaller than 12 MB.');
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve,reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('The selected logo could not be opened.'));
      image.src = sourceUrl;
    });
    let scale = Math.min(900 / image.naturalWidth, 650 / image.naturalHeight, 1);
    for (let attempt=0; attempt<6; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1,Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not process this logo image.');
      context.fillStyle = '#ffffff';
      context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', Math.max(.6,.86-attempt*.05));
      if (dataUrl.length <= 950000) {
        return {dataUrl, fileName:(file.name.replace(/\.[^.]+$/,'') || 'school-logo') + '.jpg'};
      }
      scale *= .78;
    }
    throw new Error('This logo is too detailed to store safely. Please choose a smaller image.');
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export default function LogoPicker({value,fileName,onChange,onRemove,disabled=false}) {
  const [processing,setProcessing] = useState(false);
  const [localError,setLocalError] = useState('');
  async function onFile(event) {
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    setProcessing(true);setLocalError('');
    try { onChange(await compressSchoolLogo(file)); }
    catch(error) { setLocalError(error.message || 'Logo upload failed.'); }
    finally { setProcessing(false); }
  }
  return <div className="db-superadmin-logo-field">
    <span className="db-superadmin-field-label">School logo</span>
    <div className="db-superadmin-logo-picker">
      <div className="db-superadmin-logo-preview">
        {value ? <img src={value} alt="Selected school logo preview"/> : <div className="db-superadmin-logo-empty"><ImageIcon size={24}/><span>No logo saved</span></div>}
      </div>
      <div className="db-superadmin-logo-actions">
        <label className="db-superadmin-upload-button"><UploadCloud size={15}/>{processing?'Optimizing…':value?'Replace logo':'Upload logo'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFile} disabled={disabled||processing}/></label>
        {value && <button type="button" className="db-superadmin-remove-logo" onClick={onRemove} disabled={disabled||processing}><Trash2 size={14}/> Remove logo</button>}
        <small>{fileName || 'PNG, JPG or WebP. The image is resized and stored in the school database.'}</small>
        {localError && <span className="db-superadmin-logo-error">{localError}</span>}
      </div>
    </div>
  </div>;
}
