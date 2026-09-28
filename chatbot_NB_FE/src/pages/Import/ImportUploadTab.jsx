import React, { useState, useRef } from 'react';
import styles from './Import.module.css';
import { API_ENDPOINTS } from '../../config/api';
import toast from 'react-hot-toast';

const MAX_BYTES_PER_FILE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_FILES = 10; // Giới hạn số lượng file 1 lần (tùy chọn)

export default function ImportUploadTab() {
  const [files, setFiles] = useState([]); // [Change 1] State là mảng
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  // Hàm validate chung cho 1 file
  const validateFile = (file) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      return { valid: false, error: `File ${file.name} không phải .docx` };
    }
    if (file.size > MAX_BYTES_PER_FILE) {
      return { valid: false, error: `File ${file.name} vượt quá 10MB` };
    }
    return { valid: true };
  };

  const handleFiles = (newFiles) => {
    const validFiles = [];
    
    // [Change 2] Xử lý danh sách file
    Array.from(newFiles).forEach((file) => {
      const check = validateFile(file);
      if (check.valid) {
        const isDuplicateExisting = files.some(f => f.name === file.name && f.size === file.size);
        const isDuplicateInNew = validFiles.some(f => f.name === file.name && f.size === file.size);
        if (isDuplicateExisting || isDuplicateInNew) {
          toast.error(`File ${file.name} đã được thêm trước đó`);
        } else {
          validFiles.push(file);
        }
      } else {
        toast.error(check.error);
      }
    });

    if (validFiles.length > 0) {
      if (files.length + validFiles.length > MAX_TOTAL_FILES) {
        toast.error(`Chỉ được upload tối đa ${MAX_TOTAL_FILES} file cùng lúc.`);
        return;
      }
      setFiles((prev) => [...prev, ...validFiles]); // Cộng dồn file
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    if (inputRef.current) inputRef.current.value = ''; // Reset input
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  // Hàm xóa file khỏi danh sách chọn
  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Vui lòng chọn ít nhất một file.');
      return;
    }

    const formData = new FormData();
    
    // [Change 3] Append tất cả file vào cùng 1 key (thường là 'files' thay vì 'file')
    // Hoặc giữ nguyên key 'file' nhưng append nhiều lần tùy vào BE quy định
    files.forEach((file) => {
      formData.append('files', file); 
    });

    // Nếu có metadata chung
    // formData.append('language', 'vi');

    try {
      setUploading(true);
      const res = await fetch(API_ENDPOINTS.DOCUMENT.IMPORT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Không thể tải lên danh sách file.');

      toast.success(`Đã tải lên ${files.length} file thành công!`);
      setFiles([]); // Clear danh sách sau khi upload xong
    } catch (err) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  return (
    <div className={styles.uploadSection}>
      <div
        className={`${styles.dropZone} ${dragActive ? styles.active : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple // [Change 4] Quan trọng: cho phép chọn nhiều file
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className={styles.hiddenInput}
          onChange={handleFileChange}
        />
        <div className={styles.dropContent}>
            <p className={styles.dropTitle}>
                Kéo thả hoặc nhấp để chọn nhiều file (.docx)
            </p>
            <p className={styles.dropSub}>Tối đa {MAX_TOTAL_FILES} file, 10MB/file</p>
        </div>
      </div>

      {/* [Change 5] Hiển thị danh sách file đã chọn */}
      {files.length > 0 && (
        <div className={styles.fileList}>
          <span className={styles.filesub}>Các file đã chọn ({files.length}):</span>
          <div className={styles.divListFile}>
            <ul className={styles.ulListFile}>
              {files.map((f, index) => (
                <li key={index} style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                  <span>📄 {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button 
                    onClick={() => removeFile(index)}
                    style={{color:'red', cursor:'pointer', border:'none', background:'none'}}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <button
        type="button"
        className={styles.uploadBtn}
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
      >
        {uploading ? (
          <div className={styles.lds_ellipsis} role="status" aria-live="polite">
            <div></div><div></div><div></div><div></div>
          </div>
        ) : (
          <div className={styles.sidebarSpan}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="1em" height="1em" aria-hidden>
              <path fill="currentColor" fillRule="evenodd" d="M11.5 3a4.5 4.5 0 0 1 4.492 4.77H16l-.001 1.227a4 4 0 0 1 3.996 3.799l.005.2a4 4 0 0 1-3.8 3.992l-.2.005h-.001L16 17h-5.001v-3.923h2.464L10 9.003l-3.454 4.075H9L8.999 17H4a4.01 4.01 0 0 1-4-4.005a4 4 0 0 1 3.198-3.918a3 3 0 0 1 4.313-3.664A4.5 4.5 0 0 1 11.5 3"></path>
            </svg>
            <span className={styles.sidebarSpanStrong}>{`Tải lên ${files.length > 0 ? files.length+' file' : ''}`}</span>
          </div>
        )}
      </button>
    </div>
  );
}